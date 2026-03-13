<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	type Category = 'raw' | 'compound' | 'specialty' | 'facility';

	interface Material {
		name: string;
		icon: string;
		category: Category;
		stockpile: number;
		unit: string;
		rate: string;
		available: boolean;
	}

	const categoryLabels: Record<Category, string> = {
		raw: 'Raw Materials',
		compound: 'Compounds & Propellants',
		specialty: 'Specialty Components',
		facility: 'Facilities',
	};

	const categoryIcons: Record<Category, string> = {
		raw: '⛏️',
		compound: '⚗️',
		specialty: '🛡️',
		facility: '🏭',
	};

	const materialData: Record<string, Material[]> = {
		earth: [
			// Raw Materials
			{ name: 'Iron Ore', icon: '🪨', category: 'raw', stockpile: 500000, unit: 't', rate: '+2,400 t/day', available: true },
			{ name: 'Aluminum Ore (Bauxite)', icon: '🪨', category: 'raw', stockpile: 180000, unit: 't', rate: '+800 t/day', available: true },
			{ name: 'Titanium Ore (Rutile)', icon: '🪨', category: 'raw', stockpile: 24000, unit: 't', rate: '+60 t/day', available: true },
			{ name: 'Silicon (Raw)', icon: '🔲', category: 'raw', stockpile: 90000, unit: 't', rate: '+300 t/day', available: true },
			{ name: 'Rare Earth Ore', icon: '💎', category: 'raw', stockpile: 5200, unit: 't', rate: '+12 t/day', available: true },
			{ name: 'Water (Purified)', icon: '💧', category: 'raw', stockpile: 1200000, unit: 'L', rate: 'unlimited', available: true },

			// Compounds & Propellants
			{ name: 'Liquid Hydrogen (LH₂)', icon: '🧪', category: 'compound', stockpile: 8400, unit: 't', rate: '+45 t/day', available: true },
			{ name: 'Liquid Oxygen (LOX)', icon: '🧪', category: 'compound', stockpile: 32000, unit: 't', rate: '+180 t/day', available: true },
			{ name: 'Liquid Methane (LCH₄)', icon: '🧪', category: 'compound', stockpile: 12500, unit: 't', rate: '+80 t/day', available: true },
			{ name: 'Liquid Nitrogen (LN₂)', icon: '🧊', category: 'compound', stockpile: 18000, unit: 't', rate: '+120 t/day', available: true },
			{ name: 'RP-1 Kerosene', icon: '🛢️', category: 'compound', stockpile: 15000, unit: 't', rate: '+60 t/day', available: true },
			{ name: 'Hydrazine (N₂H₄)', icon: '⚠️', category: 'compound', stockpile: 420, unit: 't', rate: '+3 t/day', available: true },
			{ name: 'Nitrogen Tetroxide (NTO)', icon: '⚠️', category: 'compound', stockpile: 380, unit: 't', rate: '+2.5 t/day', available: true },
			{ name: 'Xenon (Ion Thruster)', icon: '💨', category: 'compound', stockpile: 85, unit: 't', rate: '+0.4 t/day', available: true },

			// Specialty Components
			{ name: 'Aerospace-Grade Stainless (304L)', icon: '🔩', category: 'specialty', stockpile: 6200, unit: 't', rate: '+28 t/day', available: true },
			{ name: 'Carbon Fiber Composite', icon: '🧱', category: 'specialty', stockpile: 1800, unit: 't', rate: '+8 t/day', available: true },
			{ name: 'COPV Tanks', icon: '🫧', category: 'specialty', stockpile: 340, unit: 'units', rate: '+4 /day', available: true },
			{ name: 'Thermal Protection Tiles (PICA-X)', icon: '🛡️', category: 'specialty', stockpile: 28000, unit: 'tiles', rate: '+120 /day', available: true },
			{ name: 'Ablative Heat Shield Panels', icon: '🛡️', category: 'specialty', stockpile: 4500, unit: 'panels', rate: '+18 /day', available: true },
			{ name: 'Inconel Alloy', icon: '🔧', category: 'specialty', stockpile: 780, unit: 't', rate: '+3 t/day', available: true },
			{ name: 'Titanium Alloy (Ti-6Al-4V)', icon: '🔧', category: 'specialty', stockpile: 1450, unit: 't', rate: '+6 t/day', available: true },
			{ name: 'Solar Cell Panels', icon: '☀️', category: 'specialty', stockpile: 12000, unit: 'm²', rate: '+50 m²/day', available: true },
			{ name: 'Superconducting Magnets', icon: '🧲', category: 'specialty', stockpile: 48, unit: 'units', rate: '+0.2 /day', available: true },
			{ name: 'Avionics Modules', icon: '📡', category: 'specialty', stockpile: 160, unit: 'units', rate: '+2 /day', available: true },
			{ name: 'Raptor / Merlin Engines', icon: '🔥', category: 'specialty', stockpile: 64, unit: 'engines', rate: '+0.5 /day', available: true },

			// Facilities
			{ name: 'Chemical Launch Pads', icon: '🚀', category: 'facility', stockpile: 5, unit: 'pads', rate: '50 launches/yr', available: true },
			{ name: 'Payload Integration Bays', icon: '📦', category: 'facility', stockpile: 3, unit: 'bays', rate: '150t max/launch', available: true },
			{ name: 'Mission Control Centers', icon: '🖥️', category: 'facility', stockpile: 2, unit: 'centers', rate: '12 concurrent ops', available: true },
			{ name: 'Propellant Plants', icon: '🏭', category: 'facility', stockpile: 4, unit: 'plants', rate: 'see compounds', available: true },
		],
		moon: [
			{ name: 'Regolith', icon: '🪨', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Ilmenite (FeTiO₃)', icon: '🪨', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Anorthite (CaAl₂Si₂O₈)', icon: '🪨', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Helium-3', icon: '⚛️', category: 'raw', stockpile: 0, unit: 'kg', rate: '0 kg/day', available: false },

			{ name: 'Liquid Oxygen (LOX)', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Aluminum (Refined)', icon: '🪶', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Titanium (Refined)', icon: '🔧', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Silicon (Purified)', icon: '🔲', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Steel Beams', icon: '🔩', category: 'specialty', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Solar Cell Panels', icon: '☀️', category: 'specialty', stockpile: 0, unit: 'm²', rate: '0 m²/day', available: false },
			{ name: 'Superconducting Magnets', icon: '🧲', category: 'specialty', stockpile: 0, unit: 'units', rate: '0 /day', available: false },

			{ name: 'Electromagnetic Mass Driver', icon: '⚡', category: 'facility', stockpile: 0, unit: 'drivers', rate: '0 t/day', available: false },
			{ name: 'Regolith Miners', icon: '⛏️', category: 'facility', stockpile: 0, unit: 'miners', rate: '0 t/day', available: false },
			{ name: 'Smelters', icon: '🔥', category: 'facility', stockpile: 0, unit: 'smelters', rate: '0 t/day', available: false },
			{ name: 'Solar Panel Arrays', icon: '☀️', category: 'facility', stockpile: 0, unit: 'arrays', rate: '0 MW', available: false },
		],
		venus: [
			{ name: 'Bulk Atmosphere (CO₂ + N₂)', icon: '🌫️', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Sulfuric Acid (H₂SO₄)', icon: '☣️', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Carbon (Elemental)', icon: '⬛', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Compressed CO₂', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Nitrogen (Separated)', icon: '🟦', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Oxygen (Cracked)', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Sulfur (Elemental)', icon: '🟡', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Carbon Composite Panels', icon: '🧱', category: 'specialty', stockpile: 0, unit: 'panels', rate: '0 /day', available: false },
			{ name: 'Sealed Transfer Containers', icon: '📦', category: 'specialty', stockpile: 0, unit: 'containers', rate: '0 /day', available: false },
			{ name: 'Acid-Resistant Coatings', icon: '🛡️', category: 'specialty', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Floating Platforms', icon: '🎈', category: 'facility', stockpile: 0, unit: 'platforms', rate: '—', available: false },
			{ name: 'Ram Scoop Intakes', icon: '🌬️', category: 'facility', stockpile: 0, unit: 'scoops', rate: '0 t/day', available: false },
			{ name: 'Gas Compressors', icon: '🔧', category: 'facility', stockpile: 0, unit: 'compressors', rate: '0 t/day', available: false },
			{ name: 'CO₂ Crackers', icon: '⚗️', category: 'facility', stockpile: 0, unit: 'crackers', rate: '0 t/day', available: false },
			{ name: 'Container Forges', icon: '📦', category: 'facility', stockpile: 0, unit: 'forges', rate: '0 /day', available: false },
			{ name: 'Floating Mass Drivers', icon: '⚡', category: 'facility', stockpile: 0, unit: 'drivers', rate: '0 t/day', available: false },
			{ name: 'Solar Concentrators', icon: '☀️', category: 'facility', stockpile: 0, unit: 'arrays', rate: '0 MW', available: false },
		],
		mars: [
			{ name: 'Incoming Atmosphere (CO₂ + N₂)', icon: '🌫️', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Regolith (Iron-Rich)', icon: '🪨', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Polar Ice (H₂O + CO₂)', icon: '🧊', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Perchlorates', icon: '☣️', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Liquid Water', icon: '💧', category: 'compound', stockpile: 0, unit: 'L', rate: '0 L/day', available: false },
			{ name: 'Liquid Oxygen (LOX)', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Liquid Methane (LCH₄)', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day (Sabatier)', available: false },

			{ name: 'Habitat Dome Panels', icon: '🛡️', category: 'specialty', stockpile: 0, unit: 'panels', rate: '0 /day', available: false },
			{ name: 'Radiation Shielding', icon: '🛡️', category: 'specialty', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Salvaged Container Metal', icon: '🔩', category: 'specialty', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Receiving Stations', icon: '📡', category: 'facility', stockpile: 0, unit: 'stations', rate: '0 containers/day', available: false },
			{ name: 'Atmosphere Monitors', icon: '🌡️', category: 'facility', stockpile: 0, unit: 'monitors', rate: '—', available: false },
			{ name: 'Salvage Drone Bays', icon: '🤖', category: 'facility', stockpile: 0, unit: 'bays', rate: '0 /day', available: false },
			{ name: 'Ice Miners', icon: '🧊', category: 'facility', stockpile: 0, unit: 'miners', rate: '0 t/day', available: false },
		],
		asteroids: [
			{ name: 'Carbonaceous Ore', icon: '🪨', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Nickel-Iron Ore', icon: '🪨', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Water Ice', icon: '🧊', category: 'raw', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Platinum Group Metals', icon: '💎', category: 'raw', stockpile: 0, unit: 'kg', rate: '0 kg/day', available: false },

			{ name: 'Liquid Hydrogen (LH₂)', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Liquid Oxygen (LOX)', icon: '🧪', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Refined Nickel', icon: '🔩', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'Refined Iron', icon: '🔩', category: 'compound', stockpile: 0, unit: 't', rate: '0 t/day', available: false },

			{ name: 'Structural Steel Plates', icon: '🔩', category: 'specialty', stockpile: 0, unit: 't', rate: '0 t/day', available: false },
			{ name: 'COPV Tanks (In-Situ)', icon: '🫧', category: 'specialty', stockpile: 0, unit: 'units', rate: '0 /day', available: false },

			{ name: 'Mining Drones', icon: '🤖', category: 'facility', stockpile: 0, unit: 'drones', rate: '0 t/day', available: false },
			{ name: 'Ice Harvesters', icon: '🧊', category: 'facility', stockpile: 0, unit: 'harvesters', rate: '0 t/day', available: false },
			{ name: 'Metal Refineries', icon: '🔥', category: 'facility', stockpile: 0, unit: 'refineries', rate: '0 t/day', available: false },
		],
	};

	const categories: Category[] = ['raw', 'compound', 'specialty', 'facility'];

	let materials = $derived(materialData[bodyId] ?? []);
	let grouped = $derived(
		categories
			.map(cat => ({ cat, items: materials.filter(m => m.category === cat) }))
			.filter(g => g.items.length > 0)
	);
</script>

<div class="production-tab">
	<h3 class="text-lg font-semibold mb-1">Production & Inventory</h3>
	<p class="text-xs text-[var(--color-text-dim)] mb-4">
		{#if bodyId === 'earth'}
			Earth industrial base — raw materials, propellants, and aerospace components
		{:else if bodyId === 'venus'}
			Factorio-style chains — harvest atmosphere → crack → compress → containerize → launch
		{:else if bodyId === 'moon'}
			Lunar in-situ resource utilization (ISRU)
		{:else if bodyId === 'mars'}
			Mars ISRU and incoming atmospheric deliveries
		{:else}
			Asteroid mining and refining operations
		{/if}
	</p>

	{#each grouped as { cat, items }}
		<div class="category-section">
			<div class="category-header">
				<span>{categoryIcons[cat]}</span>
				<span>{categoryLabels[cat]}</span>
				<span class="category-count">{items.length}</span>
			</div>

			<div class="material-grid">
				{#each items as mat}
					<div class="material-card" class:locked={!mat.available}>
						<div class="mat-top">
							<span class="mat-icon">{mat.icon}</span>
							<span class="mat-name">{mat.name}</span>
						</div>
						<div class="mat-bottom">
							<span class="mat-stockpile">
								{mat.available ? mat.stockpile.toLocaleString() : '—'}
								<span class="mat-unit">{mat.unit}</span>
							</span>
							<span class="mat-rate" class:positive={mat.available && mat.rate.includes('+')}>
								{mat.available ? mat.rate : 'LOCKED'}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if bodyId !== 'earth'}
		<div class="mt-4 p-3 border border-dashed border-[var(--color-border)] rounded-lg text-center">
			<p class="text-xs text-[var(--color-text-dim)]">
				{#if bodyId === 'moon'}
					🔒 Requires: Lunar base construction (Milestone 1)
				{:else if bodyId === 'venus'}
					🔒 Requires: Venus orbital infrastructure (Milestone 2)
				{:else if bodyId === 'mars'}
					🔒 Requires: Mars orbital infrastructure
				{:else}
					🔒 Requires: Asteroid belt access (Milestone 3)
				{/if}
			</p>
		</div>
	{/if}
</div>

<style>
	.production-tab {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.category-section {
		margin-bottom: 1rem;
	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.5rem;
	}

	.category-count {
		margin-left: auto;
		font-size: 0.65rem;
		background: var(--color-border);
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		font-weight: 500;
	}

	.material-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.4rem;
	}

	.material-card {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.5rem 0.65rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
		transition: border-color 0.15s;
	}

	.material-card:hover:not(.locked) {
		border-color: var(--color-text-dim);
	}

	.material-card.locked {
		opacity: 0.4;
		background: var(--color-bg-panel);
	}

	.mat-top {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.mat-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.mat-name {
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.2;
	}

	.mat-bottom {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.mat-stockpile {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.mat-unit {
		font-size: 0.6rem;
		font-weight: 400;
		color: var(--color-text-dim);
		margin-left: 0.15rem;
	}

	.mat-rate {
		font-size: 0.65rem;
		color: var(--color-text-dim);
	}

	.mat-rate.positive {
		color: #4ade80;
	}
</style>
