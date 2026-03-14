<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type L from 'leaflet';

	type Projection = 'equirectangular' | 'polar' | 'spherical';
	let activeProjection = $state<Projection>('equirectangular');

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
		'mass-driver': '#06b6d4',
		'mining': '#f59e0b',
		'construction': '#22c55e',
	};

	// --- Equirectangular (Leaflet) ---
	let mapContainer: HTMLDivElement;
	let leafletMap: L.Map | null = null;

	async function initLeaflet() {
		if (leafletMap) return;
		await tick();
		if (!mapContainer) return;

		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		leafletMap = L.map(mapContainer, {
			crs: L.CRS.EPSG4326,
			center: [0, 0],
			zoom: 1,
			minZoom: 0,
			maxZoom: 7,
			zoomControl: false,
			attributionControl: false,
			maxBounds: [[-90, -180], [90, 180]],
			maxBoundsViscosity: 1.0,
		});

		L.tileLayer('https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm/{z}/{y}/{x}.jpg', {
			maxZoom: 7,
			tms: false,
			noWrap: true,
			bounds: [[-90, -180], [90, 180]],
		}).addTo(leafletMap);

		L.control.zoom({ position: 'topright' }).addTo(leafletMap);
		L.control.attribution({ position: 'bottomright', prefix: false })
			.addAttribution('NASA/GSFC/ASU &middot; <a href="https://trek.nasa.gov" target="_blank" rel="noopener">Moon Trek</a> &middot; LRO WAC Mosaic')
			.addTo(leafletMap);

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
			const marker = L.marker([site.lat, site.lng], { icon }).addTo(leafletMap);
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
	}

	function destroyLeaflet() {
		if (leafletMap) {
			leafletMap.remove();
			leafletMap = null;
		}
	}

	// --- Polar projection math ---
	function polarProject(lat: number, lng: number, isNorth: boolean, cx: number, cy: number, radius: number) {
		const DEG = Math.PI / 180;
		const r = isNorth
			? ((90 - lat) / 90) * radius
			: ((90 + lat) / 90) * radius;
		const theta = lng * DEG;
		const x = isNorth
			? cx + r * Math.sin(theta)
			: cx + r * Math.sin(theta);
		const y = isNorth
			? cy - r * Math.cos(theta)
			: cy + r * Math.cos(theta);
		return { x, y, r };
	}

	// --- Canvas polar rendering ---
	let northCanvas: HTMLCanvasElement;
	let southCanvas: HTMLCanvasElement;
	let polarWrap: HTMLDivElement;

	function loadImg(src: string): Promise<HTMLImageElement> {
		return new Promise(res => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => res(img);
			img.onerror = () => res(img);
			img.src = src;
		});
	}

	async function drawPolarMaps() {
		await tick();
		if (!northCanvas || !southCanvas || !polarWrap) return;

		// Size each circle to fill half the container width (minus gap)
		const containerW = polarWrap.clientWidth;
		const size = Math.min(Math.floor((containerW - 40) / 2), 540);

		for (const canvas of [northCanvas, southCanvas]) {
			canvas.width = size;
			canvas.height = size;
			canvas.style.width = size + 'px';
			canvas.style.height = size + 'px';
		}

		// Load zoom-1 tiles (2×1 grid per hemisphere = 4 tiles total) for better resolution
		const base = 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm';
		const tiles = await Promise.all([
			loadImg(`${base}/1/0/0.jpg`), // top-left
			loadImg(`${base}/1/0/1.jpg`), // top-right
			loadImg(`${base}/1/0/2.jpg`), // top-right2 (EPSG:4326 z1 = 4 cols × 2 rows)
			loadImg(`${base}/1/0/3.jpg`), // top-right3
			loadImg(`${base}/1/1/0.jpg`), // bottom-left
			loadImg(`${base}/1/1/1.jpg`), // bottom-right
			loadImg(`${base}/1/1/2.jpg`),
			loadImg(`${base}/1/1/3.jpg`),
		]);

		// Build equirectangular texture from tiles (4 cols × 2 rows)
		const tw = tiles[0].naturalWidth || 256;
		const texW = tw * 4, texH = tw * 2;
		const texCanvas = document.createElement('canvas');
		texCanvas.width = texW;
		texCanvas.height = texH;
		const texCtx = texCanvas.getContext('2d')!;
		// Row 0 (top = north)
		for (let c = 0; c < 4; c++) {
			if (tiles[c].naturalWidth) texCtx.drawImage(tiles[c], c * tw, 0, tw, tw);
		}
		// Row 1 (bottom = south)
		for (let c = 0; c < 4; c++) {
			if (tiles[4 + c].naturalWidth) texCtx.drawImage(tiles[4 + c], c * tw, tw, tw, tw);
		}
		const texData = texCtx.getImageData(0, 0, texW, texH);

		const cx = size / 2, cy = size / 2, radius = size / 2 - 6;

		for (const [canvas, isNorth] of [[northCanvas, true], [southCanvas, false]] as [HTMLCanvasElement, boolean][]) {
			const ctx = canvas.getContext('2d')!;

			// Render projected texture pixel by pixel at 1:1 canvas resolution
			const imgOut = ctx.createImageData(size, size);
			for (let py = 0; py < size; py++) {
				for (let px = 0; px < size; px++) {
					const dx = px - cx, dy = py - cy;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > radius) continue;

					const lat = isNorth
						? 90 - (dist / radius) * 90
						: -90 + (dist / radius) * 90;
					const lng = isNorth
						? Math.atan2(dx, -dy) * (180 / Math.PI)
						: Math.atan2(dx, dy) * (180 / Math.PI);

					const tx = ((Math.floor(((lng + 180) / 360) * texW) % texW) + texW) % texW;
					const ty = Math.min(Math.floor(((90 - lat) / 180) * texH), texH - 1);
					const ti = (ty * texW + tx) * 4;
					const oi = (py * size + px) * 4;
					imgOut.data[oi] = texData.data[ti];
					imgOut.data[oi + 1] = texData.data[ti + 1];
					imgOut.data[oi + 2] = texData.data[ti + 2];
					imgOut.data[oi + 3] = 255;
				}
			}
			ctx.putImageData(imgOut, 0, 0);

			// Circle border
			ctx.strokeStyle = 'rgba(255,255,255,0.15)';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.stroke();

			// Grid lines: latitude circles at 30° intervals
			ctx.strokeStyle = 'rgba(255,255,255,0.08)';
			ctx.lineWidth = 0.5;
			for (const latLine of [30, 60]) {
				const gridR = (latLine / 90) * radius;
				ctx.beginPath();
				ctx.arc(cx, cy, gridR, 0, Math.PI * 2);
				ctx.stroke();
			}

			// Longitude lines every 45°
			for (let deg = 0; deg < 360; deg += 45) {
				const rad = (deg * Math.PI) / 180;
				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.lineTo(cx + radius * Math.sin(rad), cy - radius * Math.cos(rad));
				ctx.stroke();
			}

			// Plot sites
			for (const site of lunarSites) {
				// Only show sites in the relevant hemisphere (with overlap at equator)
				if (isNorth && site.lat < -10) continue;
				if (!isNorth && site.lat > 10) continue;

				const pos = polarProject(site.lat, site.lng, isNorth, cx, cy, radius);
				if (pos.r > radius) continue;

				const color = siteColors[site.type];
				// Glow
				ctx.shadowColor = color;
				ctx.shadowBlur = 8;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;

				// Ring
				ctx.strokeStyle = color;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
				ctx.stroke();

				// Label
				ctx.fillStyle = '#e2e8f0';
				ctx.font = '9px sans-serif';
				ctx.textAlign = 'left';
				ctx.fillText(site.name, pos.x + 13, pos.y + 3);
			}

			// Pole label
			ctx.fillStyle = 'rgba(255,255,255,0.5)';
			ctx.font = 'bold 11px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(isNorth ? 'N' : 'S', cx, cy + 4);
		}
	}

	// --- Projection switching ---
	async function switchProjection(proj: Projection) {
		if (proj === activeProjection) return;
		if (activeProjection === 'equirectangular') destroyLeaflet();
		activeProjection = proj;
		await tick();
		if (proj === 'equirectangular') await initLeaflet();
		if (proj === 'polar') await drawPolarMaps();
	}

	onMount(() => {
		initLeaflet();
		return () => destroyLeaflet();
	});
</script>

<div class="moon-map-wrapper">
	<div class="map-header">
		<h3 class="text-lg font-semibold">Lunar Surface Map</h3>
		<div class="projection-selector">
			<button class="proj-btn" class:active={activeProjection === 'equirectangular'} onclick={() => switchProjection('equirectangular')}>Equirectangular</button>
			<button class="proj-btn" class:active={activeProjection === 'polar'} onclick={() => switchProjection('polar')}>Polar</button>
			<button class="proj-btn" class:active={activeProjection === 'spherical'} onclick={() => switchProjection('spherical')}>Spherical</button>
		</div>
	</div>

	{#if activeProjection === 'equirectangular'}
		<div class="map-container" bind:this={mapContainer}></div>
	{:else if activeProjection === 'polar'}
		<div class="polar-container" bind:this={polarWrap}>
			<div class="polar-col">
				<span class="polar-label">North Pole</span>
				<canvas bind:this={northCanvas} class="polar-canvas"></canvas>
			</div>
			<div class="polar-col">
				<span class="polar-label">South Pole</span>
				<canvas bind:this={southCanvas} class="polar-canvas"></canvas>
			</div>
		</div>
	{:else}
		<div class="spherical-placeholder">
			<div class="sphere-visual">
				<div class="sphere-circle"></div>
				<div class="sphere-grid"></div>
			</div>
			<p class="text-sm text-[var(--color-text-dim)]">3D Spherical View</p>
			<p class="text-xs text-[var(--color-text-dim)] opacity-60">Interactive WebGL globe — coming soon</p>
		</div>
	{/if}

	<div class="map-footer">
		<!-- Legend -->
		<div class="flex gap-4 text-xs text-[var(--color-text-dim)]">
			<span class="flex items-center gap-1.5">
				<span class="legend-dot" style="background:rgba(6,182,212,0.8);border-color:rgba(6,182,212,0.4);box-shadow:0 0 6px rgba(6,182,212,0.5)"></span> Mass Driver
			</span>
			<span class="flex items-center gap-1.5">
				<span class="legend-dot" style="background:rgba(245,158,11,0.8);border-color:rgba(245,158,11,0.4);box-shadow:0 0 6px rgba(245,158,11,0.5)"></span> Mining Zone
			</span>
			<span class="flex items-center gap-1.5">
				<span class="legend-dot" style="background:rgba(34,197,94,0.8);border-color:rgba(34,197,94,0.4);box-shadow:0 0 6px rgba(34,197,94,0.5)"></span> Construction
			</span>
		</div>
		<span class="text-xs text-[var(--color-text-dim)] opacity-50">
			{lunarSites.length} active sites &middot; LRO WAC Mosaic (303 ppd)
		</span>
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
		margin-bottom: 0.75rem;
	}

	.projection-selector {
		display: flex;
		gap: 0.25rem;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		padding: 0.15rem;
		background: var(--color-bg);
	}

	.proj-btn {
		padding: 0.25rem 0.6rem;
		font-size: 0.7rem;
		font-weight: 500;
		border-radius: 0.3rem;
		border: none;
		background: transparent;
		color: var(--color-text-dim);
		cursor: pointer;
		transition: all 0.15s;
	}

	.proj-btn:hover {
		color: var(--color-text);
	}

	.proj-btn.active {
		background: var(--color-border);
		color: var(--color-text);
	}

	.map-container {
		flex: 1;
		min-height: 400px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		overflow: hidden;
		background: #0a0a0f;
	}

	.polar-container {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		align-items: flex-start;
		padding: 1rem 0;
		flex: 1;
		min-height: 400px;
	}

	.polar-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.polar-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.polar-canvas {
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: #0a0a0f;
		max-width: 100%;
		height: auto;
	}

	.spherical-placeholder {
		flex: 1;
		min-height: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		border: 1px dashed var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg-panel);
	}

	.sphere-visual {
		width: 200px;
		height: 200px;
		position: relative;
	}

	.sphere-circle {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #4a4a5a, #1a1a2a 60%, #0a0a15 100%);
		border: 1px solid var(--color-border);
	}

	.sphere-grid {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background:
			repeating-conic-gradient(from 0deg, transparent 0deg, transparent 29deg, rgba(255,255,255,0.04) 29deg, rgba(255,255,255,0.04) 31deg);
		mask-image: radial-gradient(circle, black 48%, transparent 50%);
		-webkit-mask-image: radial-gradient(circle, black 48%, transparent 50%);
	}

	.map-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.75rem;
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
		0% { transform: scale(0.8); opacity: 1; }
		100% { transform: scale(1.8); opacity: 0; }
	}

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
