<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	type PayloadCategory = 'satellite' | 'infrastructure' | 'habitat' | 'vehicle' | 'supply' | 'fuel';

	interface Payload {
		name: string;
		icon: string;
		category: PayloadCategory;
		mass: number;         // kg
		volume: string;       // dimensions or envelope
		volume_m3: number;    // usable volume in m³
		cost: number;         // $M
		description: string;
		destinations: string[];
		density_kg_m3?: number; // fuel only: mass per m³
	}

	const categoryLabels: Record<PayloadCategory, string> = {
		satellite: 'Satellites & Probes',
		infrastructure: 'Orbital Infrastructure',
		habitat: 'Habitat Modules',
		vehicle: 'Vehicles & Landers',
		supply: 'Supply & Logistics',
		fuel: 'Fuel (Depot Fill)',
	};

	const categoryIcons: Record<PayloadCategory, string> = {
		satellite: '📡',
		infrastructure: '🏗️',
		habitat: '🏠',
		vehicle: '🚀',
		supply: '📦',
		fuel: '⛽',
	};

	const payloads: Payload[] = [
		// Satellites & Probes
		{
			name: 'Comm Relay Satellite',
			icon: '📡', category: 'satellite', mass: 5500, volume: '4m × 2m × 2m', volume_m3: 16,
			cost: 120, description: 'High-bandwidth Ka/V-band relay for deep-space communication networks.',
			destinations: ['LEO', 'GEO', 'Lunar Orbit', 'Mars Orbit'],
		},
		{
			name: 'Navigation Constellation Sat',
			icon: '🛰️', category: 'satellite', mass: 1200, volume: '2m × 1m × 1m', volume_m3: 2,
			cost: 45, description: 'Precision PNT satellite for cislunar or planetary GPS-equivalent coverage.',
			destinations: ['MEO', 'Lunar Orbit', 'Mars Orbit'],
		},
		{
			name: 'Scientific Surveyor',
			icon: '🔭', category: 'satellite', mass: 3200, volume: '3m × 2m × 2m', volume_m3: 12,
			cost: 280, description: 'Multi-spectral imaging + LIDAR altimeter for planetary surface mapping.',
			destinations: ['Lunar Orbit', 'Venus Orbit', 'Mars Orbit', 'Asteroid Flyby'],
		},
		{
			name: 'Atmospheric Probe',
			icon: '🎈', category: 'satellite', mass: 800, volume: '1.5m sphere', volume_m3: 1.8,
			cost: 95, description: 'Descent probe with spectrometers and pressure/temp sensors. Designed for Venus or Mars entry.',
			destinations: ['Venus Atmo', 'Mars Atmo'],
		},
		{
			name: 'Weather & Climate Monitor',
			icon: '🌤️', category: 'satellite', mass: 2800, volume: '3m × 2m × 2m', volume_m3: 12,
			cost: 150, description: 'Tracks atmospheric changes on terraforming targets. Essential for monitoring Mars pressure buildup.',
			destinations: ['Mars Orbit', 'Venus Orbit'],
		},

		// Orbital Infrastructure
		{
			name: 'Fuel Depot Module',
			icon: '⛽', category: 'infrastructure', mass: 12000, volume: '8m × 4.5m (cylinder)', volume_m3: 127,
			cost: 350, description: 'Cryogenic propellant storage with solar-powered cryo-coolers. Stores LOX, LH₂, or LCH₄.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Earth-Sun L2'],
		},
		{
			name: 'Solar Power Array (Deployable)',
			icon: '☀️', category: 'infrastructure', mass: 8000, volume: '4m packed → 50m span', volume_m3: 18,
			cost: 180, description: '500 kW roll-out solar array. Powers stations, fuel depots, or mass drivers.',
			destinations: ['LEO', 'Lunar Orbit', 'Venus Orbit', 'Mars Orbit'],
		},
		{
			name: 'Orbital Drydock Truss',
			icon: '🏗️', category: 'infrastructure', mass: 25000, volume: '20m × 8m × 8m', volume_m3: 1280,
			cost: 600, description: 'Structural truss for on-orbit assembly of large spacecraft. Robotic arms included.',
			destinations: ['LEO', 'Lunar Orbit'],
		},
		{
			name: 'Mass Driver Segment',
			icon: '⚡', category: 'infrastructure', mass: 18000, volume: '15m × 3m × 3m', volume_m3: 135,
			cost: 420, description: 'Electromagnetic accelerator section. 8 segments make one operational mass driver.',
			destinations: ['Lunar Surface', 'Venus Platform'],
		},
		{
			name: 'Radiation Shield Array',
			icon: '🛡️', category: 'infrastructure', mass: 6000, volume: '5m × 5m panels', volume_m3: 25,
			cost: 90, description: 'Water-filled or polyethylene panels for crew radiation protection in deep space.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Transit'],
		},

		// Habitat Modules
		{
			name: 'LEO Habitat Module',
			icon: '🏠', category: 'habitat', mass: 20000, volume: '10m × 4.5m (pressurized)', volume_m3: 160,
			cost: 450, description: 'Standard pressurized crew module for 6 crew. Life support, sleeping quarters, galley.',
			destinations: ['LEO'],
		},
		{
			name: 'Lunar Surface Habitat',
			icon: '🌑', category: 'habitat', mass: 15000, volume: '8m × 5m (deployable)', volume_m3: 157,
			cost: 520, description: 'Inflatable habitat with regolith radiation shielding anchors. Supports 4 crew for 180 days.',
			destinations: ['Lunar Surface'],
		},
		{
			name: 'Venus Floating Habitat',
			icon: '🎈', category: 'habitat', mass: 9000, volume: '12m envelope + 4m gondola', volume_m3: 50,
			cost: 680, description: 'Buoyant aerostat habitat for Venus cloud layer (50-55 km). Acid-resistant envelope. 4 crew.',
			destinations: ['Venus Atmo'],
		},
		{
			name: 'Mars Surface Habitat',
			icon: '🔴', category: 'habitat', mass: 22000, volume: '10m × 6m (pressurized)', volume_m3: 283,
			cost: 580, description: 'Insulated & pressurized for Mars surface ops. ISRU water extraction, CO₂ filtration, 6 crew.',
			destinations: ['Mars Surface'],
		},
		{
			name: 'Deep-Space Transit Hab',
			icon: '🚀', category: 'habitat', mass: 35000, volume: '12m × 5m (with centrifuge)', volume_m3: 236,
			cost: 900, description: 'Long-duration crew module with partial-gravity centrifuge. For Earth–Mars or Earth–Venus transits.',
			destinations: ['Mars Transit', 'Venus Transit'],
		},

		// Vehicles & Landers
		{
			name: 'Crew Reentry Vehicle',
			icon: '🛡️', category: 'vehicle', mass: 9000, volume: '5m × 3.5m (capsule)', volume_m3: 48,
			cost: 210, description: 'PICA-X heat shield capsule for Earth or Mars atmospheric reentry. 4–6 crew capacity.',
			destinations: ['Earth Return', 'Mars Entry'],
		},
		{
			name: 'Lunar Lander (Cargo)',
			icon: '🌑', category: 'vehicle', mass: 11000, volume: '7m × 4m', volume_m3: 88,
			cost: 320, description: 'Autonomous cargo lander for lunar surface. 15t payload to surface from LLO.',
			destinations: ['Lunar Surface'],
		},
		{
			name: 'Mars Cargo Lander',
			icon: '🔴', category: 'vehicle', mass: 14000, volume: '8m × 5m', volume_m3: 157,
			cost: 380, description: 'Supersonic retro-propulsion lander for Mars. Delivers 20t to surface from Mars orbit.',
			destinations: ['Mars Surface'],
		},
		{
			name: 'Orbital Tug (Ion)',
			icon: '🔧', category: 'vehicle', mass: 3500, volume: '4m × 2m', volume_m3: 12.5,
			cost: 140, description: 'Solar-electric propulsion tug for slow but efficient cargo transfers between orbits.',
			destinations: ['Cislunar', 'Earth–Mars Transfer'],
		},
		{
			name: 'Venus Atmospheric Drone',
			icon: '🎈', category: 'vehicle', mass: 400, volume: '3m wingspan', volume_m3: 2,
			cost: 65, description: 'Solar-powered VTOL drone for Venus cloud-layer surveys and atmospheric sampling.',
			destinations: ['Venus Atmo'],
		},

		// Supply & Logistics
		{
			name: 'Crew Consumables Pod',
			icon: '🍱', category: 'supply', mass: 6000, volume: '3m × 2.5m', volume_m3: 14.7,
			cost: 35, description: 'Food, water, O₂, medical supplies for 6 crew × 90 days.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit'],
		},
		{
			name: 'ISRU Equipment Pack',
			icon: '⚙️', category: 'supply', mass: 8500, volume: '4m × 3m × 2m', volume_m3: 24,
			cost: 200, description: 'In-situ resource processing: Sabatier reactor, electrolyzer, regolith oven, controls.',
			destinations: ['Lunar Surface', 'Mars Surface'],
		},
		{
			name: 'Construction Material Pallet',
			icon: '🧱', category: 'supply', mass: 20000, volume: 'Standard pallet (4m × 4m × 3m)', volume_m3: 48,
			cost: 25, description: 'Bulk structural materials: aluminum beams, fasteners, wiring, piping, insulation.',
			destinations: ['LEO', 'Lunar Surface', 'Mars Surface'],
		},
		{
			name: 'Spare Parts & Tools Kit',
			icon: '🔧', category: 'supply', mass: 3000, volume: '2m × 1.5m × 1m', volume_m3: 3,
			cost: 40, description: 'Replacement pumps, valves, seals, electronics, and EVA tooling.',
			destinations: ['LEO', 'Lunar Surface', 'Mars Surface'],
		},
		{
			name: 'Nuclear Fission Power Unit',
			icon: '☢️', category: 'supply', mass: 7500, volume: '3m × 2m (shielded)', volume_m3: 9.4,
			cost: 500, description: '40 kW fission reactor for surface ops where solar is limited (Mars night, polar, dust storms).',
			destinations: ['Lunar Surface', 'Mars Surface'],
		},

		// Fuel (fills remaining fairing volume — 80% packing efficiency)
		{
			name: 'LOX (Liquid Oxygen)',
			icon: '🧊', category: 'fuel', mass: 0, volume: 'Fills remaining fairing', volume_m3: 0,
			cost: 0.2, description: 'Cryogenic oxidizer. High density — excellent mass-to-volume ratio. Used with LH₂, LCH₄, or RP-1.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
			density_kg_m3: 1141,
		},
		{
			name: 'LH₂ (Liquid Hydrogen)',
			icon: '💨', category: 'fuel', mass: 0, volume: 'Fills remaining fairing', volume_m3: 0,
			cost: 0.8, description: 'Ultra-low density cryogenic fuel. Best Isp but volume-hungry — often the binding constraint.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
			density_kg_m3: 71,
		},
		{
			name: 'LCH₄ (Liquid Methane)',
			icon: '🔥', category: 'fuel', mass: 0, volume: 'Fills remaining fairing', volume_m3: 0,
			cost: 0.5, description: 'Mid-density cryogenic fuel. Good balance of Isp and density. ISRU-producible on Mars.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
			density_kg_m3: 423,
		},
		{
			name: 'RP-1 (Rocket-Grade Kerosene)',
			icon: '🛢️', category: 'fuel', mass: 0, volume: 'Fills remaining fairing', volume_m3: 0,
			cost: 0.3, description: 'Dense storable hydrocarbon fuel. Easiest to handle but lower Isp than cryogenics.',
			destinations: ['LEO', 'Fuel Depot'],
			density_kg_m3: 820,
		},
		{
			name: 'Hydrazine (N₂H₄)',
			icon: '⚗️', category: 'fuel', mass: 0, volume: 'Fills remaining fairing', volume_m3: 0,
			cost: 1.5, description: 'Storable hypergolic monopropellant. Dense but toxic. Used in thrusters & orbital maneuvers.',
			destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
			density_kg_m3: 1021,
		},
	];

	const allCategories: PayloadCategory[] = ['satellite', 'infrastructure', 'habitat', 'vehicle', 'supply', 'fuel'];

	let selectedCategory = $state<PayloadCategory | 'all'>('all');
	let filtered = $derived(
		selectedCategory === 'all'
			? payloads
			: payloads.filter(p => p.category === selectedCategory)
	);

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}
</script>

<div class="payloads-tab">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-lg font-semibold">Payload Catalog</h3>
		<span class="text-xs text-[var(--color-text-dim)]">{payloads.length} types available</span>
	</div>

	<!-- Category filter -->
	<div class="filter-bar">
		<button class="filter-btn" class:active={selectedCategory === 'all'} onclick={() => selectedCategory = 'all'}>
			All
		</button>
		{#each allCategories as cat}
			<button class="filter-btn" class:active={selectedCategory === cat} onclick={() => selectedCategory = cat}>
				{categoryIcons[cat]} {categoryLabels[cat]}
			</button>
		{/each}
	</div>

	<div class="payload-grid">
		{#each filtered as payload}
			<div class="payload-card">
				<div class="payload-header">
					<span class="payload-icon">{payload.icon}</span>
					<div>
						<span class="payload-name">{payload.name}</span>
						<span class="payload-cat">{categoryLabels[payload.category]}</span>
					</div>
				</div>

				<p class="payload-desc">{payload.description}</p>

				<div class="payload-stats">
					{#if payload.category === 'fuel'}
						<div class="stat">
							<span class="stat-label">Density</span>
							<span class="stat-value">{payload.density_kg_m3} kg/m³</span>
						</div>
						<div class="stat">
							<span class="stat-label">Volume</span>
							<span class="stat-value fuel-auto">Auto-fill</span>
						</div>
						<div class="stat">
							<span class="stat-label">Cost/m³</span>
							<span class="stat-value">${payload.cost}M</span>
						</div>
					{:else}
						<div class="stat">
							<span class="stat-label">Mass</span>
							<span class="stat-value">{formatMass(payload.mass)}</span>
						</div>
						<div class="stat">
							<span class="stat-label">Volume</span>
							<span class="stat-value">{payload.volume_m3} m³</span>
						</div>
						<div class="stat">
							<span class="stat-label">Cost</span>
							<span class="stat-value">${payload.cost}M</span>
						</div>
					{/if}
				</div>

				<div class="payload-destinations">
					{#each payload.destinations as dest}
						<span class="dest-tag">{dest}</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.payloads-tab {
		display: flex;
		flex-direction: column;
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.filter-btn {
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.65rem;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.filter-btn:hover { color: var(--color-text); border-color: var(--color-text-dim); }
	.filter-btn.active {
		background: var(--color-border);
		color: var(--color-text);
	}

	.payload-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.5rem;
	}

	.payload-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.65rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
		transition: border-color 0.15s;
	}
	.payload-card:hover {
		border-color: var(--color-text-dim);
	}

	.payload-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.payload-icon {
		font-size: 1.4rem;
		flex-shrink: 0;
	}

	.payload-name {
		display: block;
		font-weight: 600;
		font-size: 0.8rem;
	}

	.payload-cat {
		display: block;
		font-size: 0.6rem;
		color: var(--color-text-dim);
	}

	.payload-desc {
		font-size: 0.68rem;
		color: var(--color-text-dim);
		line-height: 1.4;
	}

	.payload-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.3rem;
	}

	.stat {
		text-align: center;
		padding: 0.25rem;
		background: var(--color-bg);
		border-radius: 0.25rem;
	}

	.stat-label {
		display: block;
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
	}

	.stat-value {
		display: block;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		font-weight: 600;
	}

	.fuel-auto {
		color: #f59e0b;
		font-style: italic;
	}

	.payload-destinations {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.dest-tag {
		font-size: 0.55rem;
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		background: rgba(139, 92, 246, 0.15);
		color: #a78bfa;
		border: 1px solid rgba(139, 92, 246, 0.25);
	}
</style>
