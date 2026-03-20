<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

	// ── Constants ─────────────────────────────────────────
	const EARTH_RADIUS = 1;           // unit sphere
	const ATMOSPHERE_SCALE = 1.015;   // thin glow shell

	// ── DOM & Three refs ──────────────────────────────────
	let container: HTMLDivElement;
	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let controls: OrbitControls;
	let earthMesh: THREE.Mesh;
	let frameId: number;

	// ── Camera presets ────────────────────────────────────
	type ViewPreset = 'free' | 'north' | 'south';
	let activePreset = $state<ViewPreset>('free');

	function flyTo(lat: number, _lng: number, distance: number) {
		// Convert lat/lng to camera position on sphere
		const phi = (90 - lat) * (Math.PI / 180);
		const theta = (_lng + 180) * (Math.PI / 180);
		const target = new THREE.Vector3(
			-distance * Math.sin(phi) * Math.cos(theta),
			distance * Math.cos(phi),
			distance * Math.sin(phi) * Math.sin(theta)
		);

		// Animate with simple lerp
		const start = camera.position.clone();
		const startTarget = controls.target.clone();
		const endTarget = new THREE.Vector3(0, 0, 0);
		let t = 0;
		const dur = 60; // frames

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
		const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
		sunLight.position.set(5, 3, 5);
		scene.add(sunLight);

		const ambient = new THREE.AmbientLight(0x334466, 0.6);
		scene.add(ambient);

		// Point hint light on dark side
		const fillLight = new THREE.DirectionalLight(0x1a2a4a, 0.3);
		fillLight.position.set(-3, -1, -3);
		scene.add(fillLight);

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
		// Rotate so prime meridian (0° lng) faces camera at start
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

		// ── Render loop ───────────────────────────────────
		function animate() {
			frameId = requestAnimationFrame(animate);
			controls.update();
			renderer.render(scene, camera);
		}
		animate();

		// ── Cleanup ───────────────────────────────────────
		return () => {
			cancelAnimationFrame(frameId);
			observer.disconnect();
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
	</div>
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
</style>
