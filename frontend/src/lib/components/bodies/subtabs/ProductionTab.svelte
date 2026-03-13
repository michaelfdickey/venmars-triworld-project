<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	interface ProductionLine {
		name: string;
		icon: string;
		count: number;
		rate: string;
		available: boolean;
	}

	const productionData: Record<string, ProductionLine[]> = {
		earth: [
			{ name: 'Rocket Launch Pads', icon: '🚀', count: 5, rate: '50 launches/yr', available: true },
			{ name: 'Payload Integration', icon: '📦', count: 3, rate: '150t max per launch', available: true },
			{ name: 'Component Factories', icon: '🏭', count: 10, rate: '500 t/yr space hardware', available: true }
		],
		moon: [
			{ name: 'Electromagnetic Mass Driver', icon: '⚡', count: 0, rate: '0 t/day', available: false },
			{ name: 'Regolith Miners', icon: '⛏️', count: 0, rate: '0 t/day', available: false },
			{ name: 'Smelters', icon: '🔥', count: 0, rate: '0 t/day', available: false },
			{ name: 'Solar Panel Arrays', icon: '☀️', count: 0, rate: '0 MW', available: false }
		],
		venus: [
			{ name: 'Floating Mass Drivers', icon: '⚡', count: 0, rate: '0 t/day', available: false },
			{ name: 'Atmospheric Intakes', icon: '🌬️', count: 0, rate: '0 t/day gas', available: false },
			{ name: 'Container Factories', icon: '📦', count: 0, rate: '0 containers/day', available: false },
			{ name: 'Gas Compressors', icon: '🔧', count: 0, rate: '0 t/day', available: false },
			{ name: 'Carbon Extractors', icon: '⚗️', count: 0, rate: '0 t/day carbon', available: false },
			{ name: 'Solar Concentrators', icon: '☀️', count: 0, rate: '0 MW', available: false }
		],
		mars: [
			{ name: 'Receiving Stations', icon: '📡', count: 0, rate: '0 containers/day', available: false },
			{ name: 'Atmosphere Monitors', icon: '🌡️', count: 0, rate: 'N/A', available: false }
		],
		asteroids: [
			{ name: 'Mining Drones', icon: '🤖', count: 0, rate: '0 t/day', available: false },
			{ name: 'Ice Harvesters', icon: '🧊', count: 0, rate: '0 t/day H₂O', available: false },
			{ name: 'Metal Refineries', icon: '🔥', count: 0, rate: '0 t/day metals', available: false }
		]
	};

	let lines = $derived(productionData[bodyId] ?? []);
</script>

<div>
	<h3 class="text-lg font-semibold mb-4">Production Capacity</h3>

	{#if bodyId === 'venus'}
		<p class="text-xs text-[var(--color-accent-venus)] mb-4">
			Factorio-style production chains — harvest atmosphere → compress → containerize → launch
		</p>
	{/if}

	<div class="space-y-3">
		{#each lines as line}
			<div class="flex items-center justify-between p-3 rounded-lg border transition-all
				{line.available
					? 'bg-[var(--color-bg-panel)] border-[var(--color-border)]'
					: 'bg-[var(--color-bg-panel)]/50 border-[var(--color-border)]/50 opacity-50'}">
				<div class="flex items-center gap-3">
					<span class="text-xl">{line.icon}</span>
					<div>
						<p class="text-sm font-medium">{line.name}</p>
						<p class="text-xs text-[var(--color-text-dim)]">{line.rate}</p>
					</div>
				</div>
				<div class="text-right">
					<p class="text-lg font-mono font-bold">{line.count}</p>
					{#if !line.available}
						<p class="text-[10px] text-[var(--color-accent-mars)]">LOCKED</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>

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
