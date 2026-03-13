<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';

	interface LunarSite {
		name: string;
		lat: number;
		lng: number;
		type: 'mass-driver' | 'mining' | 'construction';
		desc: string;
	}

	const lunarSites: LunarSite[] = [
		{ name: 'Shackleton Crater Base', lat: -89.9, lng: 0.0, type: 'mining', desc: 'South pole ice mining & processing' },
		{ name: 'Mare Tranquillitatis Hub', lat: 8.5, lng: 31.4, type: 'construction', desc: 'Primary construction & assembly' },
		{ name: 'Oceanus Procellarum Mass Driver', lat: 23.5, lng: -57.5, type: 'mass-driver', desc: 'Electromagnetic launch rail — 4 km' },
		{ name: 'Aristarchus Mining Complex', lat: 23.7, lng: -47.4, type: 'mining', desc: 'Rare-earth & titanium extraction' },
		{ name: 'Tycho Outpost', lat: -43.3, lng: -11.2, type: 'construction', desc: 'Southern hemisphere relay & fabrication' },
		{ name: 'Mare Imbrium Array', lat: 32.8, lng: -15.6, type: 'mass-driver', desc: 'Secondary mass driver — 2.5 km' },
		{ name: 'Copernicus Station', lat: 9.6, lng: -20.1, type: 'mining', desc: 'Central highlands ilmenite mining' },
		{ name: 'Peary Crater North Base', lat: 88.6, lng: 33.0, type: 'mining', desc: 'North pole ice reserves & solar farm' },
	];

	const siteColors: Record<string, string> = {
		'mass-driver': '#06b6d4',   // cyan
		'mining': '#f59e0b',        // amber
		'construction': '#22c55e',  // green
	};

	let mapContainer: HTMLDivElement;
	let map: L.Map;

	onMount(async () => {
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		map = L.map(mapContainer, {
			center: [0, 0],
			zoom: 2,
			minZoom: 1,
			maxZoom: 7,
			zoomControl: false,
			attributionControl: false,
			maxBounds: [[-90, -180], [90, 180]],
			maxBoundsViscosity: 1.0,
		});

		// NASA Moon Trek LROC WAC mosaic tile layer (hi-res)
		L.tileLayer('https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm/{z}/{y}/{x}.jpg', {
			maxZoom: 7,
			tms: true,
			noWrap: true,
		}).addTo(map);

		// Zoom controls top-right
		L.control.zoom({ position: 'topright' }).addTo(map);

		// Attribution
		L.control.attribution({ position: 'bottomright', prefix: false })
			.addAttribution('NASA/GSFC/ASU &middot; <a href="https://trek.nasa.gov" target="_blank" rel="noopener">Moon Trek</a> &middot; LRO WAC Mosaic')
			.addTo(map);

		// Place site markers
		for (const site of lunarSites) {
			const color = siteColors[site.type];
			const icon = L.divIcon({
				className: 'lunar-site-marker',
				html: `<div class="lunar-dot" style="background:${color};box-shadow:0 0 10px ${color}"></div>
				       <div class="lunar-ring" style="border-color:${color}"></div>`,
				iconSize: [20, 20],
				iconAnchor: [10, 10],
				popupAnchor: [0, -14],
			});

			const marker = L.marker([site.lat, site.lng], { icon }).addTo(map);
			const typeLabel = site.type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
			marker.bindPopup(`
				<div class="lunar-popup">
					<div class="lunar-site-name" style="color:${color}">${site.name}</div>
					<div class="lunar-site-type">${typeLabel}</div>
					<div class="lunar-site-desc">${site.desc}</div>
					<div class="lunar-site-coords">${site.lat.toFixed(2)}°, ${site.lng.toFixed(2)}°</div>
				</div>
			`);
			marker.bindTooltip(site.name, {
				direction: 'top',
				offset: [0, -12],
				className: 'lunar-tooltip',
			});
		}

		return () => {
			map.remove();
		};
	});
</script>

<div class="moon-map-wrapper">
	<div class="map-header">
		<h3 class="text-lg font-semibold">Lunar Surface Map</h3>
		<span class="text-xs text-[var(--color-text-dim)]">
			{lunarSites.length} active sites &middot; LRO WAC Mosaic
		</span>
	</div>

	<div class="map-container" bind:this={mapContainer}></div>

	<!-- Legend -->
	<div class="flex gap-4 mt-3 text-xs text-[var(--color-text-dim)]">
		<span class="flex items-center gap-1.5">
			<span class="legend-dot" style="background:rgba(6,182,212,0.8);border-color:rgba(6,182,212,0.4);box-shadow:0 0 6px rgba(6,182,212,0.5)"></span> Mass Driver
		</span>
		<span class="flex items-center gap-1.5">
			<span class="legend-dot" style="background:rgba(245,158,11,0.8);border-color:rgba(245,158,11,0.4);box-shadow:0 0 6px rgba(245,158,11,0.5)"></span> Mining Zone
		</span>
		<span class="flex items-center gap-1.5">
			<span class="legend-dot" style="background:rgba(34,197,94,0.8);border-color:rgba(34,197,94,0.4);box-shadow:0 0 6px rgba(34,197,94,0.5)"></span> Construction
		</span>
		<span class="text-[var(--color-text-dim)]/50 ml-auto">Scroll to zoom · Drag to pan</span>
	</div>
</div>

<style>
	.moon-map-wrapper {
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
		background: #0a0a0f;
	}

	.legend-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid;
	}

	/* Marker styles */
	:global(.lunar-site-marker) {
		background: none !important;
		border: none !important;
	}

	:global(.lunar-dot) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		border-radius: 50%;
		z-index: 2;
	}

	:global(.lunar-ring) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 22px;
		height: 22px;
		margin: -11px 0 0 -11px;
		border: 2px solid;
		border-radius: 50%;
		animation: lunar-pulse 2s ease-out infinite;
	}

	@keyframes lunar-pulse {
		0% {
			transform: scale(0.8);
			opacity: 1;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	/* Popup styles — scoped to moon to avoid conflicts with EarthMap */
	:global(.lunar-popup .lunar-site-name) {
		font-weight: 600;
		font-size: 0.85rem;
		margin-bottom: 4px;
	}

	:global(.lunar-popup .lunar-site-type) {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
		margin-bottom: 4px;
	}

	:global(.lunar-popup .lunar-site-desc) {
		font-size: 0.75rem;
		color: #cbd5e1;
		margin-bottom: 4px;
	}

	:global(.lunar-popup .lunar-site-coords) {
		font-size: 0.65rem;
		color: #64748b;
		font-family: monospace;
	}

	:global(.lunar-tooltip) {
		background: #1a2234 !important;
		border: 1px solid #2d3a4f !important;
		color: #e2e8f0 !important;
		border-radius: 4px !important;
		padding: 4px 8px !important;
		font-size: 0.75rem !important;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
	}

	:global(.lunar-tooltip::before) {
		border-top-color: #2d3a4f !important;
	}
</style>
