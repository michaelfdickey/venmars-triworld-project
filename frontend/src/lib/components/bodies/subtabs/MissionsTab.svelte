<script lang="ts">
	import { claimedComplexes, launchComplexCosts, rocketDefs, rocketInventory, payloadInventory, marketSatellites, venMarsPayloads, customPayloads } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	// ── Types ─────────────────────────────────────────────
	interface LaunchSite {
		name: string;
		body: string;
		lat: string;
	}

	interface RocketOption {
		name: string;
		payloadLEO: number;
		fairingVolume_m3: number;
		costPerLaunch: number;
	}

	interface PayloadOption {
		name: string;
		mass: number;
		volume_m3: number;
		cost: number;
	}

	interface FuelOption {
		name: string;
		density_kg_m3: number;
		cost_per_m3: number;
	}

	interface OrbitType {
		id: string;
		name: string;
		description: string;
		defaultAlt: number;      // km
		defaultInc: number;      // degrees
		altRange: [number, number];
		incRange: [number, number];
		circular: boolean;       // if true, ap = pe = alt
	}

	interface Destination {
		body: string;
		bodyLabel: string;
		icon: string;
		orbits: OrbitType[];
		enabled: boolean;
	}

	type ActivityType = 'launch-to-orbit' | 'circularize' | 'deploy-payload' | 'rendezvous' | 'dock' | 'land' | 'deorbit' | 'plane-change' | 'hohmann-transfer' | 'aerobrake' | 'station-keep';

	interface ActivityDef {
		id: ActivityType;
		name: string;
		icon: string;
		description: string;
		enabled: boolean;
	}

	interface MissionActivity {
		type: ActivityType;
		notes: string;
	}

	type DeployMethod = 'spin-stabilized' | 'propulsive' | 'docking' | 'electromagnetic';

	interface DeployMethodDef {
		id: DeployMethod;
		name: string;
		icon: string;
		description: string;
		deltaVOverhead: number; // extra m/s added per payload
	}

	type LaunchWindow = 'exact' | 'next-optimal' | 'asap';

	interface SavedMission {
		name: string;
		site: string;
		rocket: string;
		payloads: string[];
		fuel: string;
		body: string;
		orbitId: string;
		altitude: number;
		inclination: number;
		apoapsis: number;
		periapsis: number;
		mode: 'one-off' | 'repeating';
		date: string;
		repeatDays: number;
		activities: MissionActivity[];
		launchWindow: LaunchWindow;
		deployMethod: DeployMethod;
	}

	const FUEL_PACKING_EFFICIENCY = 0.80;

	// ── Launch Sites ──────────────────────────────────────
	const complexIdToSiteName: Record<string, string> = {
		'ksc-39a': 'Kennedy Space Center',
		'ccafs-40': 'Cape Canaveral SFS',
		'vandenberg': 'Vandenberg SFB',
		'starbase': 'Boca Chica Starbase',
		'kourou': 'Kourou (CSG)',
		'baikonur': 'Baikonur',
		'wenchang': 'Wenchang',
		'sriharikota': 'Satish Dhawan',
		'xichang': 'Tanegashima',
		'jiuquan': 'Wallops Island',
	};

	let ownedSiteNames = $derived(
		new Set([...$claimedComplexes].map(id => complexIdToSiteName[id]).filter(Boolean))
	);

	const launchSites: LaunchSite[] = [
		{ name: 'Kennedy Space Center', body: 'earth', lat: '28.5°N' },
		{ name: 'Cape Canaveral SFS', body: 'earth', lat: '28.5°N' },
		{ name: 'Vandenberg SFB', body: 'earth', lat: '34.7°N' },
		{ name: 'Boca Chica Starbase', body: 'earth', lat: '26.0°N' },
		{ name: 'Kourou (CSG)', body: 'earth', lat: '5.2°N' },
		{ name: 'Tanegashima', body: 'earth', lat: '30.4°N' },
		{ name: 'Baikonur', body: 'earth', lat: '45.6°N' },
		{ name: 'Wenchang', body: 'earth', lat: '19.6°N' },
		{ name: 'Satish Dhawan', body: 'earth', lat: '13.7°N' },
		{ name: 'Wallops Island', body: 'earth', lat: '37.8°N' },
		{ name: 'Shackleton Crater Base', body: 'moon', lat: '89.9°S' },
		{ name: 'Aphrodite Terra Complex', body: 'venus', lat: '5.0°S' },
		{ name: 'Olympus Mons Pad', body: 'mars', lat: '18.6°N' },
		{ name: 'Jezero Operations Base', body: 'mars', lat: '18.4°N' },
	];

	// ── Launch Vehicles ───────────────────────────────────
	// Derive from rocketDefs so names always match inventory
	const rocketOptions: RocketOption[] = rocketDefs.map(rd => ({
		name: rd.name,
		payloadLEO: rd.payloadLEO,
		fairingVolume_m3: rd.fairingVolume_m3,
		costPerLaunch: rd.costPerLaunch,
	}));

	let ownedRocketCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const [id, count] of Object.entries($rocketInventory)) {
			if (count <= 0) continue;
			const rd = rocketDefs.find(r => r.id === id);
			if (rd) counts[rd.name] = (counts[rd.name] ?? 0) + count;
		}
		return counts;
	});

	// ── Payloads ──────────────────────────────────────────
	let payloadInvByName = $derived.by(() => {
		const counts: Record<string, number> = {};
		const allDefs = [...marketSatellites, ...venMarsPayloads, ...$customPayloads];
		for (const [id, count] of Object.entries($payloadInventory)) {
			if (count <= 0) continue;
			const def = allDefs.find(d => d.id === id);
			if (def) counts[def.name] = (counts[def.name] ?? 0) + count;
		}
		return counts;
	});

	const payloadOptions: PayloadOption[] = [...marketSatellites, ...venMarsPayloads].map(d => ({
		name: d.name,
		mass: d.mass,
		volume_m3: d.volume_m3,
		cost: d.cost,
	}));

	// ── Fuel ──────────────────────────────────────────────
	const fuelOptions: FuelOption[] = [
		{ name: 'LOX (Liquid Oxygen)', density_kg_m3: 1141, cost_per_m3: 0.2 },
		{ name: 'LH₂ (Liquid Hydrogen)', density_kg_m3: 71, cost_per_m3: 0.8 },
		{ name: 'LCH₄ (Liquid Methane)', density_kg_m3: 423, cost_per_m3: 0.5 },
		{ name: 'RP-1 (Rocket-Grade Kerosene)', density_kg_m3: 820, cost_per_m3: 0.3 },
		{ name: 'Hydrazine (N₂H₄)', density_kg_m3: 1021, cost_per_m3: 1.5 },
	];

	// ── Destinations ──────────────────────────────────────
	const destinations: Destination[] = [
		{
			body: 'earth', bodyLabel: 'Earth', icon: '🌍', enabled: true,
			orbits: [
				{ id: 'earth-leo', name: 'Low Earth Orbit (LEO)', description: '200–2,000 km', defaultAlt: 400, defaultInc: 28.5, altRange: [200, 2000], incRange: [0, 180], circular: true },
				{ id: 'earth-meo', name: 'Medium Earth Orbit (MEO)', description: '2,000–35,786 km', defaultAlt: 20200, defaultInc: 55, altRange: [2000, 35786], incRange: [0, 180], circular: true },
				{ id: 'earth-geo', name: 'Geostationary (GEO)', description: '35,786 km equatorial', defaultAlt: 35786, defaultInc: 0, altRange: [35786, 35786], incRange: [0, 0], circular: true },
				{ id: 'earth-gto', name: 'GTO (Transfer)', description: '200 × 35,786 km', defaultAlt: 35786, defaultInc: 28.5, altRange: [200, 35786], incRange: [0, 90], circular: false },
				{ id: 'earth-sso', name: 'Sun-Synchronous (SSO)', description: '600–800 km polar', defaultAlt: 700, defaultInc: 98, altRange: [400, 1000], incRange: [96, 100], circular: true },
				{ id: 'earth-heo', name: 'Highly Elliptical (HEO)', description: 'Molniya-type', defaultAlt: 39750, defaultInc: 63.4, altRange: [500, 40000], incRange: [0, 180], circular: false },
			],
		},
		{
			body: 'moon', bodyLabel: 'Moon', icon: '🌑', enabled: false,
			orbits: [
				{ id: 'moon-llo', name: 'Low Lunar Orbit', description: '100 km', defaultAlt: 100, defaultInc: 0, altRange: [50, 300], incRange: [0, 180], circular: true },
				{ id: 'moon-polar', name: 'Lunar Polar Orbit', description: '100 km polar', defaultAlt: 100, defaultInc: 90, altRange: [50, 300], incRange: [85, 95], circular: true },
				{ id: 'moon-nrho', name: 'NRHO (Gateway)', description: '1,500 × 70,000 km', defaultAlt: 70000, defaultInc: 90, altRange: [1500, 70000], incRange: [85, 95], circular: false },
				{ id: 'moon-surface', name: 'Lunar Surface', description: 'Landing', defaultAlt: 0, defaultInc: 0, altRange: [0, 0], incRange: [0, 180], circular: true },
			],
		},
		{
			body: 'venus', bodyLabel: 'Venus', icon: '🪐', enabled: false,
			orbits: [
				{ id: 'venus-lvo', name: 'Low Venus Orbit', description: '250–500 km', defaultAlt: 300, defaultInc: 0, altRange: [250, 500], incRange: [0, 180], circular: true },
				{ id: 'venus-survey', name: 'Venus Survey Orbit', description: '300 km polar (best mapping)', defaultAlt: 300, defaultInc: 90, altRange: [250, 500], incRange: [85, 95], circular: true },
				{ id: 'venus-atmo', name: 'Venus Atmosphere (50–55 km)', description: 'Cloud-layer ops', defaultAlt: 55, defaultInc: 0, altRange: [50, 60], incRange: [0, 180], circular: true },
				{ id: 'venus-geo', name: 'Venus Stationary Orbit', description: '~1.5M km (very slow rotation)', defaultAlt: 1540000, defaultInc: 0, altRange: [1540000, 1540000], incRange: [0, 5], circular: true },
			],
		},
		{
			body: 'mars', bodyLabel: 'Mars', icon: '🔴', enabled: false,
			orbits: [
				{ id: 'mars-lmo', name: 'Low Mars Orbit', description: '250–500 km', defaultAlt: 400, defaultInc: 0, altRange: [250, 500], incRange: [0, 180], circular: true },
				{ id: 'mars-equatorial', name: 'Mars Equatorial Orbit', description: '400 km equatorial', defaultAlt: 400, defaultInc: 0, altRange: [250, 2000], incRange: [0, 10], circular: true },
				{ id: 'mars-polar', name: 'Mars Polar Orbit', description: '400 km polar', defaultAlt: 400, defaultInc: 90, altRange: [250, 2000], incRange: [85, 95], circular: true },
				{ id: 'mars-areo', name: 'Mars Areosynchronous', description: '17,032 km equatorial', defaultAlt: 17032, defaultInc: 0, altRange: [17032, 17032], incRange: [0, 5], circular: true },
				{ id: 'mars-surface', name: 'Mars Surface', description: 'Landing', defaultAlt: 0, defaultInc: 0, altRange: [0, 0], incRange: [0, 180], circular: true },
			],
		},
		{
			body: 'lagrange', bodyLabel: 'Lagrange Points', icon: '⚖️', enabled: false,
			orbits: [
				{ id: 'eml1', name: 'Earth–Moon L1', description: '~58,000 km from Moon', defaultAlt: 58000, defaultInc: 0, altRange: [58000, 58000], incRange: [0, 0], circular: true },
				{ id: 'eml2', name: 'Earth–Moon L2', description: '~65,000 km from Moon', defaultAlt: 65000, defaultInc: 0, altRange: [65000, 65000], incRange: [0, 0], circular: true },
				{ id: 'esl1', name: 'Earth–Sun L1', description: '~1.5M km sunward', defaultAlt: 1500000, defaultInc: 0, altRange: [1500000, 1500000], incRange: [0, 0], circular: true },
				{ id: 'esl2', name: 'Earth–Sun L2', description: '~1.5M km anti-sunward', defaultAlt: 1500000, defaultInc: 0, altRange: [1500000, 1500000], incRange: [0, 0], circular: true },
			],
		},
	];

	// ── Activities ────────────────────────────────────────
	const activityDefs: ActivityDef[] = [
		{ id: 'launch-to-orbit', name: 'Launch to Orbit', icon: '🚀', description: 'Ascent from launch pad to target orbit (includes gravity & drag losses)', enabled: true },
		{ id: 'circularize', name: 'Circularize Orbit', icon: '⭕', description: 'Burn to match apoapsis and periapsis', enabled: true },
		{ id: 'deploy-payload', name: 'Deploy Payload', icon: '📦', description: 'Release payload into current orbit', enabled: true },
		{ id: 'rendezvous', name: 'Rendezvous', icon: '🎯', description: 'Match orbit with target vessel/station', enabled: false },
		{ id: 'dock', name: 'Dock', icon: '🔗', description: 'Dock with target after rendezvous', enabled: false },
		{ id: 'land', name: 'Land', icon: '🛬', description: 'Deorbit and land on surface', enabled: false },
		{ id: 'deorbit', name: 'Deorbit', icon: '🔥', description: 'Controlled reentry and disposal', enabled: true },
		{ id: 'plane-change', name: 'Plane Change', icon: '↗️', description: 'Change orbital inclination', enabled: true },
		{ id: 'hohmann-transfer', name: 'Hohmann Transfer', icon: '🔄', description: 'Transfer to higher/lower orbit', enabled: false },
		{ id: 'aerobrake', name: 'Aerobrake', icon: '🌡️', description: 'Use atmosphere to slow down', enabled: false },
		{ id: 'station-keep', name: 'Station-Keep', icon: '📍', description: 'Maintain current orbit per year', enabled: true },
	];

	// ── Deploy Methods ────────────────────────────────────
	const deployMethods: DeployMethodDef[] = [
		{ id: 'spin-stabilized', name: 'Spin-Stabilized', icon: '🔄', description: 'Spring-eject with spin for gyroscopic stability', deltaVOverhead: 5 },
		{ id: 'propulsive', name: 'Propulsive', icon: '🚀', description: 'Payload uses own propulsion — needs ΔV reserves', deltaVOverhead: 50 },
		{ id: 'docking', name: 'Docking', icon: '🔗', description: 'Payload docks with station/vehicle — precise guidance', deltaVOverhead: 15 },
		{ id: 'electromagnetic', name: 'Electromagnetic', icon: '⚡', description: 'Rail-launched from carrier — high velocity, low mass payloads', deltaVOverhead: 2 },
	];

	// ── ΔV Calculations ──────────────────────────────────
	const EARTH_MU = 3.986e14;  // m³/s²  standard gravitational parameter
	const EARTH_R = 6371;       // km      mean radius

	// Orbital velocity at altitude (circular) in m/s
	function orbitalVelocity(altKm: number, bodyR: number = EARTH_R, mu: number = EARTH_MU): number {
		const r = (bodyR + altKm) * 1000; // meters
		return Math.sqrt(mu / r);
	}

	// ΔV for circularization from an elliptical insertion
	// Assumes launcher puts you in a parking orbit at periapsis, need to raise apoapsis
	function dvCircularize(peKm: number, apKm: number): number {
		if (Math.abs(peKm - apKm) < 1) return 0; // already circular
		const rPe = (EARTH_R + peKm) * 1000;
		const rAp = (EARTH_R + apKm) * 1000;
		const a = (rPe + rAp) / 2;
		// velocity at apoapsis on the transfer orbit
		const vAp = Math.sqrt(EARTH_MU * (2 / rAp - 1 / a));
		// circular velocity at apoapsis altitude
		const vCirc = Math.sqrt(EARTH_MU / rAp);
		return Math.abs(vCirc - vAp);
	}

	// ΔV for a plane change at given altitude and angle
	function dvPlaneChange(altKm: number, angleDeg: number): number {
		if (angleDeg === 0) return 0;
		const v = orbitalVelocity(altKm);
		return 2 * v * Math.sin((angleDeg * Math.PI / 180) / 2);
	}

	// ΔV for deorbit from circular orbit (lower periapsis to ~80km for reentry)
	function dvDeorbit(altKm: number): number {
		const rOrbit = (EARTH_R + altKm) * 1000;
		const rPe = (EARTH_R + 80) * 1000; // reentry altitude
		const a = (rOrbit + rPe) / 2;
		const vCirc = Math.sqrt(EARTH_MU / rOrbit);
		const vTransfer = Math.sqrt(EARTH_MU * (2 / rOrbit - 1 / a));
		return Math.abs(vCirc - vTransfer);
	}

	// Station-keeping ΔV per year (depends on orbit type)
	function dvStationKeep(orbitId: string): number {
		if (orbitId.includes('geo')) return 50;  // GEO stationkeeping ~50 m/s/yr
		if (orbitId.includes('leo')) return 25;  // LEO drag makeup ~25 m/s/yr
		if (orbitId.includes('sso')) return 30;  // SSO maintenance
		if (orbitId.includes('meo')) return 5;   // MEO very stable
		if (orbitId.includes('heo')) return 10;  // HEO minimal
		return 15; // default
	}

	// ΔV for launch from ground to a target orbit altitude
	// Includes ~1,500 m/s gravity + drag losses for Earth ascent
	function dvLaunchToOrbit(targetAltKm: number): number {
		const GRAVITY_DRAG_LOSS = 1500; // m/s typical Earth ascent losses
		const vOrbit = orbitalVelocity(targetAltKm);
		return vOrbit + GRAVITY_DRAG_LOSS;
	}

	// Compute ΔV for each activity based on current mission parameters
	function activityDeltaV(act: MissionActivity): number {
		switch (act.type) {
			case 'launch-to-orbit': {
				const alt = selectedOrbit?.circular ? orbitAltitude : orbitPeriapsis;
				return dvLaunchToOrbit(alt);
			}
			case 'circularize':
				if (selectedOrbit?.circular) {
					// Launcher inserts at ~200km parking, circularize up to target
					return dvCircularize(200, orbitAltitude);
				} else {
					return dvCircularize(orbitPeriapsis, orbitApoapsis);
				}
			case 'deploy-payload': {
				const dm = deployMethods.find(d => d.id === selectedDeployMethod);
				return (dm?.deltaVOverhead ?? 5) * Math.max(1, selectedPayloads.length);
			}
			case 'plane-change': {
				// ΔV to change from launch site latitude to target inclination
				const siteLatMatch = selectedSite ? launchSites.find(s => s.name === selectedSite) : null;
				const siteLat = siteLatMatch ? parseFloat(siteLatMatch.lat) : 28.5;
				const angleChange = Math.abs(orbitInclination - siteLat);
				const alt = selectedOrbit?.circular ? orbitAltitude : (orbitPeriapsis + orbitApoapsis) / 2;
				return dvPlaneChange(alt, angleChange);
			}
			case 'deorbit': {
				const alt = selectedOrbit?.circular ? orbitAltitude : orbitApoapsis;
				return dvDeorbit(alt);
			}
			case 'station-keep':
				return dvStationKeep(selectedOrbitId);
			case 'rendezvous':
				return 150; // typical ~150 m/s for phasing + approach
			case 'dock':
				return 5;   // final docking ~5 m/s
			case 'land':
				return 1800; // lunar landing budget; varies by body
			case 'hohmann-transfer':
				return 0;   // computed when target orbit is specified
			case 'aerobrake':
				return 0;   // no propulsive cost
			default:
				return 0;
		}
	}

	// ── State ─────────────────────────────────────────────
	let selectedSite = $state('');
	let selectedRocket = $state('');
	let selectedPayloads = $state<string[]>([]);
	let selectedFuel = $state('');

	// Mission identity
	let missionName = $state('');
	let savedMissions = $state<SavedMission[]>([]);
	let loadedMissionIndex = $state<number | null>(null);

	// Destination
	let selectedBody = $state('earth');
	let selectedOrbitId = $state('earth-leo');
	let orbitAltitude = $state(400);
	let orbitInclination = $state(28.5);
	let orbitApoapsis = $state(400);
	let orbitPeriapsis = $state(400);

	// Schedule
	let missionMode = $state<'one-off' | 'repeating'>('one-off');
	let launchDate = $state('2031-01-15');
	let repeatIntervalDays = $state(30);
	let launchWindow = $state<LaunchWindow>('next-optimal');

	// Activities & deployment
	let missionActivities = $state<MissionActivity[]>([
		{ type: 'launch-to-orbit', notes: '' },
		{ type: 'circularize', notes: '' },
		{ type: 'deploy-payload', notes: '' },
	]);
	let selectedDeployMethod = $state<DeployMethod>('spin-stabilized');

	// ── Auto-generate mission name ───────────────────────
	function autoGenerateName(): string {
		const dest = selectedOrbit?.name?.split('(')[0]?.trim() ?? selectedBody;
		const veh = selectedRocket ? selectedRocket.split('/')[0].trim() : 'TBD';
		const payCount = selectedPayloads.length;
		const num = savedMissions.length + 1;
		return `VM-${String(num).padStart(3, '0')} ${dest} · ${veh} · ${payCount}P`;
	}

	// ── Save / Load / Edit ───────────────────────────────
	function saveMission() {
		const name = missionName || autoGenerateName();
		const mission: SavedMission = {
			name,
			site: selectedSite,
			rocket: selectedRocket,
			payloads: [...selectedPayloads],
			fuel: selectedFuel,
			body: selectedBody,
			orbitId: selectedOrbitId,
			altitude: orbitAltitude,
			inclination: orbitInclination,
			apoapsis: orbitApoapsis,
			periapsis: orbitPeriapsis,
			mode: missionMode,
			date: launchDate,
			repeatDays: repeatIntervalDays,
			activities: missionActivities.map(a => ({ ...a })),
			launchWindow,
			deployMethod: selectedDeployMethod,
		};
		if (loadedMissionIndex !== null) {
			savedMissions[loadedMissionIndex] = mission;
			savedMissions = [...savedMissions];
		} else {
			savedMissions = [...savedMissions, mission];
		}
		missionName = name;
		loadedMissionIndex = savedMissions.length - 1;
	}

	function loadMission(index: number) {
		const m = savedMissions[index];
		if (!m) return;
		missionName = m.name;
		selectedSite = m.site;
		selectedRocket = m.rocket;
		selectedPayloads = [...m.payloads];
		selectedFuel = m.fuel;
		selectedBody = m.body;
		selectedOrbitId = m.orbitId;
		orbitAltitude = m.altitude;
		orbitInclination = m.inclination;
		orbitApoapsis = m.apoapsis;
		orbitPeriapsis = m.periapsis;
		missionMode = m.mode;
		launchDate = m.date;
		repeatIntervalDays = m.repeatDays;
		missionActivities = m.activities.map(a => ({ ...a }));
		launchWindow = m.launchWindow;
		selectedDeployMethod = m.deployMethod;
		loadedMissionIndex = index;
	}

	function deleteMission(index: number) {
		savedMissions = savedMissions.filter((_, i) => i !== index);
		if (loadedMissionIndex === index) loadedMissionIndex = null;
		else if (loadedMissionIndex !== null && loadedMissionIndex > index) loadedMissionIndex--;
	}

	function newMission() {
		missionName = '';
		selectedSite = '';
		selectedRocket = '';
		selectedPayloads = [];
		selectedFuel = '';
		selectedBody = 'earth';
		selectedOrbitId = 'earth-leo';
		orbitAltitude = 400;
		orbitInclination = 28.5;
		orbitApoapsis = 400;
		orbitPeriapsis = 400;
		missionMode = 'one-off';
		launchDate = '2031-01-15';
		repeatIntervalDays = 30;
		missionActivities = [
			{ type: 'launch-to-orbit', notes: '' },
			{ type: 'circularize', notes: '' },
			{ type: 'deploy-payload', notes: '' },
		];
		launchWindow = 'next-optimal';
		selectedDeployMethod = 'spin-stabilized';
		loadedMissionIndex = null;
	}

	// ── Total ΔV ─────────────────────────────────────────
	let totalDeltaV = $derived(missionActivities.reduce((sum, act) => sum + activityDeltaV(act), 0));

	// ── Derived: destination ──────────────────────────────
	let selectedDest = $derived(destinations.find(d => d.body === selectedBody));
	let availableOrbits = $derived(selectedDest?.orbits ?? []);
	let selectedOrbit = $derived(availableOrbits.find(o => o.id === selectedOrbitId));

	function selectBody(body: string) {
		selectedBody = body;
		const dest = destinations.find(d => d.body === body);
		if (dest && dest.orbits.length > 0) {
			selectOrbit(dest.orbits[0]);
		}
	}

	function selectOrbit(orbit: OrbitType) {
		selectedOrbitId = orbit.id;
		orbitAltitude = orbit.defaultAlt;
		orbitInclination = orbit.defaultInc;
		if (orbit.circular) {
			orbitApoapsis = orbit.defaultAlt;
			orbitPeriapsis = orbit.defaultAlt;
		} else {
			orbitPeriapsis = orbit.altRange[0];
			orbitApoapsis = orbit.defaultAlt;
		}
	}

	function clampAlt(v: number): number {
		if (!selectedOrbit) return v;
		return Math.max(selectedOrbit.altRange[0], Math.min(selectedOrbit.altRange[1], v));
	}

	function clampInc(v: number): number {
		if (!selectedOrbit) return v;
		return Math.max(selectedOrbit.incRange[0], Math.min(selectedOrbit.incRange[1], v));
	}

	// ── Derived: activities ───────────────────────────────
	function addActivity(type: ActivityType) {
		missionActivities = [...missionActivities, { type, notes: '' }];
	}

	function removeActivity(index: number) {
		missionActivities = missionActivities.filter((_, i) => i !== index);
	}

	function moveActivity(index: number, dir: -1 | 1) {
		const arr = [...missionActivities];
		const target = index + dir;
		if (target < 0 || target >= arr.length) return;
		[arr[index], arr[target]] = [arr[target], arr[index]];
		missionActivities = arr;
	}

	// ── Payload / fuel logic (unchanged) ──────────────────
	function togglePayload(name: string) {
		if (selectedPayloads.includes(name)) {
			selectedPayloads = selectedPayloads.filter(p => p !== name);
		} else {
			selectedPayloads = [...selectedPayloads, name];
		}
	}

	let chosenRocket = $derived(rocketOptions.find(r => r.name === selectedRocket));
	let chosenFuel = $derived(fuelOptions.find(f => f.name === selectedFuel));
	let chosenPayloadItems = $derived(selectedPayloads.map(n => payloadOptions.find(p => p.name === n)).filter(Boolean) as PayloadOption[]);

	let totalPayloadMass = $derived(chosenPayloadItems.reduce((s, p) => s + p.mass, 0));
	let totalPayloadVolume = $derived(chosenPayloadItems.reduce((s, p) => s + p.volume_m3, 0));
	let totalPayloadCost = $derived(chosenPayloadItems.reduce((s, p) => s + p.cost, 0));

	let remainingMass = $derived(chosenRocket ? chosenRocket.payloadLEO - totalPayloadMass : 0);
	let remainingVolume = $derived(chosenRocket ? chosenRocket.fairingVolume_m3 - totalPayloadVolume : 0);
	let usableFuelVolume = $derived(Math.max(0, remainingVolume * FUEL_PACKING_EFFICIENCY));

	let fuelVolume_m3 = $derived(() => {
		if (!chosenRocket || !chosenFuel || remainingMass <= 0 || remainingVolume <= 0) return 0;
		const volumeLimit = usableFuelVolume;
		const massLimit = remainingMass / chosenFuel.density_kg_m3;
		return Math.min(volumeLimit, massLimit);
	});
	let fuelMass_kg = $derived(() => {
		if (!chosenFuel) return 0;
		return fuelVolume_m3() * chosenFuel.density_kg_m3;
	});
	let fuelCost = $derived(() => {
		if (!chosenFuel) return 0;
		return fuelVolume_m3() * chosenFuel.cost_per_m3;
	});
	let fuelConstraint = $derived.by<'mass' | 'volume' | 'none'>(() => {
		if (!chosenRocket || !chosenFuel || fuelVolume_m3() === 0) return 'none';
		const volumeLimit = usableFuelVolume;
		const massLimit = remainingMass / chosenFuel.density_kg_m3;
		return massLimit < volumeLimit ? 'mass' : 'volume';
	});

	let grandTotalMass = $derived(totalPayloadMass + fuelMass_kg());
	let grandTotalVolume = $derived(totalPayloadVolume + fuelVolume_m3());
	let totalMissionCost = $derived(totalPayloadCost + fuelCost() + (chosenRocket?.costPerLaunch ?? 0));

	let overMass = $derived(chosenRocket ? totalPayloadMass > chosenRocket.payloadLEO : false);
	let overVolume = $derived(chosenRocket ? totalPayloadVolume > chosenRocket.fairingVolume_m3 : false);
	let overAny = $derived(overMass || overVolume);

	let massPercent = $derived(chosenRocket ? (grandTotalMass / chosenRocket.payloadLEO) * 100 : 0);
	let volumePercent = $derived(chosenRocket ? (grandTotalVolume / chosenRocket.fairingVolume_m3) * 100 : 0);

	let launchesNeeded = $derived(
		chosenRocket && totalPayloadMass > 0
			? Math.ceil(totalPayloadMass / chosenRocket.payloadLEO)
			: 0
	);

	function formatMass(kg: number): string {
		if (Math.abs(kg) >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}

	function formatAlt(km: number): string {
		if (km >= 1000000) return (km / 1000000).toFixed(1) + 'M km';
		if (km >= 10000) return (km / 1000).toFixed(0) + 'k km';
		return km.toLocaleString() + ' km';
	}
</script>

<div class="missions-tab">
	<h3 class="text-lg font-semibold mb-3">Mission Designer</h3>

	<!-- Row 1: Launch Site + Launch Vehicle -->
	<div class="designer-grid">
		<div class="designer-section">
			<h4 class="section-title">1. Launch Site</h4>
			<select class="selector" bind:value={selectedSite}>
				<option value="">— Select launch site —</option>
				{#each launchSites as site}
					<option value={site.name} class:owned-option={ownedSiteNames.has(site.name)}>
						{ownedSiteNames.has(site.name) ? '★ ' : ''}{site.name} ({site.lat}){ownedSiteNames.has(site.name) ? ' — OWNED' : ''}
					</option>
				{/each}
			</select>
		</div>

		<div class="designer-section">
			<h4 class="section-title">2. Launch Vehicle</h4>
			<select class="selector" bind:value={selectedRocket}>
				<option value="">— Select rocket —</option>
				{#each rocketOptions as rocket}
					{@const owned = ownedRocketCounts[rocket.name] ?? 0}
					<option value={rocket.name} class:owned-option={owned > 0}>
						{owned > 0 ? `★ ` : ''}{rocket.name} — {formatMass(rocket.payloadLEO)} / {rocket.fairingVolume_m3} m³ — ${rocket.costPerLaunch}M{owned > 0 ? ` — ×${owned} OWNED` : ''}
					</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Payloads -->
	<div class="designer-section mt-3">
		<h4 class="section-title">3. Select Payloads</h4>
		<div class="payload-checklist">
			{#each payloadOptions as p}
				{@const invCount = payloadInvByName[p.name] ?? 0}
				<label class="payload-check" class:selected={selectedPayloads.includes(p.name)} class:over-constraint={overAny && selectedPayloads.includes(p.name)} class:has-inventory={invCount > 0}>
					<input type="checkbox" checked={selectedPayloads.includes(p.name)} onchange={() => togglePayload(p.name)} />
					<span class="check-name">{p.name}</span>
					{#if invCount > 0}
						<span class="check-inv">×{invCount}</span>
					{/if}
					<span class="check-mass">{formatMass(p.mass)}</span>
					<span class="check-vol">{p.volume_m3} m³</span>
					<span class="check-cost">${p.cost}M</span>
				</label>
			{/each}
		</div>
	</div>

	<!-- Fuel fill -->
	<div class="designer-section mt-3">
		<h4 class="section-title">4. Fuel Fill (Depot Supply)</h4>
		<div class="fuel-row">
			<select class="selector fuel-selector" bind:value={selectedFuel}>
				<option value="">— No fuel (skip) —</option>
				{#each fuelOptions as f}
					<option value={f.name}>{f.name} — {f.density_kg_m3} kg/m³ — ${f.cost_per_m3}M/m³</option>
				{/each}
			</select>
			{#if chosenFuel && chosenRocket && !overAny}
				<div class="fuel-result">
					<span class="fuel-stat">
						<span class="fuel-stat-label">Fill</span>
						<span class="fuel-stat-value">{fuelVolume_m3().toFixed(1)} m³</span>
					</span>
					<span class="fuel-stat">
						<span class="fuel-stat-label">Mass</span>
						<span class="fuel-stat-value">{formatMass(Math.round(fuelMass_kg()))}</span>
					</span>
					<span class="fuel-stat">
						<span class="fuel-stat-label">Cost</span>
						<span class="fuel-stat-value">${fuelCost().toFixed(1)}M</span>
					</span>
					<span class="fuel-constraint-tag" class:constraint-mass={fuelConstraint === 'mass'} class:constraint-volume={fuelConstraint === 'volume'}>
						{fuelConstraint === 'mass' ? '⚖ mass-limited' : '📦 volume-limited'}
					</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Payload / Vehicle Capacity Bars -->
	{#if chosenRocket}
		<div class="capacity-bars mt-3">
			{#if overMass}
				<div class="mass-warning">
					⚠ Payload exceeds vehicle mass capacity by {formatMass(totalPayloadMass - chosenRocket.payloadLEO)}.
				</div>
			{/if}
			{#if overVolume}
				<div class="mass-warning">
					⚠ Payload exceeds fairing volume by {(totalPayloadVolume - chosenRocket.fairingVolume_m3).toFixed(1)} m³.
				</div>
			{/if}
			<div class="bar-label-row">
				<span class="bar-title">Mass — {formatMass(grandTotalMass)} / {formatMass(chosenRocket.payloadLEO)}</span>
				<span class="bar-pct">{massPercent.toFixed(0)}%</span>
			</div>
			<div class="mass-bar-container">
				<div class="mass-bar" style="width: {Math.min(100, massPercent)}%" class:bar-ok={!overMass} class:bar-over={overMass}></div>
			</div>
			<div class="bar-label-row mt-1">
				<span class="bar-title">Volume — {grandTotalVolume.toFixed(1)} m³ / {chosenRocket.fairingVolume_m3} m³</span>
				<span class="bar-pct">{volumePercent.toFixed(0)}%</span>
			</div>
			<div class="mass-bar-container">
				<div class="mass-bar" style="width: {Math.min(100, volumePercent)}%" class:bar-ok={!overVolume} class:bar-over={overVolume}></div>
			</div>
		</div>
	{/if}

	<!-- 5. Destination -->
	<div class="designer-section mt-3">
		<h4 class="section-title">5. Destination</h4>

		<!-- Body selector pills -->
		<div class="body-pills">
			{#each destinations as dest}
				<button
					class="body-pill"
					class:active={selectedBody === dest.body}
					class:disabled={!dest.enabled}
					disabled={!dest.enabled}
					onclick={() => selectBody(dest.body)}
				>
					<span class="body-pill-icon">{dest.icon}</span>
					<span>{dest.bodyLabel}</span>
					{#if !dest.enabled}
						<span class="locked-badge">🔒</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Orbit type selector -->
		{#if selectedDest}
			<div class="orbit-selector">
				{#each availableOrbits as orbit}
					<button
						class="orbit-option"
						class:active={selectedOrbitId === orbit.id}
						onclick={() => selectOrbit(orbit)}
					>
						<span class="orbit-name">{orbit.name}</span>
						<span class="orbit-desc">{orbit.description}</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Orbital Parameters -->
		{#if selectedOrbit}
			<div class="orbit-params">
				<h5 class="params-title">Orbital Parameters</h5>
				<div class="params-grid">
					{#if selectedOrbit.circular}
						<div class="param-field">
						<span class="param-label">Altitude</span>
							<div class="param-input-row">
								<input
									class="param-input"
									type="number"
									min={selectedOrbit.altRange[0]}
									max={selectedOrbit.altRange[1]}
									bind:value={orbitAltitude}
									onblur={() => { orbitAltitude = clampAlt(orbitAltitude); orbitApoapsis = orbitAltitude; orbitPeriapsis = orbitAltitude; }}
								/>
								<span class="param-unit">km</span>
							</div>
							<span class="param-range">{formatAlt(selectedOrbit.altRange[0])} – {formatAlt(selectedOrbit.altRange[1])}</span>
						</div>
					{:else}
						<div class="param-field">
						<span class="param-label">Apoapsis</span>
							<div class="param-input-row">
								<input
									class="param-input"
									type="number"
									min={selectedOrbit.altRange[0]}
									max={selectedOrbit.altRange[1]}
									bind:value={orbitApoapsis}
									onblur={() => { orbitApoapsis = clampAlt(orbitApoapsis); if (orbitPeriapsis > orbitApoapsis) orbitPeriapsis = orbitApoapsis; }}
								/>
								<span class="param-unit">km</span>
							</div>
						</div>
						<div class="param-field">
						<span class="param-label">Periapsis</span>
							<div class="param-input-row">
								<input
									class="param-input"
									type="number"
									min={selectedOrbit.altRange[0]}
									max={orbitApoapsis}
									bind:value={orbitPeriapsis}
									onblur={() => { orbitPeriapsis = Math.max(selectedOrbit!.altRange[0], Math.min(orbitApoapsis, orbitPeriapsis)); }}
								/>
								<span class="param-unit">km</span>
							</div>
						</div>
					{/if}
					<div class="param-field">
					<span class="param-label">Inclination</span>
						<div class="param-input-row">
							<input
								class="param-input"
								type="number"
								min={selectedOrbit.incRange[0]}
								max={selectedOrbit.incRange[1]}
								step="0.1"
								bind:value={orbitInclination}
								onblur={() => { orbitInclination = clampInc(orbitInclination); }}
							/>
							<span class="param-unit">°</span>
						</div>
						<span class="param-range">{selectedOrbit.incRange[0]}° – {selectedOrbit.incRange[1]}°</span>
					</div>
				</div>

				<!-- Orbit quick-info -->
				<div class="orbit-info-row">
					{#if selectedOrbit.circular}
						<span class="orbit-info-tag">⭕ Circular · {formatAlt(orbitAltitude)} · {orbitInclination.toFixed(1)}°</span>
					{:else}
						<span class="orbit-info-tag">🔵 Elliptical · {formatAlt(orbitPeriapsis)} × {formatAlt(orbitApoapsis)} · {orbitInclination.toFixed(1)}°</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- 6. Launch Date & Schedule -->
	<div class="designer-section mt-3">
		<h4 class="section-title">6. Launch Date &amp; Schedule</h4>
		<div class="schedule-row">
			<div class="mode-pills">
				<button class="mode-pill" class:active={missionMode === 'one-off'} onclick={() => missionMode = 'one-off'}>One-Off</button>
				<button class="mode-pill" class:active={missionMode === 'repeating'} onclick={() => missionMode = 'repeating'}>Repeating</button>
			</div>
			<div class="param-field">
				<span class="param-label">{missionMode === 'one-off' ? 'Launch Date' : 'First Launch'}</span>
				<input class="param-input date-input" type="date" bind:value={launchDate} />
			</div>
			{#if missionMode === 'repeating'}
				<div class="param-field">
					<span class="param-label">Repeat Every</span>
					<div class="param-input-row">
						<input class="param-input" type="number" min="1" max="365" bind:value={repeatIntervalDays} />
						<span class="param-unit">days</span>
					</div>
				</div>
			{/if}
			<div class="param-field">
				<span class="param-label">Launch Window</span>
				<div class="mode-pills">
					<button class="mode-pill" class:active={launchWindow === 'exact'} onclick={() => launchWindow = 'exact'}>Exact</button>
					<button class="mode-pill" class:active={launchWindow === 'next-optimal'} onclick={() => launchWindow = 'next-optimal'}>Next Optimal</button>
					<button class="mode-pill" class:active={launchWindow === 'asap'} onclick={() => launchWindow = 'asap'}>ASAP</button>
				</div>
			</div>
		</div>
		<p class="text-xs text-[var(--color-text-dim)] mt-1">
			{#if launchWindow === 'exact'}Launches on the specified date regardless of orbital alignment.
			{:else if launchWindow === 'next-optimal'}Waits for the next optimal launch window after the specified date (best ΔV efficiency).
			{:else}Launches at the earliest possible opportunity.
			{/if}
		</p>
	</div>

	<!-- 7. Payload Deployment -->
	<div class="designer-section mt-3">
		<h4 class="section-title">7. Payload Deployment Method</h4>
		<div class="deploy-pills">
			{#each deployMethods as dm}
				<button
					class="deploy-pill"
					class:active={selectedDeployMethod === dm.id}
					onclick={() => selectedDeployMethod = dm.id}
					title={dm.description}
				>
					<span class="deploy-icon">{dm.icon}</span>
					<div class="deploy-info">
						<span class="deploy-name">{dm.name}</span>
						<span class="deploy-desc">{dm.description}</span>
					</div>
					<span class="deploy-dv">+{dm.deltaVOverhead} m/s/payload</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- 8. Mission Activities -->
	<div class="designer-section mt-3">
		<h4 class="section-title">8. Mission Activities</h4>
		<p class="text-xs text-[var(--color-text-dim)] mb-2">Stack activities in order. ΔV costs are computed from your mission parameters.</p>

		<div class="activity-stack">
			{#each missionActivities as act, i}
				{@const def = activityDefs.find(d => d.id === act.type)}
				{@const dv = activityDeltaV(act)}
				<div class="activity-item">
					<span class="activity-num">{i + 1}</span>
					<span class="activity-icon">{def?.icon ?? '?'}</span>
					<span class="activity-name">{def?.name ?? act.type}</span>
					<span class="activity-dv" class:dv-zero={dv === 0}>
						{dv > 0 ? `${dv.toFixed(0)} m/s` : '—'}
					</span>
					<span class="activity-desc">{def?.description ?? ''}</span>
					<div class="activity-actions">
						<button class="act-btn" disabled={i === 0} onclick={() => moveActivity(i, -1)} title="Move up">▲</button>
						<button class="act-btn" disabled={i === missionActivities.length - 1} onclick={() => moveActivity(i, 1)} title="Move down">▼</button>
						<button class="act-btn act-remove" onclick={() => removeActivity(i)} title="Remove">✕</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Total ΔV -->
		<div class="dv-total-row">
			<span class="dv-total-label">Total Mission ΔV</span>
			<span class="dv-total-value">{totalDeltaV.toFixed(0)} m/s</span>
		</div>

		<!-- Add activity -->
		<div class="add-activity">
			<span class="add-label">Add:</span>
			{#each activityDefs as ad}
				<button
					class="add-act-btn"
					class:disabled={!ad.enabled}
					disabled={!ad.enabled}
					onclick={() => addActivity(ad.id)}
					title={ad.description}
				>
					{ad.icon} {ad.name}
					{#if !ad.enabled}<span class="locked-badge">🔒</span>{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Mission Name & Save/Load -->
	<div class="designer-section mt-3">
		<h4 class="section-title">Mission Plan</h4>
		<div class="mission-name-row">
			<input
				class="param-input mission-name-input"
				type="text"
				placeholder="Mission name (auto-generated if blank)"
				bind:value={missionName}
			/>
			<button class="btn-auto-name" onclick={() => missionName = autoGenerateName()} title="Auto-generate name">🎲</button>
		</div>
		<div class="action-buttons">
			<button class="btn-launch" disabled={!selectedSite || !selectedRocket || selectedPayloads.length === 0 || overAny}>
				🚀 Launch Mission
			</button>
			<button class="btn-save" onclick={saveMission} disabled={!selectedSite || !selectedRocket}>
				💾 {loadedMissionIndex !== null ? 'Update' : 'Save'} Plan
			</button>
			<button class="btn-new" onclick={newMission}>
				📄 New Mission
			</button>
		</div>
	</div>

	<!-- Saved Missions List -->
	{#if savedMissions.length > 0}
		<div class="designer-section mt-3">
			<h4 class="section-title">Saved Mission Plans ({savedMissions.length})</h4>
			<div class="saved-list">
				{#each savedMissions as sm, i}
					<div class="saved-item" class:active-mission={loadedMissionIndex === i}>
						<span class="saved-name">{sm.name}</span>
						<span class="saved-meta">{sm.rocket || '—'} · {sm.payloads.length}P · {sm.date}</span>
						<div class="saved-actions">
							<button class="act-btn" onclick={() => loadMission(i)} title="Load">📂</button>
							<button class="act-btn act-remove" onclick={() => deleteMission(i)} title="Delete">✕</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Mission Summary -->
	{#if selectedSite || selectedRocket || selectedPayloads.length > 0}
		<div class="summary" class:warning={overAny}>
			<h4 class="section-title">Mission Summary{missionName ? ` — ${missionName}` : ''}</h4>
			<div class="summary-grid">
				<div class="summary-item">
					<span class="sum-label">Launch Site</span>
					<span class="sum-value">{selectedSite || '—'}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Vehicle</span>
					<span class="sum-value">{selectedRocket || '—'}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Payloads</span>
					<span class="sum-value">{selectedPayloads.length} selected{chosenFuel ? ' + fuel' : ''}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Destination</span>
					<span class="sum-value">{selectedDest?.icon} {selectedOrbit?.name ?? '—'}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Orbit</span>
					<span class="sum-value">
						{#if selectedOrbit?.circular}
							{formatAlt(orbitAltitude)} · {orbitInclination.toFixed(1)}°
						{:else if selectedOrbit}
							{formatAlt(orbitPeriapsis)} × {formatAlt(orbitApoapsis)} · {orbitInclination.toFixed(1)}°
						{:else}
							—
						{/if}
					</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Launch</span>
					<span class="sum-value">{launchDate}{missionMode === 'repeating' ? ` (every ${repeatIntervalDays}d)` : ''} · {launchWindow === 'exact' ? '⏱ Exact' : launchWindow === 'next-optimal' ? '🎯 Optimal' : '⚡ ASAP'}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Deploy Method</span>
					<span class="sum-value">{deployMethods.find(d => d.id === selectedDeployMethod)?.icon} {deployMethods.find(d => d.id === selectedDeployMethod)?.name}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Total ΔV</span>
					<span class="sum-value dv-highlight">{totalDeltaV.toFixed(0)} m/s</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Activities</span>
					<span class="sum-value">{missionActivities.map(a => activityDefs.find(d => d.id === a.type)?.icon ?? '?').join(' → ')}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Payload Mass</span>
					<span class="sum-value" class:text-red={overMass}>{formatMass(totalPayloadMass)}</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Payload Volume</span>
					<span class="sum-value" class:text-red={overVolume}>{totalPayloadVolume.toFixed(1)} m³</span>
				</div>
				{#if chosenFuel && fuelMass_kg() > 0}
					<div class="summary-item">
						<span class="sum-label">Fuel ({chosenFuel.name.split(' (')[0]})</span>
						<span class="sum-value fuel-highlight">{formatMass(Math.round(fuelMass_kg()))} / {fuelVolume_m3().toFixed(1)} m³</span>
					</div>
				{/if}
				{#if chosenRocket}
					<div class="summary-item">
						<span class="sum-label">Vehicle Capacity</span>
						<span class="sum-value">{formatMass(chosenRocket.payloadLEO)} / {chosenRocket.fairingVolume_m3} m³</span>
					</div>
					<div class="summary-item">
						<span class="sum-label">Launches Required</span>
						<span class="sum-value">{launchesNeeded}</span>
					</div>
				{/if}
				<div class="summary-item full-width">
					<span class="sum-label">Total Mission Cost</span>
					<span class="sum-value cost-total">${totalMissionCost.toLocaleString()}M</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.missions-tab {
		display: flex;
		flex-direction: column;
	}

	.designer-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.designer-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.section-title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
	}

	.selector {
		width: 100%;
		padding: 0.4rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.72rem;
		font-family: inherit;
		cursor: pointer;
	}
	.selector:focus { outline: none; border-color: var(--color-text-dim); }
	.owned-option { font-weight: 700; }

	/* Payloads */
	.payload-checklist {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.25rem;
		max-height: 260px;
		overflow-y: auto;
		padding-right: 0.3rem;
	}
	.payload-check {
		display: grid;
		grid-template-columns: auto 1fr auto auto auto auto;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.4rem;
		border-radius: 0.25rem;
		border: 1px solid transparent;
		font-size: 0.68rem;
		cursor: pointer;
		transition: all 0.12s;
	}
	.payload-check:hover { background: var(--color-bg); }
	.payload-check.selected {
		background: rgba(99, 102, 241, 0.08);
		border-color: rgba(99, 102, 241, 0.3);
	}
	.payload-check.over-constraint { border-color: rgba(239, 68, 68, 0.4); }
	.payload-check.has-inventory {
		background: rgba(74, 222, 128, 0.06);
		border-color: rgba(74, 222, 128, 0.25);
	}
	.payload-check.has-inventory:hover { background: rgba(74, 222, 128, 0.12); }
	.payload-check input[type="checkbox"] { accent-color: #6366f1; cursor: pointer; }
	.check-name { font-weight: 500; }
	.check-inv {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; font-weight: 700; color: #60a5fa;
		background: rgba(59, 130, 246, 0.15);
		padding: 0.05rem 0.3rem; border-radius: 999px;
		border: 1px solid rgba(59, 130, 246, 0.25);
	}
	.check-mass, .check-vol, .check-cost {
		color: var(--color-text-dim);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
	}

	/* Fuel */
	.fuel-row { display: flex; flex-direction: column; gap: 0.4rem; }
	.fuel-selector { max-width: 420px; }
	.fuel-result {
		display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;
		padding: 0.4rem 0.6rem;
		background: rgba(245, 158, 11, 0.06);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 0.375rem;
	}
	.fuel-stat { display: flex; flex-direction: column; gap: 0.05rem; }
	.fuel-stat-label { font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-dim); }
	.fuel-stat-value { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 600; color: #f59e0b; }
	.fuel-constraint-tag { font-size: 0.6rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: 0.25rem; margin-left: auto; }
	.fuel-constraint-tag.constraint-mass { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
	.fuel-constraint-tag.constraint-volume { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25); }
	.fuel-highlight { color: #f59e0b; }

	/* ── Destination ─────────────────────────────── */
	.body-pills {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.body-pill {
		display: flex; align-items: center; gap: 0.3rem;
		padding: 0.35rem 0.65rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.7rem; font-weight: 500;
		cursor: pointer;
		transition: all 0.12s;
	}
	.body-pill:hover:not(.disabled) { border-color: var(--color-text-dim); }
	.body-pill.active {
		background: rgba(99, 102, 241, 0.12);
		border-color: rgba(99, 102, 241, 0.5);
		color: #a5b4fc;
		font-weight: 600;
	}
	.body-pill.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.body-pill-icon { font-size: 0.9rem; }
	.locked-badge { font-size: 0.55rem; opacity: 0.6; }

	.orbit-selector {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.3rem;
		margin-top: 0.4rem;
	}
	.orbit-option {
		display: flex; flex-direction: column;
		padding: 0.4rem 0.55rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		cursor: pointer;
		transition: all 0.12s;
		text-align: left;
	}
	.orbit-option:hover { border-color: var(--color-text-dim); }
	.orbit-option.active {
		background: rgba(99, 102, 241, 0.1);
		border-color: rgba(99, 102, 241, 0.4);
	}
	.orbit-name { font-size: 0.68rem; font-weight: 600; color: var(--color-text); }
	.orbit-desc { font-size: 0.58rem; color: var(--color-text-dim); }

	/* Orbit parameters */
	.orbit-params {
		margin-top: 0.5rem;
		padding: 0.6rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}
	.params-title {
		font-size: 0.6rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.04em;
		color: var(--color-text-dim);
		margin-bottom: 0.4rem;
	}
	.params-grid {
		display: flex; flex-wrap: wrap; gap: 0.75rem;
	}
	.param-field {
		display: flex; flex-direction: column; gap: 0.15rem;
		min-width: 120px;
	}
	.param-label {
		font-size: 0.58rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.04em;
		color: var(--color-text-dim);
	}
	.param-input-row {
		display: flex; align-items: center; gap: 0.3rem;
	}
	.param-input {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem; font-weight: 600;
		padding: 0.25rem 0.4rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		width: 7rem;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.param-input::-webkit-inner-spin-button,
	.param-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
	.param-input:focus { outline: none; border-color: #6366f1; }
	.param-unit {
		font-size: 0.65rem; color: var(--color-text-dim);
		font-family: 'JetBrains Mono', monospace;
	}
	.param-range {
		font-size: 0.5rem; color: var(--color-text-dim);
		font-family: 'JetBrains Mono', monospace;
	}
	.date-input { width: 10rem; }

	.orbit-info-row {
		margin-top: 0.4rem;
		display: flex; gap: 0.5rem;
	}
	.orbit-info-tag {
		font-size: 0.65rem; font-weight: 600;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
		color: #a5b4fc;
	}

	/* ── Schedule ─────────────────────────────────── */
	.schedule-row {
		display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem;
	}
	.mode-pills {
		display: flex; gap: 0; border-radius: 0.375rem; overflow: hidden;
		border: 1px solid var(--color-border);
	}
	.mode-pill {
		padding: 0.35rem 0.7rem;
		font-size: 0.68rem; font-weight: 500;
		background: var(--color-bg);
		color: var(--color-text);
		cursor: pointer;
		border: none;
		transition: all 0.12s;
	}
	.mode-pill:not(:last-child) { border-right: 1px solid var(--color-border); }
	.mode-pill.active {
		background: rgba(99, 102, 241, 0.15);
		color: #a5b4fc;
		font-weight: 600;
	}

	/* ── Activities ───────────────────────────────── */
	.activity-stack {
		display: flex; flex-direction: column; gap: 0.25rem;
	}
	.activity-item {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
		font-size: 0.68rem;
	}
	.activity-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; font-weight: 700;
		color: var(--color-text-dim);
		min-width: 1.2rem; text-align: center;
		background: rgba(99, 102, 241, 0.1);
		border-radius: 0.25rem;
		padding: 0.1rem 0.25rem;
	}
	.activity-icon { font-size: 0.85rem; }
	.activity-name { font-weight: 600; }
	.activity-desc { flex: 1; color: var(--color-text-dim); font-size: 0.6rem; }
	.activity-actions { display: flex; gap: 0.2rem; flex-shrink: 0; }
	.act-btn {
		padding: 0.15rem 0.3rem;
		border-radius: 0.2rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-dim);
		font-size: 0.55rem;
		cursor: pointer;
		transition: all 0.1s;
	}
	.act-btn:hover:not(:disabled) { border-color: var(--color-text-dim); color: var(--color-text); }
	.act-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.act-remove:hover:not(:disabled) { border-color: rgba(239, 68, 68, 0.5); color: #f87171; }

	.add-activity {
		display: flex; flex-wrap: wrap; gap: 0.3rem;
		align-items: center;
		margin-top: 0.4rem;
	}
	.add-label {
		font-size: 0.6rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.04em;
		color: var(--color-text-dim);
	}
	.add-act-btn {
		padding: 0.2rem 0.45rem;
		border-radius: 0.25rem;
		border: 1px dashed var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.6rem;
		cursor: pointer;
		transition: all 0.12s;
	}
	.add-act-btn:hover:not(.disabled) {
		border-color: rgba(99, 102, 241, 0.4);
		color: var(--color-text);
		background: rgba(99, 102, 241, 0.06);
	}
	.add-act-btn.disabled { opacity: 0.35; cursor: not-allowed; }

	/* ── Summary ──────────────────────────────────── */
	.summary {
		margin-top: 0.75rem;
		padding: 0.65rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}
	.summary.warning { border-color: rgba(239, 68, 68, 0.4); }
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.4rem;
		margin-top: 0.4rem;
	}
	.summary-item { display: flex; flex-direction: column; gap: 0.1rem; }
	.summary-item.full-width {
		grid-column: 1 / -1;
		flex-direction: row; justify-content: space-between; align-items: center;
		padding-top: 0.35rem;
		border-top: 1px solid var(--color-border);
		margin-top: 0.2rem;
	}
	.sum-label { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-dim); }
	.sum-value { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 600; }
	.cost-total { font-size: 0.9rem; color: #fbbf24; }
	.text-red { color: #ef4444; }

	.mass-warning {
		margin-top: 0.4rem; padding: 0.3rem 0.5rem;
		border-radius: 0.25rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: #f87171; font-size: 0.65rem;
	}
	.mass-bar-container {
		position: relative; height: 0.65rem;
		background: var(--color-bg);
		border-radius: 0.375rem; overflow: hidden;
		margin-top: 0.15rem;
	}
	.mass-bar { height: 100%; transition: width 0.3s ease; border-radius: 0.375rem; }
	.mass-bar.bar-ok { background: linear-gradient(90deg, #22c55e, #4ade80); }
	.mass-bar.bar-over { background: linear-gradient(90deg, #ef4444, #f87171); }
	.bar-label-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem; }
	.bar-title { font-size: 0.55rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-dim); }
	.bar-pct { font-size: 0.55rem; font-weight: 600; font-family: 'JetBrains Mono', monospace; color: var(--color-text-dim); }

	.mt-1 { margin-top: 0.25rem; }
	.mt-3 { margin-top: 0.75rem; }
	.mb-2 { margin-bottom: 0.5rem; }

	/* Action buttons */
	.action-buttons {
		display: flex; gap: 0.5rem;
		margin-top: 0.6rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}
	.btn-launch {
		padding: 0.45rem 1rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(74, 222, 128, 0.4);
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
		font-size: 0.72rem; font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-launch:hover:not(:disabled) { background: rgba(74, 222, 128, 0.2); }
	.btn-launch:disabled { opacity: 0.35; cursor: not-allowed; }
	.btn-save {
		padding: 0.45rem 1rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-dim);
		font-size: 0.72rem; font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-save:hover:not(:disabled) { border-color: var(--color-text-dim); color: var(--color-text); }
	.btn-save:disabled { opacity: 0.35; cursor: not-allowed; }
	.btn-new {
		padding: 0.45rem 1rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-dim);
		font-size: 0.72rem; font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.btn-new:hover { border-color: var(--color-text-dim); color: var(--color-text); }

	/* Deploy method */
	.deploy-pills {
		display: flex; flex-direction: column; gap: 0.3rem;
	}
	.deploy-pill {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.68rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.12s;
	}
	.deploy-pill:hover { border-color: var(--color-text-dim); }
	.deploy-pill.active {
		background: rgba(99, 102, 241, 0.1);
		border-color: rgba(99, 102, 241, 0.4);
	}
	.deploy-icon { font-size: 0.9rem; flex-shrink: 0; }
	.deploy-info { display: flex; flex-direction: column; flex: 1; }
	.deploy-name { font-weight: 600; font-size: 0.68rem; }
	.deploy-desc { font-size: 0.55rem; color: var(--color-text-dim); }
	.deploy-dv {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem; font-weight: 600;
		color: #f59e0b; white-space: nowrap; flex-shrink: 0;
	}

	/* Activity ΔV badge */
	.activity-dv {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; font-weight: 700;
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.1);
		padding: 0.1rem 0.35rem;
		border-radius: 0.25rem;
		border: 1px solid rgba(245, 158, 11, 0.2);
		min-width: 3.5rem; text-align: center;
		flex-shrink: 0;
	}
	.activity-dv.dv-zero { color: var(--color-text-dim); background: transparent; border-color: transparent; }

	/* ΔV total row */
	.dv-total-row {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: 0.4rem;
		padding: 0.3rem 0.5rem;
		border-radius: 0.375rem;
		background: rgba(245, 158, 11, 0.06);
		border: 1px solid rgba(245, 158, 11, 0.2);
	}
	.dv-total-label {
		font-size: 0.6rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.04em;
		color: var(--color-text-dim);
	}
	.dv-total-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem; font-weight: 700;
		color: #f59e0b;
	}
	.dv-highlight { color: #f59e0b; }

	/* Mission name */
	.mission-name-row {
		display: flex; gap: 0.4rem; align-items: center;
	}
	.mission-name-input { flex: 1; width: auto; }
	.btn-auto-name {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text-dim);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.12s;
	}
	.btn-auto-name:hover { border-color: var(--color-text-dim); color: var(--color-text); }

	/* Saved missions list */
	.saved-list {
		display: flex; flex-direction: column; gap: 0.2rem;
		max-height: 200px; overflow-y: auto;
	}
	.saved-item {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.3rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		font-size: 0.65rem;
	}
	.saved-item.active-mission {
		border-color: rgba(99, 102, 241, 0.4);
		background: rgba(99, 102, 241, 0.06);
	}
	.saved-name { font-weight: 600; flex: 1; }
	.saved-meta { color: var(--color-text-dim); font-size: 0.58rem; font-family: 'JetBrains Mono', monospace; }
	.saved-actions { display: flex; gap: 0.2rem; flex-shrink: 0; }
</style>
