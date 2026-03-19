<script lang="ts">
	import { onMount } from 'svelte';
	import { claimedComplexes, launchComplexProfiles, scheduledMissionsStore, type LaunchComplexProfile, type ScheduledMissionMapData } from '$lib/stores/gameStore';
	import type L from 'leaflet';

	type PadRefurb = 'manual' | 'semi-auto' | 'automated';

	interface LaunchComplex {
		id: string;
		name: string;
		lat: number;
		lng: number;
		country: string;
		annualOpCostM: number;       // $M/yr operating cost
		launchCapacityKg: number;    // max payload to LEO in kg
		launchCadence: number;       // launches per year
		fuelCapacityT: number;       // propellant storage in tonnes
		fuelTypes: string;           // supported propellants
		dvLEO100: number;            // m/s to 100 km LEO
		dvMinInclination: number;    // m/s to minimum inclination LEO
		dvLunarTransfer: number;     // m/s to lunar transfer
		dvPolar: number;             // m/s to polar orbit
		weatherReliability: number;  // 0–1
		padRefurb: PadRefurb;
	}

	const complexes: LaunchComplex[] = [
		{
			id: 'ksc-39a', name: 'Kennedy Space Center (LC-39A)',
			lat: 28.5731, lng: -80.6490, country: 'USA',
			annualOpCostM: 450, launchCapacityKg: 150000, launchCadence: 24,
			fuelCapacityT: 3200, fuelTypes: 'LOX/LCH₄, LOX/RP-1',
			dvLEO100: 9400, dvMinInclination: 9200, dvLunarTransfer: 12400, dvPolar: 9800,
			weatherReliability: 0.82, padRefurb: 'semi-auto',
		},
		{
			id: 'ccafs-40', name: 'Cape Canaveral SFS (SLC-40)',
			lat: 28.5622, lng: -80.5771, country: 'USA',
			annualOpCostM: 320, launchCapacityKg: 70000, launchCadence: 40,
			fuelCapacityT: 2100, fuelTypes: 'LOX/RP-1, LOX/LCH₄',
			dvLEO100: 9400, dvMinInclination: 9200, dvLunarTransfer: 12400, dvPolar: 9800,
			weatherReliability: 0.82, padRefurb: 'semi-auto',
		},
		{
			id: 'baikonur', name: 'Baikonur Cosmodrome',
			lat: 45.9646, lng: 63.3052, country: 'Kazakhstan',
			annualOpCostM: 280, launchCapacityKg: 23000, launchCadence: 18,
			fuelCapacityT: 4500, fuelTypes: 'LOX/RP-1, N₂O₄/UDMH',
			dvLEO100: 9500, dvMinInclination: 9400, dvLunarTransfer: 12500, dvPolar: 10100,
			weatherReliability: 0.91, padRefurb: 'manual',
		},
		{
			id: 'vandenberg', name: 'Vandenberg SFB (SLC-4E)',
			lat: 34.7420, lng: -120.5724, country: 'USA',
			annualOpCostM: 310, launchCapacityKg: 70000, launchCadence: 30,
			fuelCapacityT: 1800, fuelTypes: 'LOX/RP-1, LOX/LCH₄',
			dvLEO100: 9500, dvMinInclination: 9700, dvLunarTransfer: 12600, dvPolar: 9500,
			weatherReliability: 0.88, padRefurb: 'semi-auto',
		},
		{
			id: 'xichang', name: 'Xichang Satellite Launch Center',
			lat: 28.2468, lng: 102.0268, country: 'China',
			annualOpCostM: 180, launchCapacityKg: 25000, launchCadence: 15,
			fuelCapacityT: 2800, fuelTypes: 'N₂O₄/UDMH, LOX/LH₂',
			dvLEO100: 9400, dvMinInclination: 9200, dvLunarTransfer: 12400, dvPolar: 9900,
			weatherReliability: 0.85, padRefurb: 'manual',
		},
		{
			id: 'wenchang', name: 'Wenchang Space Launch Site',
			lat: 19.6145, lng: 110.9510, country: 'China',
			annualOpCostM: 220, launchCapacityKg: 70000, launchCadence: 12,
			fuelCapacityT: 3000, fuelTypes: 'LOX/LH₂, LOX/RP-1',
			dvLEO100: 9350, dvMinInclination: 9100, dvLunarTransfer: 12300, dvPolar: 9700,
			weatherReliability: 0.78, padRefurb: 'semi-auto',
		},
		{
			id: 'jiuquan', name: 'Jiuquan Satellite Launch Center',
			lat: 40.9606, lng: 100.2910, country: 'China',
			annualOpCostM: 160, launchCapacityKg: 25000, launchCadence: 20,
			fuelCapacityT: 2200, fuelTypes: 'N₂O₄/UDMH, Solid',
			dvLEO100: 9500, dvMinInclination: 9500, dvLunarTransfer: 12500, dvPolar: 9800,
			weatherReliability: 0.92, padRefurb: 'manual',
		},
		{
			id: 'sriharikota', name: 'Satish Dhawan Space Centre',
			lat: 13.7199, lng: 80.2304, country: 'India',
			annualOpCostM: 120, launchCapacityKg: 10000, launchCadence: 12,
			fuelCapacityT: 1200, fuelTypes: 'LOX/LH₂, Solid, N₂O₄/UDMH',
			dvLEO100: 9350, dvMinInclination: 9150, dvLunarTransfer: 12350, dvPolar: 9650,
			weatherReliability: 0.75, padRefurb: 'manual',
		},
		{
			id: 'kourou', name: 'Guiana Space Centre',
			lat: 5.2322, lng: -52.7693, country: 'French Guiana',
			annualOpCostM: 350, launchCapacityKg: 70000, launchCadence: 14,
			fuelCapacityT: 2500, fuelTypes: 'LOX/LH₂, Solid, LOX/RP-1',
			dvLEO100: 9300, dvMinInclination: 9050, dvLunarTransfer: 12250, dvPolar: 9650,
			weatherReliability: 0.80, padRefurb: 'semi-auto',
		},
		{
			id: 'starbase', name: 'Starbase Boca Chica',
			lat: 25.9972, lng: -97.1571, country: 'USA',
			annualOpCostM: 380, launchCapacityKg: 150000, launchCadence: 48,
			fuelCapacityT: 5000, fuelTypes: 'LOX/LCH₄',
			dvLEO100: 9400, dvMinInclination: 9150, dvLunarTransfer: 12350, dvPolar: 9750,
			weatherReliability: 0.84, padRefurb: 'automated',
		},
	];

	const refurbLabels: Record<PadRefurb, string> = {
		'manual': 'Manual',
		'semi-auto': 'Semi-Automatic',
		'automated': 'Automated',
	};

	function formatKg(kg: number): string {
		if (kg >= 1000000) return (kg / 1000000).toFixed(1) + ' Mt';
		if (kg >= 1000) return (kg / 1000).toFixed(0) + ' t';
		return kg + ' kg';
	}

	let mapContainer: HTMLDivElement;
	let map: L.Map;
	let leaflet: typeof L;
	let markers: L.Marker[] = [];
	let orbitLayers: L.Polyline[] = [];
	let mapReady = $state(false);

	// Visibility checkboxes
	let showPlannedMissions = $state(true);
	let showLaunchSites = $state(true);

	// Detail modal state
	let detailSite = $state<LaunchComplex | null>(null);
	let detailProfile = $derived<LaunchComplexProfile | null>(
		detailSite ? (launchComplexProfiles[detailSite.id] ?? null) : null
	);

	function openDetails(siteId: string) {
		const site = complexes.find(s => s.id === siteId);
		if (site) detailSite = site;
	}

	function formatMt(mt: number): string {
		if (mt >= 1) return mt.toFixed(1) + ' Mt';
		if (mt >= 0.001) return (mt * 1000).toFixed(0) + ' t';
		return (mt * 1000000).toFixed(0) + ' kg';
	}

	function isClaimed(id: string): boolean {
		let result = false;
		claimedComplexes.subscribe(s => { result = s.has(id); })();
		return result;
	}

	function claimComplex(id: string) {
		claimedComplexes.update(s => { s.add(id); return new Set(s); });
		refreshPopups();
	}

	function buildPopupHtml(site: LaunchComplex): string {
		const claimed = isClaimed(site.id);
		const claimedBadge = claimed
			? '<span class="badge-claimed">CLAIMED</span>'
			: '';
		const claimBtn = claimed
			? ''
			: `<button class="popup-btn popup-btn-claim" data-site-id="${site.id}" title="Claim this launch complex for the VenMars project">🏴 Claim</button>`;
		const upgradeDis = claimed ? '' : 'disabled';
		const decommDis = claimed ? '' : 'disabled';

		return `
			<div class="site-popup-v2">
				<div class="popup-header">
					<div class="popup-name">${site.name} ${claimedBadge}</div>
					<div class="popup-country">${site.country}</div>
				</div>
				<div class="popup-grid">
					<span class="pg-label">Location</span>
					<span class="pg-value pg-mono">${site.lat.toFixed(4)}°N, ${site.lng.toFixed(4)}°${site.lng >= 0 ? 'E' : 'W'}</span>

					<span class="pg-label">Operating Cost</span>
					<span class="pg-value pg-cost">$${site.annualOpCostM}M/yr</span>

					<span class="pg-label">Launch Capacity</span>
					<span class="pg-value">${formatKg(site.launchCapacityKg)} to LEO</span>

					<span class="pg-label">Launch Cadence</span>
					<span class="pg-value">${site.launchCadence} launches/yr</span>

					<span class="pg-label">Fuel Storage</span>
					<span class="pg-value">${site.fuelCapacityT.toLocaleString()} t — ${site.fuelTypes}</span>

					<span class="pg-label">ΔV to LEO (100 km)</span>
					<span class="pg-value pg-mono">${site.dvLEO100.toLocaleString()} m/s</span>

					<span class="pg-label">ΔV Min Inclination</span>
					<span class="pg-value pg-mono">${site.dvMinInclination.toLocaleString()} m/s</span>

					<span class="pg-label">ΔV Lunar Transfer</span>
					<span class="pg-value pg-mono">${site.dvLunarTransfer.toLocaleString()} m/s</span>

					<span class="pg-label">ΔV Polar Orbit</span>
					<span class="pg-value pg-mono">${site.dvPolar.toLocaleString()} m/s</span>

					<span class="pg-label">Weather Reliability</span>
					<span class="pg-value">${(site.weatherReliability * 100).toFixed(0)}%</span>

					<span class="pg-label">Pad Refurbishment</span>
					<span class="pg-value">${refurbLabels[site.padRefurb]}</span>
				</div>
				<div class="popup-actions">
					${claimBtn}
					<button class="popup-btn popup-btn-details" data-site-id="${site.id}">📋 Details</button>
					<button class="popup-btn popup-btn-upgrade" ${upgradeDis}>⬆ Upgrade</button>
					<button class="popup-btn popup-btn-decom" ${decommDis}>🗑 Decommission</button>
				</div>
			</div>
		`;
	}

	function refreshPopups() {
		for (let i = 0; i < markers.length; i++) {
			const site = complexes[i];
			const m = markers[i];
			m.setPopupContent(buildPopupHtml(site));
			// Update marker icon (claimed sites get a different color)
			const claimed = isClaimed(site.id);
			m.setIcon(leaflet.divIcon({
				className: 'launch-site-marker',
				html: `<div class="marker-dot ${claimed ? 'claimed' : ''}"></div><div class="marker-ring ${claimed ? 'claimed' : ''}"></div>`,
				iconSize: [20, 20],
				iconAnchor: [10, 10],
				popupAnchor: [0, -14],
			}));
		}
	}

	// ── Ground-track computation ──────────────────────────
	// Compute the sinusoidal ground track for an inclined orbit.
	// Returns an array of polyline segments (split at ±180° wrap).
	function groundTrack(
		inclinationDeg: number,
		ascendingNodeLng: number,
		points: number = 360,
	): [number, number][][] {
		const inc = inclinationDeg * Math.PI / 180;
		const segments: [number, number][][] = [];
		let current: [number, number][] = [];

		for (let k = 0; k <= points; k++) {
			const u = (k / points) * 2 * Math.PI; // argument of latitude (0..2π)
			const lat = Math.asin(Math.sin(inc) * Math.sin(u)) * 180 / Math.PI;
			let lng = ascendingNodeLng + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) * 180 / Math.PI;
			// Wrap longitude to -180..180
			lng = ((lng + 540) % 360) - 180;

			if (current.length > 0) {
				const prevLng = current[current.length - 1][1];
				if (Math.abs(lng - prevLng) > 180) {
					// Date-line crossing: end this segment, start new one
					segments.push(current);
					current = [];
				}
			}
			current.push([lat, lng]);
		}
		if (current.length > 1) segments.push(current);
		return segments;
	}

	function drawOrbits(missions: ScheduledMissionMapData[]) {
		if (!map || !leaflet) return;
		// Clear existing orbit lines
		for (const layer of orbitLayers) layer.remove();
		orbitLayers = [];
		if (!showPlannedMissions) return;

		for (const m of missions) {
			// Find launch site longitude for ascending node
			const site = complexes.find(c => c.name === m.site);
			const ascNode = site ? site.lng : 0;
			const segments = groundTrack(m.inclination, ascNode);
			for (const seg of segments) {
				const line = leaflet.polyline(seg, {
					color: '#eab308',
					weight: 1.5,
					dashArray: '6 4',
					opacity: 0.7,
				}).addTo(map);
				line.bindTooltip(m.name, { sticky: true, className: 'orbit-tooltip' });
				orbitLayers.push(line);
			}
		}
	}

	function toggleMarkers(show: boolean) {
		if (!map) return;
		for (const m of markers) {
			if (show) m.addTo(map);
			else m.remove();
		}
	}

	// Reactive: redraw orbits when store changes or visibility toggles
	$effect(() => {
		if (!mapReady) return;
		const missions = $scheduledMissionsStore;
		drawOrbits(showPlannedMissions ? missions : []);
	});

	$effect(() => {
		if (!mapReady) return;
		toggleMarkers(showLaunchSites);
	});

	onMount(async () => {
		leaflet = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		map = leaflet.map(mapContainer, {
			center: [20, 0],
			zoom: 2,
			minZoom: 2,
			maxZoom: 10,
			zoomControl: false,
			attributionControl: false,
			maxBounds: [[-90, -180], [90, 180]],
			maxBoundsViscosity: 1.0,
		});

		leaflet.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: 19,
		}).addTo(map);

		leaflet.control.zoom({ position: 'topright' }).addTo(map);

		leaflet.control.attribution({ position: 'bottomright', prefix: false })
			.addAttribution('&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &middot; Sources: Esri, Maxar, Earthstar Geographics')
			.addTo(map);

		for (const site of complexes) {
			const claimed = isClaimed(site.id);
			const siteIcon = leaflet.divIcon({
				className: 'launch-site-marker',
				html: `<div class="marker-dot ${claimed ? 'claimed' : ''}"></div><div class="marker-ring ${claimed ? 'claimed' : ''}"></div>`,
				iconSize: [20, 20],
				iconAnchor: [10, 10],
				popupAnchor: [0, -14],
			});

			const marker = leaflet.marker([site.lat, site.lng], { icon: siteIcon }).addTo(map);
			marker.bindPopup(buildPopupHtml(site), { maxWidth: 360, minWidth: 300 });
			marker.bindTooltip(site.name, {
				direction: 'top',
				offset: [0, -12],
				className: 'site-tooltip',
			});
			markers.push(marker);
		}

		// Delegate click events from popup buttons
		map.on('popupopen', () => {
			const claimBtns = document.querySelectorAll('.popup-btn-claim');
			claimBtns.forEach(btn => {
				btn.addEventListener('click', (e) => {
					const id = (e.currentTarget as HTMLElement).dataset.siteId;
					if (id) claimComplex(id);
				});
			});
			const detailBtns = document.querySelectorAll('.popup-btn-details');
			detailBtns.forEach(btn => {
				btn.addEventListener('click', (e) => {
					const id = (e.currentTarget as HTMLElement).dataset.siteId;
					if (id) openDetails(id);
				});
			});
		});

		mapReady = true;

		return () => {
			map.remove();
		};
	});
</script>

<div class="earth-map-wrapper">
	<div class="map-header">
		<h3 class="text-lg font-semibold">Earth Surface Map</h3>
		<span class="text-xs text-[var(--color-text-dim)]">
			{complexes.length} launch complexes
		</span>
	</div>

	<div class="map-container" bind:this={mapContainer}></div>

	<!-- Visibility controls -->
	<div class="map-controls mt-2">
		<label class="map-toggle">
			<input type="checkbox" bind:checked={showLaunchSites} />
			<span>Launch Sites</span>
		</label>
		<label class="map-toggle">
			<input type="checkbox" bind:checked={showPlannedMissions} />
			<span class="planned-dot"></span>
			<span>Planned Missions</span>
		</label>
	</div>

	<!-- Legend -->
	<div class="flex gap-4 mt-3 text-xs text-[var(--color-text-dim)]">
		<span class="flex items-center gap-1.5">
			<span class="legend-dot"></span> Launch Site
		</span>
		<span class="flex items-center gap-1.5">
			<span class="w-3 h-3 rounded bg-green-500/50"></span> Mission Control
		</span>
		<span class="text-[var(--color-text-dim)]/50 ml-auto">Scroll to zoom · Drag to pan</span>
	</div>
</div>

{#if detailSite && detailProfile}
	{@const claimed = isClaimed(detailSite.id)}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="detail-overlay" onclick={() => detailSite = null}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="detail-modal" onclick={(e) => e.stopPropagation()}>
			<div class="dm-header">
				<span class="dm-title">{detailSite.name}</span>
				{#if claimed}
					<span class="dm-badge-claimed">CLAIMED</span>
				{/if}
				<span class="dm-country">{detailSite.country}</span>
				<button class="dm-close" onclick={() => detailSite = null}>✕</button>
			</div>

			<div class="dm-grid">
				<!-- TOP LEFT: Facility Info -->
				<div class="dm-cell">
					<h4 class="dm-cell-title">Facility Specifications</h4>
					<div class="dm-kv-grid">
						<span class="dm-label">Location</span>
						<span class="dm-value dm-mono">{detailSite.lat.toFixed(4)}°N, {Math.abs(detailSite.lng).toFixed(4)}°{detailSite.lng >= 0 ? 'E' : 'W'}</span>

						<span class="dm-label">Launch Capacity</span>
						<span class="dm-value">{formatKg(detailSite.launchCapacityKg)} to LEO</span>

						<span class="dm-label">Launch Cadence</span>
						<span class="dm-value">{detailSite.launchCadence} launches/yr</span>

						<span class="dm-label">Fuel Storage</span>
						<span class="dm-value">{detailSite.fuelCapacityT.toLocaleString()} t</span>

						<span class="dm-label">Fuel Types</span>
						<span class="dm-value">{detailSite.fuelTypes}</span>

						<span class="dm-label">ΔV to LEO (100 km)</span>
						<span class="dm-value dm-mono">{detailSite.dvLEO100.toLocaleString()} m/s</span>

						<span class="dm-label">ΔV Min Inclination</span>
						<span class="dm-value dm-mono">{detailSite.dvMinInclination.toLocaleString()} m/s</span>

						<span class="dm-label">ΔV Lunar Transfer</span>
						<span class="dm-value dm-mono">{detailSite.dvLunarTransfer.toLocaleString()} m/s</span>

						<span class="dm-label">ΔV Polar Orbit</span>
						<span class="dm-value dm-mono">{detailSite.dvPolar.toLocaleString()} m/s</span>

						<span class="dm-label">Weather Reliability</span>
						<span class="dm-value">{(detailSite.weatherReliability * 100).toFixed(0)}%</span>

						<span class="dm-label">Pad Refurbishment</span>
						<span class="dm-value">{refurbLabels[detailSite.padRefurb]}</span>
					</div>
				</div>

				<!-- TOP RIGHT: Operational State Costs -->
				<div class="dm-cell">
					<h4 class="dm-cell-title">Operational Costs by State</h4>
					<div class="dm-states">
						<!-- Active -->
						<div class="dm-state-card dm-state-active">
							<div class="dm-state-header">
								<span class="dm-state-icon">🟢</span>
								<span class="dm-state-name">Active</span>
								<span class="dm-state-desc">Regularly scheduled launches</span>
							</div>
							<div class="dm-state-costs">
								<div class="dm-cost-row">
									<span class="dm-cost-label">Annual Cost</span>
									<span class="dm-cost-val dm-cost-money">${detailProfile.active.costM}M/yr</span>
								</div>
								<div class="dm-cost-row">
									<span class="dm-cost-label">Electricity</span>
									<span class="dm-cost-val dm-cost-energy">{detailProfile.active.electricityTWh} TWh/yr</span>
								</div>
								{#each detailProfile.active.materials as mat}
									<div class="dm-cost-row">
										<span class="dm-cost-label">{mat.material}</span>
										<span class="dm-cost-val">{formatMt(mat.amountMt)}/yr</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Idle -->
						<div class="dm-state-card dm-state-idle">
							<div class="dm-state-header">
								<span class="dm-state-icon">🟡</span>
								<span class="dm-state-name">Idle</span>
								<span class="dm-state-desc">No scheduled launches</span>
							</div>
							<div class="dm-state-costs">
								<div class="dm-cost-row">
									<span class="dm-cost-label">Annual Cost</span>
									<span class="dm-cost-val dm-cost-money">${detailProfile.idle.costM}M/yr</span>
								</div>
								<div class="dm-cost-row">
									<span class="dm-cost-label">Electricity</span>
									<span class="dm-cost-val dm-cost-energy">{detailProfile.idle.electricityTWh} TWh/yr</span>
								</div>
								{#each detailProfile.idle.materials as mat}
									<div class="dm-cost-row">
										<span class="dm-cost-label">{mat.material}</span>
										<span class="dm-cost-val">{formatMt(mat.amountMt)}/yr</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Decommissioned -->
						<div class="dm-state-card dm-state-decom">
							<div class="dm-state-header">
								<span class="dm-state-icon">🔴</span>
								<span class="dm-state-name">Decommissioned</span>
								<span class="dm-state-desc">Closed up, can be re-opened</span>
							</div>
							<div class="dm-state-costs">
								<div class="dm-cost-row">
									<span class="dm-cost-label">Annual Cost</span>
									<span class="dm-cost-val dm-cost-money">${detailProfile.decommissioned.costM}M/yr</span>
								</div>
								<div class="dm-cost-row">
									<span class="dm-cost-label">Electricity</span>
									<span class="dm-cost-val dm-cost-energy">{detailProfile.decommissioned.electricityTWh} TWh/yr</span>
								</div>
								{#if detailProfile.decommissioned.materials.length === 0}
									<div class="dm-cost-row">
										<span class="dm-cost-label dm-cost-none">No material upkeep</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Recycled -->
						<div class="dm-state-card dm-state-recycled">
							<div class="dm-state-header">
								<span class="dm-state-icon">♻️</span>
								<span class="dm-state-name">Recycled</span>
								<span class="dm-state-desc">Dismantled &amp; sold — you recover:</span>
							</div>
							<div class="dm-state-costs">
								<div class="dm-cost-row">
									<span class="dm-cost-label">Cash Recovery</span>
									<span class="dm-cost-val dm-cost-recovery">+${detailProfile.recycled.recoveryM}M</span>
								</div>
								{#each detailProfile.recycled.materials as mat}
									<div class="dm-cost-row">
										<span class="dm-cost-label">{mat.material}</span>
										<span class="dm-cost-val dm-cost-recovery">+{formatMt(mat.amountMt)}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- BOTTOM LEFT: Construction Materials -->
				<div class="dm-cell">
					<h4 class="dm-cell-title">Construction Requirements</h4>
					<p class="dm-cell-note">One-time materials to build this complex from scratch</p>
					<div class="dm-mat-list">
						{#each detailProfile.construction as mat}
							<div class="dm-mat-row">
								<span class="dm-mat-name">{mat.material}</span>
								<span class="dm-mat-amount">{formatMt(mat.amountMt)}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- BOTTOM RIGHT: placeholder for future content -->
				<div class="dm-cell dm-cell-empty">
					<h4 class="dm-cell-title">Launch History</h4>
					<p class="dm-cell-note">Launch schedule and mission history will appear here once operations begin.</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.earth-map-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.map-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.map-container {
		flex: 1;
		min-height: 400px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		overflow: hidden;
		background: #0a0e17;
	}

	.legend-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(239, 68, 68, 0.8);
		border: 2px solid rgba(239, 68, 68, 0.4);
		box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
	}

	/* Marker styles */
	:global(.launch-site-marker) {
		background: none !important;
		border: none !important;
	}

	:global(.marker-dot) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		background: #ef4444;
		border-radius: 50%;
		box-shadow: 0 0 10px rgba(239, 68, 68, 0.9);
		z-index: 2;
	}

	:global(.marker-ring) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 22px;
		height: 22px;
		margin: -11px 0 0 -11px;
		border: 2px solid rgba(239, 68, 68, 0.6);
		border-radius: 50%;
		animation: pulse-ring 2s ease-out infinite;
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(0.8);
			opacity: 1;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	/* Popup styles */
	:global(.leaflet-popup-content-wrapper) {
		background: #1a2234 !important;
		border: 1px solid #2d3a4f !important;
		border-radius: 0.5rem !important;
		color: #e2e8f0 !important;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
	}

	:global(.leaflet-popup-content) {
		margin: 0 !important;
		min-width: 280px;
	}

	:global(.leaflet-popup-tip) {
		background: #1a2234 !important;
		border: 1px solid #2d3a4f !important;
	}

	:global(.leaflet-popup-close-button) {
		color: #94a3b8 !important;
	}

	/* V2 popup layout */
	:global(.site-popup-v2) {
		padding: 0.65rem 0.75rem;
		font-size: 0.72rem;
	}

	:global(.popup-header) {
		margin-bottom: 0.5rem;
		border-bottom: 1px solid #2d3a4f;
		padding-bottom: 0.4rem;
	}

	:global(.popup-name) {
		font-weight: 700;
		font-size: 0.85rem;
		color: #3b82f6;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	:global(.badge-claimed) {
		font-size: 0.55rem;
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		background: rgba(74, 222, 128, 0.2);
		color: #4ade80;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	:global(.popup-country) {
		font-size: 0.7rem;
		color: #94a3b8;
		margin-top: 0.15rem;
	}

	:global(.popup-grid) {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.2rem 0.6rem;
		margin-bottom: 0.6rem;
	}

	:global(.pg-label) {
		font-size: 0.62rem;
		font-weight: 600;
		color: #94a3b8;
		white-space: nowrap;
	}

	:global(.pg-value) {
		font-size: 0.65rem;
		color: #e2e8f0;
	}

	:global(.pg-mono) {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	:global(.pg-cost) {
		color: #fbbf24;
		font-weight: 600;
	}

	/* Popup buttons */
	:global(.popup-actions) {
		display: flex;
		gap: 0.35rem;
		border-top: 1px solid #2d3a4f;
		padding-top: 0.5rem;
	}

	:global(.popup-btn) {
		padding: 0.25rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid #2d3a4f;
		background: transparent;
		color: #94a3b8;
		font-size: 0.62rem;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	:global(.popup-btn:hover:not(:disabled)) {
		background: #2d3a4f;
		color: #e2e8f0;
	}

	:global(.popup-btn:disabled) {
		opacity: 0.3;
		cursor: not-allowed;
	}

	:global(.popup-btn-claim) {
		border-color: rgba(74, 222, 128, 0.4);
		color: #4ade80;
	}

	:global(.popup-btn-claim:hover) {
		background: rgba(74, 222, 128, 0.15) !important;
	}

	:global(.popup-btn-details) {
		border-color: rgba(96, 165, 250, 0.4);
		color: #60a5fa;
	}

	:global(.popup-btn-details:hover) {
		background: rgba(96, 165, 250, 0.15) !important;
	}

	:global(.popup-btn-upgrade) {
		border-color: rgba(96, 165, 250, 0.4);
		color: #60a5fa;
	}

	:global(.popup-btn-upgrade:hover:not(:disabled)) {
		background: rgba(96, 165, 250, 0.15) !important;
	}

	:global(.popup-btn-decom) {
		border-color: rgba(239, 68, 68, 0.4);
		color: #ef4444;
	}

	:global(.popup-btn-decom:hover:not(:disabled)) {
		background: rgba(239, 68, 68, 0.15) !important;
	}

	/* Marker — claimed turns green */
	:global(.marker-dot.claimed) {
		background: #4ade80 !important;
		box-shadow: 0 0 10px rgba(74, 222, 128, 0.9) !important;
	}

	:global(.marker-ring.claimed) {
		border-color: rgba(74, 222, 128, 0.6) !important;
	}

	/* Tooltip styles */
	:global(.site-tooltip) {
		background: #1a2234 !important;
		border: 1px solid #2d3a4f !important;
		color: #e2e8f0 !important;
		font-size: 0.7rem !important;
		padding: 3px 8px !important;
		border-radius: 4px !important;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
	}

	:global(.site-tooltip::before) {
		border-top-color: #2d3a4f !important;
	}

	/* Zoom control styles */
	:global(.leaflet-control-zoom a) {
		background: #1a2234 !important;
		color: #e2e8f0 !important;
		border-color: #2d3a4f !important;
	}

	:global(.leaflet-control-zoom a:hover) {
		background: #2d3a4f !important;
	}

	/* ── Details modal ── */
	.detail-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
	}

	.detail-modal {
		background: var(--color-bg-card, #1a2234);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		width: 820px;
		max-width: 95vw;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
	}

	.dm-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.dm-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #3b82f6;
	}

	.dm-badge-claimed {
		font-size: 0.6rem;
		padding: 0.1rem 0.4rem;
		border-radius: 0.2rem;
		background: rgba(74, 222, 128, 0.2);
		color: #4ade80;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.dm-country {
		font-size: 0.75rem;
		color: var(--color-text-dim);
		flex: 1;
	}

	.dm-close {
		background: transparent;
		border: none;
		color: var(--color-text-dim);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
	}
	.dm-close:hover { background: var(--color-border); color: var(--color-text); }

	.dm-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--color-border);
	}

	.dm-cell {
		background: var(--color-bg-card, #1a2234);
		padding: 1rem 1.25rem;
	}

	.dm-cell-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.dm-cell-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.6rem;
	}

	.dm-cell-note {
		font-size: 0.65rem;
		color: var(--color-text-dim);
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	/* Key-value grid in top-left */
	.dm-kv-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 0.75rem;
	}

	.dm-label {
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--color-text-dim);
		white-space: nowrap;
	}

	.dm-value {
		font-size: 0.7rem;
		color: var(--color-text);
	}

	.dm-mono {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	/* State cards in top-right */
	.dm-states {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.dm-state-card {
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		padding: 0.5rem 0.65rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.dm-state-header {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.35rem;
		flex-wrap: wrap;
	}

	.dm-state-icon { font-size: 0.75rem; }

	.dm-state-name {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.dm-state-desc {
		font-size: 0.58rem;
		color: var(--color-text-dim);
		margin-left: auto;
	}

	.dm-state-costs {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-left: 1.1rem;
	}

	.dm-cost-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.dm-cost-label {
		font-size: 0.65rem;
		color: var(--color-text-dim);
	}

	.dm-cost-none {
		font-style: italic;
		opacity: 0.6;
	}

	.dm-cost-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.dm-cost-money { color: #fbbf24; }
	.dm-cost-energy { color: #facc15; }
	.dm-cost-recovery { color: #4ade80; }

	.dm-state-active { border-color: rgba(74, 222, 128, 0.25); }
	.dm-state-idle { border-color: rgba(250, 204, 21, 0.25); }
	.dm-state-decom { border-color: rgba(239, 68, 68, 0.2); }
	.dm-state-recycled { border-color: rgba(96, 165, 250, 0.2); }

	/* Construction material list */
	.dm-mat-list {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.dm-mat-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.dm-mat-name {
		font-size: 0.7rem;
		color: var(--color-text);
	}

	.dm-mat-amount {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		font-weight: 600;
		color: #60a5fa;
	}

	/* ── Map controls ─────────────────────────── */
	.map-controls {
		display: flex; gap: 1rem; align-items: center;
	}
	.map-toggle {
		display: flex; align-items: center; gap: 0.35rem;
		font-size: 0.7rem; color: var(--color-text-dim);
		cursor: pointer;
	}
	.map-toggle input[type="checkbox"] {
		accent-color: #6366f1;
		width: 0.85rem; height: 0.85rem;
		cursor: pointer;
	}
	.planned-dot {
		width: 10px; height: 2px;
		background: #eab308;
		border-top: 1px dashed #eab308;
	}

	:global(.orbit-tooltip) {
		background: rgba(0,0,0,0.75) !important;
		color: #eab308 !important;
		border: 1px solid rgba(234, 179, 8, 0.3) !important;
		font-size: 0.65rem !important;
		padding: 2px 6px !important;
	}
</style>
