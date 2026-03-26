<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
	import { scheduledMissionsStore, gameTime, gameTimeToDate, claimedComplexes, type ScheduledMissionMapData } from '$lib/stores/gameStore';

	let { onSiteClick = (_name: string) => {} }: { onSiteClick?: (name: string) => void } = $props();

	// ── Constants ─────────────────────────────────────────
	const EARTH_RADIUS = 1;           // unit sphere
	const EARTH_RADIUS_KM = 6371;     // km
	const ATMOSPHERE_SCALE = 1.015;   // thin glow shell

	// Colors
	const COL_ORBIT = 0xeab308;       // yellow
	const COL_LAUNCH_ARC = 0xf97316;  // orange
	const COL_DEORBIT = 0xef4444;     // red
	const COL_BOOSTER = 0x22c55e;     // green
	const COL_EVENT = 0x60a5fa;       // light blue
	const COL_DEPLOY = 0xa78bfa;      // violet
	const COL_TRANSFER = 0x38bdf8;    // cyan

	// Launch site coordinates (name → lat/lng)
	const LAUNCH_SITES: Record<string, [number, number]> = {
		'Kennedy Space Center (LC-39A)':      [28.5731, -80.6490],
		'Cape Canaveral SFS (SLC-40)':        [28.5622, -80.5771],
		'Baikonur Cosmodrome':                [45.9646,  63.3052],
		'Vandenberg SFB (SLC-4E)':            [34.7420, -120.5724],
		'Xichang Satellite Launch Center':    [28.2468, 102.0268],
		'Wenchang Space Launch Site':         [19.6145, 110.9510],
		'Jiuquan Satellite Launch Center':    [40.9606, 100.2910],
		'Satish Dhawan Space Centre':         [13.7199,  80.2304],
		'Guiana Space Centre':                [ 5.2322, -52.7693],
		'Starbase Boca Chica':                [25.9972, -97.1571],
	};

	// Name → complex ID for ownership checks
	const SITE_NAME_TO_ID: Record<string, string> = {
		'Kennedy Space Center (LC-39A)':      'ksc-39a',
		'Cape Canaveral SFS (SLC-40)':        'ccafs-40',
		'Baikonur Cosmodrome':                'baikonur',
		'Vandenberg SFB (SLC-4E)':            'vandenberg',
		'Xichang Satellite Launch Center':    'xichang',
		'Wenchang Space Launch Site':         'wenchang',
		'Jiuquan Satellite Launch Center':    'jiuquan',
		'Satish Dhawan Space Centre':         'sriharikota',
		'Guiana Space Centre':                'kourou',
		'Starbase Boca Chica':                'starbase',
	};

	// ── DOM & Three refs ──────────────────────────────────
	let container: HTMLDivElement;
	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let controls: OrbitControls;
	let earthMesh: THREE.Mesh;
	let frameId: number;

	// Mission visualization group (cleared/rebuilt on data change)
	let missionGroup: THREE.Group;
	// Launch site markers group
	let siteGroup: THREE.Group;

	// ── Light refs (updated reactively for day/night) ─────
	let sunLight: THREE.DirectionalLight;
	let ambientLight: THREE.AmbientLight;
	let fillLight: THREE.DirectionalLight;
	let backLight: THREE.DirectionalLight;
	let topLight: THREE.DirectionalLight;
	let bottomLight: THREE.DirectionalLight;

	// ── Visibility toggles ────────────────────────────────
	let showMissions = $state(true);
	let showDayNight = $state(false);
	let showLaunchSites = $state(true);
	let mounted = $state(false);

	// ── Camera presets ────────────────────────────────────
	type ViewPreset = 'free' | 'north' | 'south';
	let activePreset = $state<ViewPreset>('free');

	function flyTo(lat: number, _lng: number, distance: number) {
		if (!camera || !controls) return;
		const phi = (90 - lat) * (Math.PI / 180);
		const theta = (_lng + 180) * (Math.PI / 180);
		const target = new THREE.Vector3(
			-distance * Math.sin(phi) * Math.cos(theta),
			distance * Math.cos(phi),
			distance * Math.sin(phi) * Math.sin(theta)
		);

		const start = camera.position.clone();
		const startTarget = controls.target.clone();
		const endTarget = new THREE.Vector3(0, 0, 0);
		let t = 0;
		const dur = 60;

		function step() {
			t++;
			const p = easeInOutCubic(t / dur);
			camera.position.lerpVectors(start, target, p);
			controls.target.lerpVectors(startTarget, endTarget, p);
			controls.update();
			if (t < dur) requestAnimationFrame(step);
		}
		step();
	}

	function easeInOutCubic(x: number): number {
		return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
	}

	function setPreset(preset: ViewPreset) {
		activePreset = preset;
		switch (preset) {
			case 'north': flyTo(90, 0, 2.8); break;
			case 'south': flyTo(-90, 0, 2.8); break;
			case 'free':  flyTo(20, 0, 3.0); break;
		}
	}

	// ── Geo → 3D conversion ──────────────────────────────
	// Earth mesh is rotated Y = -PI/2 so prime meridian faces camera.
	// We apply the same offset so lat/lng map correctly.
	function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
		const phi = (90 - lat) * (Math.PI / 180);
		const theta = (lng + 90) * (Math.PI / 180);  // +90 compensates for mesh rotation
		return new THREE.Vector3(
			-r * Math.sin(phi) * Math.cos(theta),
			 r * Math.cos(phi),
			 r * Math.sin(phi) * Math.sin(theta)
		);
	}

	function altToRadius(altKm: number): number {
		return EARTH_RADIUS * (1 + altKm / EARTH_RADIUS_KM);
	}

	// ══════════════════════════════════════════════════════
	//  ORBIT SYSTEM — plane-normal based, per spec §1–§8
	// ══════════════════════════════════════════════════════

	// ── §2: Orbit plane normal from inclination + RAAN ───
	// Convention: RAAN (Ω) measured from the mesh +X axis.
	// Since mesh is rotated Y = -π/2, the +X axis in mesh-space
	// corresponds to 90°E longitude. We compensate by adding +90°
	// to the site longitude when computing Ω, same as latLngToVec3.
	function orbitNormal(incDeg: number, raanDeg: number): THREE.Vector3 {
		const i = incDeg * Math.PI / 180;
		const o = raanDeg * Math.PI / 180;
		return new THREE.Vector3(
			Math.sin(o) * Math.sin(i),
			Math.cos(i),
			-Math.cos(o) * Math.sin(i)
		).normalize();
	}

	// ── §3: Build orbit ring from plane normal ───────────
	function makeOrbitRing(
		altKm: number,
		incDeg: number,
		raanDeg: number,
		segments: number = 256,
	): THREE.BufferGeometry {
		const r = altToRadius(altKm);
		const nHat = orbitNormal(incDeg, raanDeg);

		// Build orthonormal basis {u, v} in the orbit plane
		const worldUp = new THREE.Vector3(0, 1, 0);
		const helper = Math.abs(nHat.dot(worldUp)) < 0.95
			? worldUp
			: new THREE.Vector3(1, 0, 0);
		const uBasis = new THREE.Vector3().crossVectors(helper, nHat).normalize();
		const vBasis = new THREE.Vector3().crossVectors(nHat, uBasis).normalize();

		const positions = new Float32Array((segments + 1) * 3);
		for (let idx = 0; idx <= segments; idx++) {
			const t = (idx / segments) * Math.PI * 2;
			const x = r * (Math.cos(t) * uBasis.x + Math.sin(t) * vBasis.x);
			const y = r * (Math.cos(t) * uBasis.y + Math.sin(t) * vBasis.y);
			const z = r * (Math.cos(t) * uBasis.z + Math.sin(t) * vBasis.z);
			positions[idx * 3]     = x;
			positions[idx * 3 + 1] = y;
			positions[idx * 3 + 2] = z;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return geo;
	}

	// ── §4: Prograde tangent at any point on the orbit ───
	function progradeAt(rHat: THREE.Vector3, nHat: THREE.Vector3): THREE.Vector3 {
		return new THREE.Vector3().crossVectors(nHat, rHat).normalize();
	}

	// ── Compute RAAN to align orbit with launch site ─────
	// In our coordinate system (traced from latLngToVec3 + orbitNormal):
	//   peak longitude = -raanDeg
	//   ascending node longitude = -raanDeg - 90°
	//
	// For inc ≤ |lat|: place orbit peak at site longitude
	//   → raanDeg = -siteLng
	// For inc > |lat|: place ascending slope over site
	//   Orbit crosses siteLat at argument u = arcsin(sin(lat)/sin(inc))
	//   Longitude offset from ascending node: Δlng = atan2(sin(u)*cos(i), cos(u))
	//   → ascending node at siteLng - Δlng
	//   → raanDeg = -(siteLng - Δlng) - 90
	// Both cases unify: when inc=lat, u=90°, Δlng=90°, raanDeg = -siteLng. ✓
	function computeRaan(siteLat: number, siteLng: number, incDeg: number): number {
		const inc = Math.max(0.1, incDeg) * Math.PI / 180;
		const lat = Math.abs(siteLat) * Math.PI / 180;
		const sinRatio = Math.min(1, Math.sin(lat) / Math.sin(inc));
		const uCross = Math.asin(sinRatio);
		const dLng = Math.atan2(Math.sin(uCross) * Math.cos(inc), Math.cos(uCross)) * 180 / Math.PI;
		return -siteLng + dLng - 90;
	}

	// ── Find orbit insertion point at 90° east of launch site ─
	// Scans the orbit ring for the point whose geographic longitude
	// is closest to siteLng + 90°, on the same hemisphere as the site.
	function computeAnchor(
		siteLat: number, siteLng: number,
		incDeg: number, raanDeg: number, rOrbit: number,
	): { anchorPos: THREE.Vector3; anchorTangent: THREE.Vector3 } {
		const nHat = orbitNormal(incDeg, raanDeg);

		// Build same ring basis as makeOrbitRing
		const worldUp = new THREE.Vector3(0, 1, 0);
		const helper = Math.abs(nHat.dot(worldUp)) < 0.95 ? worldUp : new THREE.Vector3(1, 0, 0);
		const uBasis = new THREE.Vector3().crossVectors(helper, nHat).normalize();
		const vBasis = new THREE.Vector3().crossVectors(nHat, uBasis).normalize();

		// Target longitude: 90° east of site
		const targetRef = latLngToVec3(0, siteLng + 90, 1);
		const targetXZ = new THREE.Vector2(targetRef.x, targetRef.z).normalize();
		const wantNorth = siteLat >= 0;

		// Scan orbit ring for the point at the target longitude on the correct hemisphere
		let bestT = 0, bestDist = Infinity;
		const bestPt = new THREE.Vector3();
		for (let deg = 0; deg < 360; deg += 0.5) {
			const t = deg * Math.PI / 180;
			const pt = new THREE.Vector3(
				Math.cos(t) * uBasis.x + Math.sin(t) * vBasis.x,
				Math.cos(t) * uBasis.y + Math.sin(t) * vBasis.y,
				Math.cos(t) * uBasis.z + Math.sin(t) * vBasis.z,
			);
			const ptXZ = new THREE.Vector2(pt.x, pt.z);
			if (ptXZ.length() < 0.01) continue;
			ptXZ.normalize();
			const dist = ptXZ.distanceTo(targetXZ);
			// Prefer same hemisphere as launch site
			const sameHemi = wantNorth ? pt.y >= -0.01 : pt.y <= 0.01;
			if (dist < bestDist && sameHemi) {
				bestDist = dist;
				bestT = t;
				bestPt.copy(pt);
			}
		}

		const anchorHat = bestPt.normalize();
		const tangent = progradeAt(anchorHat, nHat);

		return {
			anchorPos: anchorHat.clone().multiplyScalar(rOrbit),
			anchorTangent: tangent,
		};
	}

	// ── Cubic Bezier ascent arc ──────────────────────
	function makeAscentArc(
		siteLat: number, siteLng: number,
		targetAltKm: number, incDeg: number, raanDeg: number,
		segments: number = 80,
	): { geo: THREE.BufferGeometry; insertPos: THREE.Vector3 } {
		const rOrbit = altToRadius(targetAltKm);
		const rSurface = EARTH_RADIUS * 1.001;

		const sHat = latLngToVec3(siteLat, siteLng, 1).normalize();
		const P0 = sHat.clone().multiplyScalar(rSurface);
		const { anchorPos: P3, anchorTangent: joinTangent } = computeAnchor(siteLat, siteLng, incDeg, raanDeg, rOrbit);

		// Local launch frame
		const worldUp = new THREE.Vector3(0, 1, 0);
		const up0 = sHat.clone();
		const east0 = new THREE.Vector3().crossVectors(worldUp, sHat).normalize();
		const north0 = new THREE.Vector3().crossVectors(sHat, east0).normalize();

		// Launch azimuth: sin(az) = cos(inc)/cos(lat)
		const incRad = Math.max(Math.abs(siteLat), incDeg) * Math.PI / 180;
		const latRad = Math.abs(siteLat) * Math.PI / 180;
		const cosRatio = Math.min(1, Math.cos(incRad) / Math.max(0.01, Math.cos(latRad)));
		const azFromNorth = Math.asin(cosRatio);
		const heading = north0.clone().multiplyScalar(Math.cos(azFromNorth))
			.addScaledVector(east0, Math.sin(azFromNorth)).normalize();

		// Launch tangent: 60% up + 40% along azimuth heading
		const launchTangent = up0.clone().multiplyScalar(0.6)
			.addScaledVector(heading, 0.4).normalize();

		const distScale = P3.clone().sub(P0).length();
		const c1 = 0.3;
		const c2 = 0.4;

		const P1 = P0.clone().addScaledVector(launchTangent, distScale * c1);
		const P2 = P3.clone().addScaledVector(joinTangent, -distScale * c2);

		// §8: Sample cubic Bezier with monotonic altitude enforcement
		const positions = new Float32Array((segments + 1) * 3);
		let prevR = rSurface;
		for (let idx = 0; idx <= segments; idx++) {
			const t = idx / segments;
			const mt = 1 - t;
			// B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
			const x = mt*mt*mt*P0.x + 3*mt*mt*t*P1.x + 3*mt*t*t*P2.x + t*t*t*P3.x;
			const y = mt*mt*mt*P0.y + 3*mt*mt*t*P1.y + 3*mt*t*t*P2.y + t*t*t*P3.y;
			const z = mt*mt*mt*P0.z + 3*mt*mt*t*P1.z + 3*mt*t*t*P2.z + t*t*t*P3.z;
			// Enforce minimum radius (§8)
			let r = Math.sqrt(x*x + y*y + z*z);
			if (r < prevR) r = prevR;
			prevR = r;
			const scale = r / Math.sqrt(x*x + y*y + z*z);
			positions[idx * 3]     = x * scale;
			positions[idx * 3 + 1] = y * scale;
			positions[idx * 3 + 2] = z * scale;
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return { geo, insertPos: P3 };
	}

	// ── Curved arc between two 3D points ─────────────────
	function makeArc(
		from: THREE.Vector3,
		to: THREE.Vector3,
		peakRadius: number,
		segments: number = 64,
	): THREE.BufferGeometry {
		const positions = new Float32Array((segments + 1) * 3);
		for (let i = 0; i <= segments; i++) {
			const t = i / segments;
			// Slerp on the unit sphere direction
			const dir = new THREE.Vector3().lerpVectors(from.clone().normalize(), to.clone().normalize(), t).normalize();
			// Radius interpolation: parabolic peak in the middle
			const rFrom = from.length();
			const rTo = to.length();
			const rBase = rFrom + (rTo - rFrom) * t;
			const lift = 4 * t * (1 - t) * (peakRadius - (rFrom + rTo) / 2);
			const r = rBase + lift;
			const p = dir.multiplyScalar(r);
			positions[i * 3]     = p.x;
			positions[i * 3 + 1] = p.y;
			positions[i * 3 + 2] = p.z;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		return geo;
	}

	// ── Dashed line material helper ──────────────────────
	function dashedLineMat(color: number, opacity: number = 0.8): THREE.LineDashedMaterial {
		return new THREE.LineDashedMaterial({
			color,
			dashSize: 0.03,
			gapSize: 0.015,
			opacity,
			transparent: true,
		});
	}

	function solidLineMat(color: number, opacity: number = 0.7): THREE.LineBasicMaterial {
		return new THREE.LineBasicMaterial({ color, opacity, transparent: true });
	}

	// ── Event dot (small sphere) ─────────────────────────
	const dotGeo = new THREE.SphereGeometry(0.012, 8, 6);
	const siteDotGeo = new THREE.SphereGeometry(0.009, 10, 8);
	const siteRingGeo = new THREE.RingGeometry(0.011, 0.015, 16);

	function makeEventDot(position: THREE.Vector3, color: number): THREE.Mesh {
		const mat = new THREE.MeshBasicMaterial({ color });
		const mesh = new THREE.Mesh(dotGeo, mat);
		mesh.position.copy(position);
		return mesh;
	}

	// ── Build launch site markers ────────────────────────
	function buildSiteMarkers(group: THREE.Group, claimed: Set<string>) {
		// Clear previous
		while (group.children.length > 0) {
			const child = group.children[0];
			group.remove(child);
			if (child instanceof THREE.Mesh && child.geometry !== siteDotGeo && child.geometry !== siteRingGeo) {
				child.geometry.dispose();
			}
		}

		for (const [name, [lat, lng]] of Object.entries(LAUNCH_SITES)) {
			const pos = latLngToVec3(lat, lng, EARTH_RADIUS * 1.002);
			const siteId = SITE_NAME_TO_ID[name];
			const owned = siteId ? claimed.has(siteId) : false;
			const col = owned ? 0x22c55e : 0xf97316; // green if claimed, orange otherwise
			// Dot
			const dotMat = new THREE.MeshBasicMaterial({ color: col });
			const dot = new THREE.Mesh(siteDotGeo, dotMat);
			dot.position.copy(pos);
			dot.lookAt(pos.clone().multiplyScalar(2));
			dot.userData = { siteName: name };
			group.add(dot);
			// Halo ring
			const ringMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, opacity: 0.4, transparent: true });
			const ring = new THREE.Mesh(siteRingGeo, ringMat);
			ring.position.copy(pos);
			ring.lookAt(pos.clone().multiplyScalar(2));
			ring.userData = { siteName: name };
			group.add(ring);
		}
	}

	// ── Reactive: show/hide + rebuild launch site markers ──
	$effect(() => {
		if (!mounted) return;
		const show = showLaunchSites;
		const claimed = $claimedComplexes;
		if (show) buildSiteMarkers(siteGroup, claimed);
		siteGroup.visible = show;
	});

	// Map short mission site names → LAUNCH_SITES keys
	const SITE_NAME_ALIASES: Record<string, string> = {
		'Kennedy Space Center':     'Kennedy Space Center (LC-39A)',
		'Cape Canaveral SFS':       'Cape Canaveral SFS (SLC-40)',
		'Vandenberg SFB':           'Vandenberg SFB (SLC-4E)',
		'Boca Chica Starbase':      'Starbase Boca Chica',
		'Kourou (CSG)':             'Guiana Space Centre',
		'Baikonur':                 'Baikonur Cosmodrome',
		'Wenchang':                 'Wenchang Space Launch Site',
		'Satish Dhawan':            'Satish Dhawan Space Centre',
		'Tanegashima':              'Xichang Satellite Launch Center',
		'Wallops Island':           'Jiuquan Satellite Launch Center',
	};

	function resolveSite(name: string): [number, number] | null {
		return LAUNCH_SITES[name] ?? LAUNCH_SITES[SITE_NAME_ALIASES[name] ?? ''] ?? null;
	}

	// ── Build mission visuals for one mission ────────────
	function buildMissionVisuals(m: ScheduledMissionMapData, group: THREE.Group) {
		const siteLoc = resolveSite(m.site);
		const siteLat = siteLoc ? siteLoc[0] : 0;
		const siteLng = siteLoc ? siteLoc[1] : 0;
		// Compute RAAN so orbit aligns with the launch site
		const raanDeg = computeRaan(siteLat, siteLng, m.inclination);

		// Always draw the target orbit ring
		const ringGeo = makeOrbitRing(m.altitude, m.inclination, raanDeg);
		const ringLine = new THREE.Line(ringGeo, dashedLineMat(COL_ORBIT));
		ringLine.computeLineDistances();
		group.add(ringLine);

		// Skip activity visuals if we can't resolve the launch site
		if (!siteLoc) return;

		// Track state as we walk through activities
		const sitePos = latLngToVec3(siteLat, siteLng, EARTH_RADIUS * 1.001);
		let currentAlt = m.altitude;
		let currentInc = m.inclination;
		let orbitIndex = 0;

		for (const act of m.activities) {
			switch (act.type) {
				case 'launch-to-orbit': {
					const { geo: ascentGeo, insertPos } = makeAscentArc(siteLat, siteLng, currentAlt, currentInc, raanDeg);
					const ascentLine = new THREE.Line(ascentGeo, dashedLineMat(COL_ORBIT, 0.9));
					ascentLine.computeLineDistances();
					group.add(ascentLine);
					// Dots at launch site and orbit insertion
					group.add(makeEventDot(sitePos, COL_ORBIT));
					group.add(makeEventDot(insertPos, COL_ORBIT));
					break;
				}

				case 'circularize': {
					// Ring already drawn above; just bump index
					orbitIndex++;
					break;
				}

				case 'change-orbit': {
					const prevAlt = currentAlt;
					const newAlt = act.targetAlt ?? currentAlt;
					// Transfer arc: pick two points 90° apart on the orbit
					const theta1 = (orbitIndex * 47) * Math.PI / 180; // slightly different angle per orbit
					const r1 = altToRadius(prevAlt);
					const r2 = altToRadius(newAlt);
					// Use a point on the current orbit and a point on the new orbit
					const from = latLngToVec3(currentInc * 0.5, raanDeg + 30, r1);
					const to = latLngToVec3(currentInc * 0.5, raanDeg + 120, r2);
					const peakR = Math.max(r1, r2) * 1.02;
					const transferGeo = makeArc(from, to, peakR, 48);
					const transferLine = new THREE.Line(transferGeo, dashedLineMat(COL_TRANSFER, 0.7));
					transferLine.computeLineDistances();
					group.add(transferLine);
					// Event dot at maneuver
					group.add(makeEventDot(from, COL_EVENT));
					// Draw new orbit ring
					currentAlt = newAlt;
					const newRingGeo = makeOrbitRing(currentAlt, currentInc, raanDeg);
					const newRingLine = new THREE.Line(newRingGeo, dashedLineMat(COL_ORBIT, 0.6));
					newRingLine.computeLineDistances();
					group.add(newRingLine);
					orbitIndex++;
					break;
				}

				case 'plane-change': {
					const prevInc = currentInc;
					const newInc = act.targetInc ?? currentInc;
					const r = altToRadius(currentAlt);
					// Dot at maneuver point
					const maneuverPt = latLngToVec3(prevInc * 0.3, raanDeg + 60, r);
					group.add(makeEventDot(maneuverPt, COL_EVENT));
					// Draw new orbit ring with new inclination
					currentInc = newInc;
					const incRingGeo = makeOrbitRing(currentAlt, currentInc, raanDeg);
					const incRingLine = new THREE.Line(incRingGeo, dashedLineMat(COL_ORBIT, 0.6));
					incRingLine.computeLineDistances();
					group.add(incRingLine);
					break;
				}

				case 'deploy-payload': {
					// Dot on orbit at a spread-out angle
					const r = altToRadius(currentAlt);
					const angle = 45 + orbitIndex * 30; // spread deployments around the ring
					const deployPt = latLngToVec3(
						currentInc * 0.4 * Math.sin(angle * Math.PI / 180),
						raanDeg + angle,
						r
					);
					group.add(makeEventDot(deployPt, COL_DEPLOY));
					orbitIndex++;
					break;
				}

				case 'deorbit': {
					// Fading arc from orbit down to surface
					const r = altToRadius(currentAlt);
					const deorbitStart = latLngToVec3(
						currentInc * 0.3,
						raanDeg + 180,
						r
					);
					const landingPt = latLngToVec3(
						currentInc * 0.2,
						raanDeg + 220,
						EARTH_RADIUS * 1.001
					);
					const peakR = r * 0.85;
					const deorbitGeo = makeArc(deorbitStart, landingPt, peakR, 48);

					// Create fading material (lower opacity)
					const deorbitMat = new THREE.LineDashedMaterial({
						color: COL_DEORBIT,
						dashSize: 0.025,
						gapSize: 0.02,
						opacity: 0.4,
						transparent: true,
					});
					const deorbitLine = new THREE.Line(deorbitGeo, deorbitMat);
					deorbitLine.computeLineDistances();
					group.add(deorbitLine);
					// Dot at deorbit burn
					group.add(makeEventDot(deorbitStart, COL_DEORBIT));
					break;
				}

				default:
					// station-keep, rendezvous, dock etc — no extra visuals for now
					break;
			}
		}

		// ── Booster return arc (for reusable modes) ──────
		if (m.reuseMode === 'booster-reuse' || m.reuseMode === 'full-reuse') {
			const boostSepAlt = 80; // km roughly where stage sep happens
			const sepR = altToRadius(boostSepAlt);
			const sepPt = latLngToVec3(siteLat + 2, siteLng + 5, sepR);
			const landPt = latLngToVec3(siteLat - 0.5, siteLng + 1, EARTH_RADIUS * 1.001);
			const boosterArcGeo = makeArc(sepPt, landPt, sepR * 0.8, 48);
			const boosterMat = solidLineMat(COL_BOOSTER, 0.7);
			const boosterLine = new THREE.Line(boosterArcGeo, boosterMat);
			group.add(boosterLine);
			// Landing dot
			group.add(makeEventDot(landPt, COL_BOOSTER));
		}
	}

	// ── Rebuild all mission visuals ──────────────────────
	function rebuildMissions(missions: ScheduledMissionMapData[]) {
		if (!scene || !missionGroup) return;
		// Clear previous
		while (missionGroup.children.length > 0) {
			const child = missionGroup.children[0];
			missionGroup.remove(child);
			if (child instanceof THREE.Line) {
				child.geometry.dispose();
				if (child.material instanceof THREE.Material) child.material.dispose();
			}
			if (child instanceof THREE.Mesh && child.geometry !== dotGeo) {
				child.geometry.dispose();
			}
		}

		if (!showMissions) return;

		for (const m of missions) {
			buildMissionVisuals(m, missionGroup);
		}
	}

	// ── Reactive: rebuild when store changes ─────────────
	$effect(() => {
		if (!mounted) return;
		const missions = $scheduledMissionsStore;
		const visible = showMissions;
		rebuildMissions(visible ? missions : []);
	});

	// ── Subsolar point from game time ────────────────────
	// Returns [lat, lng] of the point on Earth directly under the Sun.
	function subsolarPoint(date: Date): [number, number] {
		const utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
		// Subsolar longitude: sun is at 0° lng at 12:00 UTC
		const lng = (12 - utcH) * 15; // degrees, range roughly -180..180
		// Subsolar latitude (solar declination)
		const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000) + 1;
		const lat = 23.44 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
		return [lat, lng];
	}

	// ── Reactive: update sun position for day/night ──────
	$effect(() => {
		if (!mounted) return; // wait for onMount to assign light refs
		const dayNight = showDayNight;
		const hours = $gameTime;

		if (dayNight) {
			const date = gameTimeToDate(hours);
			const [sunLat, sunLng] = subsolarPoint(date);
			const sunDir = latLngToVec3(sunLat, sunLng, 10);
			sunLight.position.copy(sunDir);
			sunLight.intensity = 2.5;
			ambientLight.intensity = 0.12;
			fillLight.intensity = 0.08;
			backLight.intensity = 0;
			topLight.intensity = 0;
			bottomLight.intensity = 0;
		} else {
			// Directional lights from all sides for uniform, textured illumination
			sunLight.position.set(5, 3, 5);
			sunLight.intensity = 2.0;
			ambientLight.intensity = 0.4;
			fillLight.intensity = 2.0;
			backLight.intensity = 2.0;
			topLight.intensity = 1.5;
			bottomLight.intensity = 1.5;
		}
	});

	// ── Main setup ────────────────────────────────────────
	onMount(() => {
		const w = container.clientWidth;
		const h = container.clientHeight;

		// Renderer
		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(w, h);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.1;
		container.appendChild(renderer.domElement);

		// Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color('#070b14');

		// Mission group
		missionGroup = new THREE.Group();
		scene.add(missionGroup);

		// Launch site markers group
		siteGroup = new THREE.Group();
		scene.add(siteGroup);
		buildSiteMarkers(siteGroup, $claimedComplexes);

		// Camera
		camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
		camera.position.set(0, 0.8, 3.0);

		// Controls
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.08;
		controls.rotateSpeed = 0.5;
		controls.zoomSpeed = 0.8;
		controls.minDistance = 1.15;  // just above surface
		controls.maxDistance = 50;    // far enough to see GEO shell
		controls.enablePan = false;  // keep Earth centered

		// ── Lighting ──────────────────────────────────────
		sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
		sunLight.position.set(5, 3, 5);
		scene.add(sunLight);

		ambientLight = new THREE.AmbientLight(0x334466, 0.6);
		scene.add(ambientLight);

		fillLight = new THREE.DirectionalLight(0xffffff, 0);
		fillLight.position.set(-5, -3, -5);
		scene.add(fillLight);

		backLight = new THREE.DirectionalLight(0xffffff, 0);
		backLight.position.set(-5, 3, 5);
		scene.add(backLight);

		topLight = new THREE.DirectionalLight(0xffffff, 0);
		topLight.position.set(0, 6, 0);
		scene.add(topLight);

		bottomLight = new THREE.DirectionalLight(0xffffff, 0);
		bottomLight.position.set(0, -6, 0);
		scene.add(bottomLight);

		// ── Earth sphere ──────────────────────────────────
		const textureLoader = new THREE.TextureLoader();
		const earthTexture = textureLoader.load('/maps/earth_2k.jpg');
		earthTexture.colorSpace = THREE.SRGBColorSpace;
		earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

		const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 96, 64);
		const earthMaterial = new THREE.MeshStandardMaterial({
			map: earthTexture,
			roughness: 0.85,
			metalness: 0.05,
		});
		earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
		earthMesh.rotation.y = -Math.PI / 2;
		scene.add(earthMesh);

		// ── Atmosphere glow ───────────────────────────────
		const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * ATMOSPHERE_SCALE, 64, 48);
		const atmosphereMaterial = new THREE.ShaderMaterial({
			vertexShader: `
				varying vec3 vNormal;
				varying vec3 vPosition;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				varying vec3 vNormal;
				varying vec3 vPosition;
				void main() {
					float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
					gl_FragColor = vec4(0.3, 0.6, 1.0, intensity * 0.4);
				}
			`,
			blending: THREE.AdditiveBlending,
			side: THREE.BackSide,
			transparent: true,
			depthWrite: false,
		});
		const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
		scene.add(atmosphere);

		// ── Starfield ─────────────────────────────────────
		const starCount = 4000;
		const starPositions = new Float32Array(starCount * 3);
		for (let i = 0; i < starCount; i++) {
			const r = 80 + Math.random() * 120;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
			starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
			starPositions[i * 3 + 2] = r * Math.cos(phi);
		}
		const starGeometry = new THREE.BufferGeometry();
		starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
		const starMaterial = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.15,
			sizeAttenuation: true,
		});
		scene.add(new THREE.Points(starGeometry, starMaterial));

		// ── Initial mission draw ──────────────────────────
		rebuildMissions($scheduledMissionsStore);

		// Signal reactive effects that Three.js refs are ready
		mounted = true;

		// ── Resize handler ────────────────────────────────
		const observer = new ResizeObserver(entries => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width === 0 || height === 0) continue;
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
				renderer.setSize(width, height);
			}
		});
		observer.observe(container);

		// ── Raycaster for click interaction ──────────────
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		function onCanvasClick(event: MouseEvent) {
			if (!siteGroup.visible) return;
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const hits = raycaster.intersectObjects(siteGroup.children, false);
			if (hits.length > 0) {
				const siteName = hits[0].object.userData?.siteName;
				if (siteName) onSiteClick(siteName);
			}
		}
		renderer.domElement.addEventListener('click', onCanvasClick);

		// ── Render loop ───────────────────────────────────
		// At distances > LOCK_DIST, markers scale normally with the globe.
		// At distances < LOCK_DIST, markers shrink to maintain constant apparent
		// (screen) size — they stop getting bigger as you zoom in further.
		const LOCK_DIST = 2.8;

		function animate() {
			frameId = requestAnimationFrame(animate);
			controls.update();

			// Per-marker scale to lock apparent size when zoomed in
			if (siteGroup.visible) {
				const dist = camera.position.length();
				if (dist < LOCK_DIST) {
					const s = dist / LOCK_DIST; // <1 when closer, exactly 1 at threshold
					for (const child of siteGroup.children) {
						child.scale.setScalar(s);
					}
				} else {
					for (const child of siteGroup.children) {
						child.scale.setScalar(1);
					}
				}
			}

			renderer.render(scene, camera);
		}
		animate();

		// ── Cleanup ───────────────────────────────────────
		return () => {
			cancelAnimationFrame(frameId);
			observer.disconnect();
			renderer.domElement.removeEventListener('click', onCanvasClick);
			controls.dispose();
			renderer.dispose();
			earthGeometry.dispose();
			earthMaterial.dispose();
			earthTexture.dispose();
			atmosphereGeometry.dispose();
			atmosphereMaterial.dispose();
			starGeometry.dispose();
			starMaterial.dispose();
			container?.removeChild(renderer.domElement);
		};
	});
</script>

<div class="globe-wrapper">
	<div class="globe-canvas" bind:this={container}></div>
	<div class="globe-controls">
		<button class="preset-btn" class:active={activePreset === 'free'} onclick={() => setPreset('free')}>🌐 Free</button>
		<button class="preset-btn" class:active={activePreset === 'north'} onclick={() => setPreset('north')}>⬆️ North Pole</button>
		<button class="preset-btn" class:active={activePreset === 'south'} onclick={() => setPreset('south')}>⬇️ South Pole</button>
		<span class="controls-spacer"></span>
		<label class="globe-toggle">
			<input type="checkbox" bind:checked={showDayNight} />
			<span>Day / Night</span>
		</label>
		<label class="globe-toggle">
			<input type="checkbox" bind:checked={showLaunchSites} />
			<span>Launch Sites</span>
		</label>
		<label class="globe-toggle">
			<input type="checkbox" bind:checked={showMissions} />
			<span>Planned Missions</span>
		</label>
	</div>
	{#if showMissions}
	<div class="globe-legend">
		<span class="legend-item"><span class="legend-swatch" style="background: #f97316;"></span> Launch</span>
		<span class="legend-item"><span class="legend-swatch" style="background: #eab308;"></span> Orbit</span>
		<span class="legend-item"><span class="legend-swatch" style="background: #38bdf8;"></span> Transfer</span>
		<span class="legend-item"><span class="legend-swatch" style="background: #a78bfa;"></span> Deploy</span>
		<span class="legend-item"><span class="legend-swatch" style="background: #ef4444;"></span> Deorbit</span>
		<span class="legend-item"><span class="legend-swatch" style="background: #22c55e;"></span> Booster Return</span>
	</div>
	{/if}
</div>

<style>
	.globe-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.globe-canvas {
		flex: 1;
		min-height: 400px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		overflow: hidden;
		background: #070b14;
		cursor: grab;
	}
	.globe-canvas:active {
		cursor: grabbing;
	}
	.globe-controls {
		display: flex;
		gap: 0.3rem;
		margin-top: 0.5rem;
	}
	.preset-btn {
		padding: 0.3rem 0.65rem;
		font-size: 0.65rem;
		font-weight: 600;
		border-radius: 0.3rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-dim);
		cursor: pointer;
		transition: all 0.15s;
	}
	.preset-btn:hover {
		border-color: var(--color-text-dim);
		color: var(--color-text);
	}
	.preset-btn.active {
		background: rgba(99, 102, 241, 0.12);
		border-color: rgba(99, 102, 241, 0.3);
		color: var(--color-text);
	}
	.controls-spacer {
		flex: 1;
	}
	.globe-toggle {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.65rem;
		color: var(--color-text-dim);
		cursor: pointer;
	}
	.globe-toggle input {
		accent-color: #eab308;
		cursor: pointer;
	}
	.globe-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 0.35rem;
		font-size: 0.6rem;
		color: var(--color-text-dim);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.legend-swatch {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
</style>
