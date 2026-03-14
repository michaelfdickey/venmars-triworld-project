<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	interface LaunchSite {
		name: string;
		body: string;
		lat: string;
	}

	interface RocketOption {
		name: string;
		payloadLEO: number; // kg
		fairingVolume_m3: number; // m³
		costPerLaunch: number; // $M
	}

	interface PayloadOption {
		name: string;
		mass: number; // kg
		volume_m3: number;
		cost: number; // $M
	}

	interface FuelOption {
		name: string;
		density_kg_m3: number;
		cost_per_m3: number; // $M per m³
	}

	const FUEL_PACKING_EFFICIENCY = 0.80; // 80% of remaining fairing volume is usable

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

	const rocketOptions: RocketOption[] = [
		{ name: 'Starship / Super Heavy', payloadLEO: 150000, fairingVolume_m3: 1000, costPerLaunch: 10 },
		{ name: 'Falcon Heavy', payloadLEO: 63800, fairingVolume_m3: 145, costPerLaunch: 97 },
		{ name: 'Falcon 9', payloadLEO: 22800, fairingVolume_m3: 145, costPerLaunch: 67 },
		{ name: 'SLS Block 2', payloadLEO: 130000, fairingVolume_m3: 830, costPerLaunch: 2200 },
		{ name: 'New Glenn', payloadLEO: 45000, fairingVolume_m3: 400, costPerLaunch: 68 },
		{ name: 'Vulcan Centaur', payloadLEO: 27200, fairingVolume_m3: 172, costPerLaunch: 110 },
		{ name: 'Long March 9', payloadLEO: 150000, fairingVolume_m3: 900, costPerLaunch: 500 },
		{ name: 'Ariane 6 A64', payloadLEO: 21600, fairingVolume_m3: 180, costPerLaunch: 115 },
		{ name: 'Neutron', payloadLEO: 13000, fairingVolume_m3: 100, costPerLaunch: 50 },
		{ name: 'Terran R', payloadLEO: 33500, fairingVolume_m3: 160, costPerLaunch: 55 },
	];

	const payloadOptions: PayloadOption[] = [
		{ name: 'Comm Relay Satellite', mass: 5500, volume_m3: 16, cost: 120 },
		{ name: 'Navigation Constellation Sat', mass: 1200, volume_m3: 2, cost: 45 },
		{ name: 'Scientific Surveyor', mass: 3200, volume_m3: 12, cost: 280 },
		{ name: 'Atmospheric Probe', mass: 800, volume_m3: 1.8, cost: 95 },
		{ name: 'Weather & Climate Monitor', mass: 2800, volume_m3: 12, cost: 150 },
		{ name: 'Fuel Depot Module', mass: 12000, volume_m3: 127, cost: 350 },
		{ name: 'Solar Power Array', mass: 8000, volume_m3: 18, cost: 180 },
		{ name: 'Orbital Drydock Truss', mass: 25000, volume_m3: 1280, cost: 600 },
		{ name: 'Mass Driver Segment', mass: 18000, volume_m3: 135, cost: 420 },
		{ name: 'LEO Habitat Module', mass: 20000, volume_m3: 160, cost: 450 },
		{ name: 'Lunar Surface Habitat', mass: 15000, volume_m3: 157, cost: 520 },
		{ name: 'Venus Floating Habitat', mass: 9000, volume_m3: 50, cost: 680 },
		{ name: 'Mars Surface Habitat', mass: 22000, volume_m3: 283, cost: 580 },
		{ name: 'Deep-Space Transit Hab', mass: 35000, volume_m3: 236, cost: 900 },
		{ name: 'Crew Reentry Vehicle', mass: 9000, volume_m3: 48, cost: 210 },
		{ name: 'Lunar Lander (Cargo)', mass: 11000, volume_m3: 88, cost: 320 },
		{ name: 'Mars Cargo Lander', mass: 14000, volume_m3: 157, cost: 380 },
		{ name: 'Orbital Tug (Ion)', mass: 3500, volume_m3: 12.5, cost: 140 },
		{ name: 'Crew Consumables Pod', mass: 6000, volume_m3: 14.7, cost: 35 },
		{ name: 'ISRU Equipment Pack', mass: 8500, volume_m3: 24, cost: 200 },
		{ name: 'Construction Material Pallet', mass: 20000, volume_m3: 48, cost: 25 },
		{ name: 'Nuclear Fission Power Unit', mass: 7500, volume_m3: 9.4, cost: 500 },
	];

	const fuelOptions: FuelOption[] = [
		{ name: 'LOX (Liquid Oxygen)', density_kg_m3: 1141, cost_per_m3: 0.2 },
		{ name: 'LH₂ (Liquid Hydrogen)', density_kg_m3: 71, cost_per_m3: 0.8 },
		{ name: 'LCH₄ (Liquid Methane)', density_kg_m3: 423, cost_per_m3: 0.5 },
		{ name: 'RP-1 (Rocket-Grade Kerosene)', density_kg_m3: 820, cost_per_m3: 0.3 },
		{ name: 'Hydrazine (N₂H₄)', density_kg_m3: 1021, cost_per_m3: 1.5 },
	];

	let selectedSite = $state('');
	let selectedRocket = $state('');
	let selectedPayloads = $state<string[]>([]);
	let selectedFuel = $state('');

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

	// Payload totals (before fuel)
	let totalPayloadMass = $derived(chosenPayloadItems.reduce((s, p) => s + p.mass, 0));
	let totalPayloadVolume = $derived(chosenPayloadItems.reduce((s, p) => s + p.volume_m3, 0));
	let totalPayloadCost = $derived(chosenPayloadItems.reduce((s, p) => s + p.cost, 0));

	// Remaining capacity after payloads
	let remainingMass = $derived(chosenRocket ? chosenRocket.payloadLEO - totalPayloadMass : 0);
	let remainingVolume = $derived(chosenRocket ? chosenRocket.fairingVolume_m3 - totalPayloadVolume : 0);
	let usableFuelVolume = $derived(Math.max(0, remainingVolume * FUEL_PACKING_EFFICIENCY));

	// Fuel calculation: constrained by BOTH remaining volume and remaining mass
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
	let fuelConstraint = $derived<'mass' | 'volume' | 'none'>(() => {
		if (!chosenRocket || !chosenFuel || fuelVolume_m3() === 0) return 'none';
		const volumeLimit = usableFuelVolume;
		const massLimit = remainingMass / chosenFuel.density_kg_m3;
		return massLimit < volumeLimit ? 'mass' : 'volume';
	});

	// Grand totals including fuel
	let grandTotalMass = $derived(totalPayloadMass + fuelMass_kg());
	let grandTotalVolume = $derived(totalPayloadVolume + fuelVolume_m3());
	let totalMissionCost = $derived(totalPayloadCost + fuelCost() + (chosenRocket?.costPerLaunch ?? 0));

	// Constraint checks (payloads only, before fuel)
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
</script>

<div class="missions-tab">
	<h3 class="text-lg font-semibold mb-3">Mission Designer</h3>

	<div class="designer-grid">
		<!-- Launch Site -->
		<div class="designer-section">
			<h4 class="section-title">1. Launch Site</h4>
			<select class="selector" bind:value={selectedSite}>
				<option value="">— Select launch site —</option>
				{#each launchSites as site}
					<option value={site.name}>{site.name} ({site.lat})</option>
				{/each}
			</select>
		</div>

		<!-- Rocket -->
		<div class="designer-section">
			<h4 class="section-title">2. Launch Vehicle</h4>
			<select class="selector" bind:value={selectedRocket}>
				<option value="">— Select rocket —</option>
				{#each rocketOptions as rocket}
					<option value={rocket.name}>{rocket.name} — {formatMass(rocket.payloadLEO)} / {rocket.fairingVolume_m3} m³ — ${rocket.costPerLaunch}M</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Payloads -->
	<div class="designer-section mt-3">
		<h4 class="section-title">3. Select Payloads</h4>
		<div class="payload-checklist">
			{#each payloadOptions as p}
				<label class="payload-check" class:selected={selectedPayloads.includes(p.name)} class:over-constraint={overAny && selectedPayloads.includes(p.name)}>
					<input type="checkbox" checked={selectedPayloads.includes(p.name)} onchange={() => togglePayload(p.name)} />
					<span class="check-name">{p.name}</span>
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
					<span class="fuel-constraint-tag" class:constraint-mass={fuelConstraint() === 'mass'} class:constraint-volume={fuelConstraint() === 'volume'}>
						{fuelConstraint() === 'mass' ? '⚖ mass-limited' : '📦 volume-limited'}
					</span>
				</div>
			{/if}
		</div>
		<p class="text-xs text-[var(--color-text-dim)] mt-1">Fills 80% of remaining fairing volume. Constrained by whichever runs out first: mass or volume.</p>
	</div>

	<!-- Mission Summary -->
	{#if selectedSite || selectedRocket || selectedPayloads.length > 0}
		<div class="summary" class:warning={overAny}>
			<h4 class="section-title">Mission Summary</h4>
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

			{#if overMass}
				<div class="mass-warning">
					⚠ Payload exceeds vehicle mass capacity by {formatMass(totalPayloadMass - (chosenRocket?.payloadLEO ?? 0))}.
				</div>
			{/if}
			{#if overVolume}
				<div class="mass-warning">
					⚠ Payload exceeds fairing volume by {(totalPayloadVolume - (chosenRocket?.fairingVolume_m3 ?? 0)).toFixed(1)} m³.
				</div>
			{/if}

			<!-- Mass bar -->
			{#if chosenRocket}
				<div class="bar-label-row">
					<span class="bar-title">Mass</span>
					<span class="bar-pct">{massPercent.toFixed(0)}%</span>
				</div>
				<div class="mass-bar-container">
					<div class="mass-bar" style="width: {Math.min(100, massPercent)}%"
						class:bar-ok={!overMass}
						class:bar-over={overMass}>
					</div>
				</div>

				<div class="bar-label-row mt-1">
					<span class="bar-title">Volume</span>
					<span class="bar-pct">{volumePercent.toFixed(0)}%</span>
				</div>
				<div class="mass-bar-container">
					<div class="mass-bar" style="width: {Math.min(100, volumePercent)}%"
						class:bar-ok={!overVolume}
						class:bar-over={overVolume}>
					</div>
				</div>
			{/if}
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
	.selector:focus {
		outline: none;
		border-color: var(--color-text-dim);
	}

	.payload-checklist {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 0.25rem;
		max-height: 260px;
		overflow-y: auto;
		padding-right: 0.3rem;
	}

	.payload-check {
		display: grid;
		grid-template-columns: auto 1fr auto auto auto;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.4rem;
		border-radius: 0.25rem;
		border: 1px solid transparent;
		font-size: 0.68rem;
		cursor: pointer;
		transition: all 0.12s;
	}
	.payload-check:hover {
		background: var(--color-bg);
	}
	.payload-check.selected {
		background: rgba(99, 102, 241, 0.08);
		border-color: rgba(99, 102, 241, 0.3);
	}
	.payload-check.over-constraint {
		border-color: rgba(239, 68, 68, 0.4);
	}

	.payload-check input[type="checkbox"] {
		accent-color: #6366f1;
		cursor: pointer;
	}

	.check-name { font-weight: 500; }
	.check-mass { color: var(--color-text-dim); font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; }
	.check-vol { color: var(--color-text-dim); font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; }
	.check-cost { color: var(--color-text-dim); font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; }

	.summary {
		margin-top: 0.75rem;
		padding: 0.65rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}
	.summary.warning {
		border-color: rgba(239, 68, 68, 0.4);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.4rem;
		margin-top: 0.4rem;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.summary-item.full-width {
		grid-column: 1 / -1;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.35rem;
		border-top: 1px solid var(--color-border);
		margin-top: 0.2rem;
	}

	.sum-label {
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-dim);
	}

	.sum-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		font-weight: 600;
	}

	.cost-total {
		font-size: 0.9rem;
		color: #fbbf24;
	}

	.text-red { color: #ef4444; }
	.text-green { color: #22c55e; }

	.mass-warning {
		margin-top: 0.4rem;
		padding: 0.3rem 0.5rem;
		border-radius: 0.25rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: #f87171;
		font-size: 0.65rem;
	}

	.mass-bar-container {
		position: relative;
		height: 0.65rem;
		background: var(--color-bg);
		border-radius: 0.375rem;
		overflow: hidden;
		margin-top: 0.15rem;
	}

	.mass-bar {
		height: 100%;
		transition: width 0.3s ease;
		border-radius: 0.375rem;
	}
	.mass-bar.bar-ok { background: linear-gradient(90deg, #22c55e, #4ade80); }
	.mass-bar.bar-over { background: linear-gradient(90deg, #ef4444, #f87171); }

	.bar-label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.4rem;
	}

	.bar-title {
		font-size: 0.55rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-dim);
	}

	.bar-pct {
		font-size: 0.55rem;
		font-weight: 600;
		font-family: 'JetBrains Mono', monospace;
		color: var(--color-text-dim);
	}

	.mt-1 { margin-top: 0.25rem; }

	.fuel-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.fuel-selector {
		max-width: 420px;
	}

	.fuel-result {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 0.6rem;
		background: rgba(245, 158, 11, 0.06);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 0.375rem;
	}

	.fuel-stat {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.fuel-stat-label {
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-dim);
	}

	.fuel-stat-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		font-weight: 600;
		color: #f59e0b;
	}

	.fuel-constraint-tag {
		font-size: 0.6rem;
		font-weight: 600;
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		margin-left: auto;
	}

	.fuel-constraint-tag.constraint-mass {
		background: rgba(239, 68, 68, 0.1);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.25);
	}

	.fuel-constraint-tag.constraint-volume {
		background: rgba(99, 102, 241, 0.1);
		color: #818cf8;
		border: 1px solid rgba(99, 102, 241, 0.25);
	}

	.fuel-highlight {
		color: #f59e0b;
	}
</style>
