<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';

	interface LaunchSite {
		name: string;
		lat: number;
		lng: number;
		country: string;
		launches: number;
	}

	// Top 10 busiest launch sites (by historical + current launch count)
	const launchSites: LaunchSite[] = [
		{ name: 'Kennedy Space Center (LC-39A)', lat: 28.5731, lng: -80.6490, country: 'USA', launches: 240 },
		{ name: 'Cape Canaveral SFS (SLC-40)', lat: 28.5622, lng: -80.5771, country: 'USA', launches: 230 },
		{ name: 'Baikonur Cosmodrome', lat: 45.9646, lng: 63.3052, country: 'Kazakhstan', launches: 1500 },
		{ name: 'Vandenberg SFB', lat: 34.7420, lng: -120.5724, country: 'USA', launches: 100 },
		{ name: 'Xichang Satellite Launch Center', lat: 28.2468, lng: 102.0268, country: 'China', launches: 180 },
		{ name: 'Wenchang Space Launch Site', lat: 19.6145, lng: 110.9510, country: 'China', launches: 60 },
		{ name: 'Jiuquan Satellite Launch Center', lat: 40.9606, lng: 100.2910, country: 'China', launches: 150 },
		{ name: 'Satish Dhawan Space Centre', lat: 13.7199, lng: 80.2304, country: 'India', launches: 90 },
		{ name: 'Guiana Space Centre', lat: 5.2322, lng: -52.7693, country: 'French Guiana', launches: 300 },
		{ name: 'Starbase Boca Chica', lat: 25.9972, lng: -97.1571, country: 'USA', launches: 30 },
	];

	let mapContainer: HTMLDivElement;
	let map: L.Map;

	onMount(async () => {
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		map = L.map(mapContainer, {
			center: [20, 0],
			zoom: 2,
			minZoom: 2,
			maxZoom: 10,
			zoomControl: false,
			attributionControl: false,
			maxBounds: [[-90, -180], [90, 180]],
			maxBoundsViscosity: 1.0,
		});

		// Satellite imagery tile layer (rich & colorful)
		L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: 19,
		}).addTo(map);

		// Zoom controls top-right
		L.control.zoom({ position: 'topright' }).addTo(map);

		// Attribution bottom-right
		L.control.attribution({ position: 'bottomright', prefix: false })
			.addAttribution('&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &middot; Sources: Esri, Maxar, Earthstar Geographics')
			.addTo(map);

		// Custom launch site icon
		const siteIcon = L.divIcon({
			className: 'launch-site-marker',
			html: `<div class="marker-dot"></div><div class="marker-ring"></div>`,
			iconSize: [20, 20],
			iconAnchor: [10, 10],
			popupAnchor: [0, -14],
		});

		// Place launch site markers
		for (const site of launchSites) {
			const marker = L.marker([site.lat, site.lng], { icon: siteIcon }).addTo(map);
			marker.bindPopup(`
				<div class="site-popup">
					<div class="site-name">${site.name}</div>
					<div class="site-detail">${site.country}</div>
					<div class="site-detail">~${site.launches} launches</div>
					<div class="site-coords">${site.lat.toFixed(2)}°, ${site.lng.toFixed(2)}°</div>
				</div>
			`);
			marker.bindTooltip(site.name, {
				direction: 'top',
				offset: [0, -12],
				className: 'site-tooltip',
			});
		}

		return () => {
			map.remove();
		};
	});
</script>

<div class="earth-map-wrapper">
	<div class="map-header">
		<h3 class="text-lg font-semibold">Earth Surface Map</h3>
		<span class="text-xs text-[var(--color-text-dim)]">
			{launchSites.length} active launch sites
		</span>
	</div>

	<div class="map-container" bind:this={mapContainer}></div>

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

	:global(.leaflet-popup-tip) {
		background: #1a2234 !important;
		border: 1px solid #2d3a4f !important;
	}

	:global(.leaflet-popup-close-button) {
		color: #94a3b8 !important;
	}

	:global(.site-popup .site-name) {
		font-weight: 600;
		font-size: 0.85rem;
		color: #3b82f6;
		margin-bottom: 4px;
	}

	:global(.site-popup .site-detail) {
		font-size: 0.75rem;
		color: #e2e8f0;
	}

	:global(.site-popup .site-coords) {
		font-size: 0.65rem;
		color: #64748b;
		margin-top: 4px;
		font-family: monospace;
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
</style>
