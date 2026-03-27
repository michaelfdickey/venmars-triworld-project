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
	let mapContainer = $state<HTMLDivElement>(null!);
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

	// --- Canvas polar rendering with zoom ---
	let northCanvas = $state<HTMLCanvasElement>(null!);
	let southCanvas = $state<HTMLCanvasElement>(null!);
	let polarWrap = $state<HTMLDivElement>(null!);

	// Zoom state: latSpan = degrees of latitude visible from pole to edge of circle
	// At min zoom (90°) you see the whole hemisphere; at max zoom (5°) you see only near the pole
	let northLatSpan = $state(90);
	let southLatSpan = $state(90);
	const MIN_LAT_SPAN = 5;
	const MAX_LAT_SPAN = 90;
	const ZOOM_FACTOR = 0.85; // multiply/divide per wheel tick

	// Tile cache to avoid re-fetching
	const tileCache = new Map<string, HTMLImageElement>();
	let renderNorth = 0; // render generation counters to cancel stale renders
	let renderSouth = 0;

	function loadImg(src: string): Promise<HTMLImageElement> {
		if (tileCache.has(src)) return Promise.resolve(tileCache.get(src)!);
		return new Promise(res => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => { tileCache.set(src, img); res(img); };
			img.onerror = () => res(img);
			img.src = src;
		});
	}

	// Determine best tile zoom level for current lat span
	function pickTileZoom(latSpan: number): number {
		// At latSpan=90 we need full globe coverage → z=2 is decent (16 cols × 4 rows)
		// At latSpan=5 we need fine detail → z=5..7
		// Heuristic: fewer degrees visible → higher zoom
		if (latSpan > 60) return 2;
		if (latSpan > 30) return 3;
		if (latSpan > 15) return 4;
		if (latSpan > 8) return 5;
		if (latSpan > 4) return 6;
		return 7;
	}

	// Build equirectangular texture from WMTS tiles covering the needed lat range
	async function buildTexture(latSpan: number, isNorth: boolean): Promise<{ data: ImageData; w: number; h: number; latMin: number; latMax: number } | null> {
		const tileZ = pickTileZoom(latSpan);
		const nCols = Math.pow(2, tileZ) * 2; // EPSG:4326: 2 * 2^z cols
		const nRows = Math.pow(2, tileZ);       // 2^z rows
		const tileLatSize = 180 / nRows;
		const tileLngSize = 360 / nCols;

		// Lat range we need
		const poleLat = isNorth ? 90 : -90;
		const edgeLat = isNorth ? 90 - latSpan : -90 + latSpan;
		const latMin = Math.min(poleLat, edgeLat);
		const latMax = Math.max(poleLat, edgeLat);

		// Which tile rows cover this range? Row 0 = top = +90
		const rowStart = Math.max(0, Math.floor((90 - latMax) / tileLatSize));
		const rowEnd = Math.min(nRows - 1, Math.floor((90 - latMin) / tileLatSize));
		const rowCount = rowEnd - rowStart + 1;

		// Load all columns for those rows
		const base = 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm';
		const promises: Promise<{ img: HTMLImageElement; col: number; row: number }>[] = [];
		for (let r = rowStart; r <= rowEnd; r++) {
			for (let c = 0; c < nCols; c++) {
				promises.push(loadImg(`${base}/${tileZ}/${r}/${c}.jpg`).then(img => ({ img, col: c, row: r })));
			}
		}
		const results = await Promise.all(promises);

		const tw = 256; // tile pixel size
		const texW = nCols * tw;
		const texH = rowCount * tw;
		const texCanvas = document.createElement('canvas');
		texCanvas.width = texW;
		texCanvas.height = texH;
		const texCtx = texCanvas.getContext('2d')!;
		for (const { img, col, row } of results) {
			if (img.naturalWidth) {
				texCtx.drawImage(img, col * tw, (row - rowStart) * tw, tw, tw);
			}
		}

		const texLatMax = 90 - rowStart * tileLatSize;
		const texLatMin = 90 - (rowEnd + 1) * tileLatSize;

		return {
			data: texCtx.getImageData(0, 0, texW, texH),
			w: texW,
			h: texH,
			latMin: texLatMin,
			latMax: texLatMax,
		};
	}

	function polarProject(lat: number, lng: number, isNorth: boolean, cx: number, cy: number, radius: number, latSpan: number) {
		const colatDeg = isNorth ? (90 - lat) : (90 + lat);
		const r = (colatDeg / latSpan) * radius;
		const theta = (lng * Math.PI) / 180;
		// North: 0° lng = down, east = right. South: mirrored so east is correct side
		const x = isNorth ? cx + r * Math.sin(theta) : cx - r * Math.sin(theta);
		const y = isNorth ? cy + r * Math.cos(theta) : cy + r * Math.cos(theta);
		return { x, y, r };
	}

	async function drawPolar(canvas: HTMLCanvasElement, isNorth: boolean, latSpan: number, gen: number) {
		if (!canvas || !polarWrap) return;

		const containerW = polarWrap.clientWidth;
		const containerH = polarWrap.clientHeight || 600;
		const maxByWidth = Math.floor((containerW - 40) / 2);
		const maxByHeight = containerH - 60; // leave room for labels
		const size = Math.min(maxByWidth, maxByHeight, 800);
		canvas.width = size;
		canvas.height = size;
		canvas.style.width = size + 'px';
		canvas.style.height = size + 'px';

		const tex = await buildTexture(latSpan, isNorth);
		// Check if this render is still current
		if (isNorth && gen !== renderNorth) return;
		if (!isNorth && gen !== renderSouth) return;
		if (!tex) return;

		const cx = size / 2, cy = size / 2, radius = size / 2 - 4;
		const ctx = canvas.getContext('2d')!;

		// Pixel-by-pixel azimuthal equidistant projection
		const imgOut = ctx.createImageData(size, size);
		for (let py = 0; py < size; py++) {
			for (let px = 0; px < size; px++) {
				const dx = px - cx, dy = py - cy;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > radius) continue;

				// Colatitude in degrees from pole (0 = pole, latSpan = edge)
				const colatDeg = (dist / radius) * latSpan;
				const lat = isNorth ? 90 - colatDeg : -90 + colatDeg;

				// Azimuth → longitude
				// North pole: 0° lng = down on screen (standard cartographic convention)
				// South pole: mirror so east is on the correct side when viewed from below
				const lng = isNorth
					? Math.atan2(dx, dy) * (180 / Math.PI)
					: Math.atan2(-dx, dy) * (180 / Math.PI);

				// Map to texture coords
				const tyFrac = (tex.latMax - lat) / (tex.latMax - tex.latMin);
				const txFrac = ((lng + 180) / 360);
				const txPx = ((Math.floor(txFrac * tex.w) % tex.w) + tex.w) % tex.w;
				const tyPx = Math.min(Math.max(Math.floor(tyFrac * tex.h), 0), tex.h - 1);
				const ti = (tyPx * tex.w + txPx) * 4;
				const oi = (py * size + px) * 4;
				imgOut.data[oi] = tex.data.data[ti];
				imgOut.data[oi + 1] = tex.data.data[ti + 1];
				imgOut.data[oi + 2] = tex.data.data[ti + 2];
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

		// Grid: latitude circles
		ctx.strokeStyle = 'rgba(255,255,255,0.08)';
		ctx.lineWidth = 0.5;
		const latStep = latSpan > 30 ? 30 : latSpan > 10 ? 10 : 5;
		for (let d = latStep; d < latSpan; d += latStep) {
			const gridR = (d / latSpan) * radius;
			ctx.beginPath();
			ctx.arc(cx, cy, gridR, 0, Math.PI * 2);
			ctx.stroke();

			// Label
			const labelLat = isNorth ? 90 - d : -90 + d;
			ctx.fillStyle = 'rgba(255,255,255,0.25)';
			ctx.font = '9px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(`${labelLat.toFixed(0)}°`, cx, cy - gridR + 11);
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
			const colatSite = isNorth ? (90 - site.lat) : (90 + site.lat);
			if (colatSite < 0 || colatSite > latSpan) continue; // outside visible range

			const pos = polarProject(site.lat, site.lng, isNorth, cx, cy, radius, latSpan);

			const color = siteColors[site.type];
			ctx.shadowColor = color;
			ctx.shadowBlur = 8;
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;

			ctx.strokeStyle = color;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
			ctx.stroke();

			ctx.fillStyle = '#e2e8f0';
			ctx.font = '10px sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(site.name, pos.x + 13, pos.y + 3);
		}

		// Pole label
		ctx.fillStyle = 'rgba(255,255,255,0.5)';
		ctx.font = 'bold 11px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(isNorth ? 'N' : 'S', cx, cy + 4);
	}

	async function drawPolarMaps() {
		await tick();
		renderNorth++;
		renderSouth++;
		await Promise.all([
			drawPolar(northCanvas, true, northLatSpan, renderNorth),
			drawPolar(southCanvas, false, southLatSpan, renderSouth),
		]);
	}

	function handlePolarWheel(e: WheelEvent, isNorth: boolean) {
		e.preventDefault();
		if (isNorth) {
			if (e.deltaY < 0) northLatSpan = Math.max(MIN_LAT_SPAN, northLatSpan * ZOOM_FACTOR);
			else northLatSpan = Math.min(MAX_LAT_SPAN, northLatSpan / ZOOM_FACTOR);
			renderNorth++;
			drawPolar(northCanvas, true, northLatSpan, renderNorth);
		} else {
			if (e.deltaY < 0) southLatSpan = Math.max(MIN_LAT_SPAN, southLatSpan * ZOOM_FACTOR);
			else southLatSpan = Math.min(MAX_LAT_SPAN, southLatSpan / ZOOM_FACTOR);
			renderSouth++;
			drawPolar(southCanvas, false, southLatSpan, renderSouth);
		}
	}

	// --- Three.js Spherical Globe ---
	let globeContainer = $state<HTMLDivElement>(null!);
	let threeCleanup: (() => void) | null = null;

	async function initGlobe() {
		if (threeCleanup) return;
		await tick();
		if (!globeContainer) return;

		const THREE = await import('three');

		const width = globeContainer.clientWidth;
		const height = Math.max(globeContainer.clientHeight, 500);

		// Scene
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a0f);

		// Camera
		const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
		camera.position.set(0, 0, 3);

		// Renderer
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		globeContainer.appendChild(renderer.domElement);

		// Moon sphere — start with placeholder color, texture loads async
		const geometry = new THREE.SphereGeometry(1, 128, 64);
		const material = new THREE.MeshStandardMaterial({
			color: 0x888888,
			roughness: 1,
			metalness: 0,
		});
		const moon = new THREE.Mesh(geometry, material);
		scene.add(moon);

		// Lighting — high ambient so entire surface is clearly visible
		const ambient = new THREE.AmbientLight(0xffffff, 7.0);
		scene.add(ambient);
		const sunLight = new THREE.DirectionalLight(0xffffff, 4.0);
		sunLight.position.set(5, 3, 5);
		scene.add(sunLight);
		const fillLight = new THREE.DirectionalLight(0xffffff, 3.0);
		fillLight.position.set(-4, -1, -3);
		scene.add(fillLight);

		// Load progressive textures
		const base = 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm';

		function loadTiledTexture(zoom: number): Promise<HTMLCanvasElement> {
			const nCols = Math.pow(2, zoom) * 2; // EPSG:4326
			const nRows = Math.pow(2, zoom);
			const tw = 256;
			const texCanvas = document.createElement('canvas');
			texCanvas.width = nCols * tw;
			texCanvas.height = nRows * tw;
			const ctx = texCanvas.getContext('2d')!;

			const promises: Promise<void>[] = [];
			for (let r = 0; r < nRows; r++) {
				for (let c = 0; c < nCols; c++) {
					promises.push(new Promise<void>(resolve => {
						const img = new Image();
						img.crossOrigin = 'anonymous';
						img.onload = () => { ctx.drawImage(img, c * tw, r * tw, tw, tw); resolve(); };
						img.onerror = () => resolve();
						img.src = `${base}/${zoom}/${r}/${c}.jpg`;
					}));
				}
			}
			return Promise.all(promises).then(() => texCanvas);
		}

		// Load zoom-2 first (fast, 16×4 = 64 tiles, 4096×1024)
		let destroyed = false;
		loadTiledTexture(2).then(canvas => {
			if (destroyed) return;
			const tex = new THREE.CanvasTexture(canvas);
			tex.colorSpace = THREE.SRGBColorSpace;
			material.map = tex;
			material.needsUpdate = true;

			// Then load zoom-4 for higher detail (512 tiles, 16384×4096)
			loadTiledTexture(4).then(canvas4 => {
				if (destroyed) return;
				const tex4 = new THREE.CanvasTexture(canvas4);
				tex4.colorSpace = THREE.SRGBColorSpace;
				tex4.anisotropy = renderer.capabilities.getMaxAnisotropy();
				material.map = tex4;
				material.needsUpdate = true;
				tex.dispose();
			});
		});

		// Site markers as sprites
		const markerGroup = new THREE.Group();
		scene.add(markerGroup);

		for (const site of lunarSites) {
			const color = siteColors[site.type];
			// Create a small canvas for the sprite
			const spriteCanvas = document.createElement('canvas');
			spriteCanvas.width = 64;
			spriteCanvas.height = 64;
			const sctx = spriteCanvas.getContext('2d')!;
			// Outer glow ring
			sctx.beginPath();
			sctx.arc(32, 32, 24, 0, Math.PI * 2);
			sctx.strokeStyle = color;
			sctx.lineWidth = 2;
			sctx.shadowColor = color;
			sctx.shadowBlur = 12;
			sctx.stroke();
			sctx.shadowBlur = 0;
			// Inner dot
			sctx.beginPath();
			sctx.arc(32, 32, 8, 0, Math.PI * 2);
			sctx.fillStyle = color;
			sctx.fill();

			const spriteTex = new THREE.CanvasTexture(spriteCanvas);
			const spriteMat = new THREE.SpriteMaterial({
				map: spriteTex,
				transparent: true,
				depthTest: false,
			});
			const sprite = new THREE.Sprite(spriteMat);
			sprite.scale.set(0.06, 0.06, 1);

			// Convert lat/lng to 3D position on sphere surface
			const phi = (90 - site.lat) * (Math.PI / 180);
			const theta = (site.lng + 180) * (Math.PI / 180);
			const r = 1.005; // slightly above surface
			sprite.position.set(
				-r * Math.sin(phi) * Math.cos(theta),
				r * Math.cos(phi),
				r * Math.sin(phi) * Math.sin(theta),
			);
			sprite.userData = { site };
			markerGroup.add(sprite);
		}

		// Tooltip overlay
		const tooltipEl = document.createElement('div');
		tooltipEl.className = 'globe-tooltip';
		tooltipEl.style.display = 'none';
		globeContainer.appendChild(tooltipEl);

		// Raycaster for hover
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		function onMouseMove(e: MouseEvent) {
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const hits = raycaster.intersectObjects(markerGroup.children);
			if (hits.length > 0) {
				const site = hits[0].object.userData.site as LunarSite;
				tooltipEl.style.display = 'block';
				tooltipEl.style.left = (e.clientX - rect.left + 12) + 'px';
				tooltipEl.style.top = (e.clientY - rect.top - 8) + 'px';
				const typeLabel = site.type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
				tooltipEl.innerHTML = `<strong style="color:${siteColors[site.type]}">${site.name}</strong><br><span style="opacity:0.7">${typeLabel} &middot; ${site.lat.toFixed(1)}°, ${site.lng.toFixed(1)}°</span>`;
				renderer.domElement.style.cursor = 'pointer';
			} else {
				tooltipEl.style.display = 'none';
				renderer.domElement.style.cursor = 'grab';
			}
		}
		renderer.domElement.addEventListener('mousemove', onMouseMove);

		// Orbit controls (manual — no import needed)
		let isDragging = false;
		let prevX = 0, prevY = 0;
		let rotX = 0, rotY = 0; // accumulated rotation
		let targetDistance = 3;
		const MIN_DIST = 1.2;
		const MAX_DIST = 6;

		renderer.domElement.addEventListener('mousedown', (e) => {
			isDragging = true;
			prevX = e.clientX;
			prevY = e.clientY;
			renderer.domElement.style.cursor = 'grabbing';
		});

		window.addEventListener('mouseup', () => {
			isDragging = false;
			renderer.domElement.style.cursor = 'grab';
		});

		window.addEventListener('mousemove', (e) => {
			if (!isDragging) return;
			const dx = e.clientX - prevX;
			const dy = e.clientY - prevY;
			rotY -= dx * 0.005;
			rotX += dy * 0.005;
			rotX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, rotX));
			prevX = e.clientX;
			prevY = e.clientY;
		});

		renderer.domElement.addEventListener('wheel', (e) => {
			e.preventDefault();
			targetDistance *= e.deltaY > 0 ? 1.1 : 0.9;
			targetDistance = Math.max(MIN_DIST, Math.min(MAX_DIST, targetDistance));
		}, { passive: false });

		// Handle resize
		let rafId: number;
		const ro = new ResizeObserver(() => {
			if (destroyed) return;
			const w = globeContainer.clientWidth;
			const h = Math.max(globeContainer.clientHeight, 500);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		});
		ro.observe(globeContainer);

		// Render loop
		function animate() {
			if (destroyed) return;
			rafId = requestAnimationFrame(animate);

			// Smooth camera orbit
			const dist = camera.position.length();
			const smoothDist = dist + (targetDistance - dist) * 0.1;
			camera.position.set(
				smoothDist * Math.cos(rotX) * Math.sin(rotY),
				smoothDist * Math.sin(rotX),
				smoothDist * Math.cos(rotX) * Math.cos(rotY),
			);
			camera.lookAt(0, 0, 0);

			// Scale markers based on distance
			const markerScale = 0.03 + (smoothDist - MIN_DIST) / (MAX_DIST - MIN_DIST) * 0.05;
			for (const child of markerGroup.children) {
				child.scale.set(markerScale, markerScale, 1);
			}

			renderer.render(scene, camera);
		}
		animate();

		renderer.domElement.style.cursor = 'grab';

		threeCleanup = () => {
			destroyed = true;
			cancelAnimationFrame(rafId);
			ro.disconnect();
			renderer.domElement.removeEventListener('mousemove', onMouseMove);
			renderer.dispose();
			geometry.dispose();
			material.dispose();
			if (material.map) material.map.dispose();
			for (const child of markerGroup.children) {
				if (child instanceof THREE.Sprite) {
					child.material.map?.dispose();
					child.material.dispose();
				}
			}
			tooltipEl.remove();
			if (globeContainer?.contains(renderer.domElement)) {
				globeContainer.removeChild(renderer.domElement);
			}
			threeCleanup = null;
		};
	}

	function destroyGlobe() {
		if (threeCleanup) threeCleanup();
	}

	// --- Projection switching ---
	async function switchProjection(proj: Projection) {
		if (proj === activeProjection) return;
		if (activeProjection === 'equirectangular') destroyLeaflet();
		if (activeProjection === 'spherical') destroyGlobe();
		activeProjection = proj;
		await tick();
		if (proj === 'equirectangular') await initLeaflet();
		if (proj === 'polar') await drawPolarMaps();
		if (proj === 'spherical') await initGlobe();
	}

	onMount(() => {
		initLeaflet();
		return () => {
			destroyLeaflet();
			destroyGlobe();
		};
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
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<canvas bind:this={northCanvas} class="polar-canvas" onwheel={(e) => handlePolarWheel(e, true)}></canvas>
				<span class="zoom-indicator">{northLatSpan.toFixed(0)}° from pole</span>
			</div>
			<div class="polar-col">
				<span class="polar-label">South Pole</span>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<canvas bind:this={southCanvas} class="polar-canvas" onwheel={(e) => handlePolarWheel(e, false)}></canvas>
				<span class="zoom-indicator">{southLatSpan.toFixed(0)}° from pole</span>
			</div>
		</div>
	{:else}
		<div class="globe-container" bind:this={globeContainer}></div>
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
		cursor: zoom-in;
	}

	.zoom-indicator {
		font-size: 0.65rem;
		color: var(--color-text-dim);
		opacity: 0.6;
		font-family: monospace;
	}

	.globe-container {
		flex: 1;
		min-height: 500px;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		overflow: hidden;
		background: #0a0a0f;
		position: relative;
	}

	.globe-container :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}

	:global(.globe-tooltip) {
		position: absolute;
		pointer-events: none;
		background: rgba(10, 14, 23, 0.92);
		border: 1px solid rgba(255,255,255,0.15);
		padding: 6px 10px;
		border-radius: 4px;
		font-size: 0.75rem;
		color: #e2e8f0;
		white-space: nowrap;
		z-index: 10;
		box-shadow: 0 2px 12px rgba(0,0,0,0.5);
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
