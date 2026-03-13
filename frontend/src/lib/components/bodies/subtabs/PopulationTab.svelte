<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	const popData: Record<string, { count: string; desc: string; growth: string }> = {
		earth: { count: '8,000,000,000', desc: 'Home world — industrial & financial base', growth: '+0.8%/yr' },
		moon: { count: '0', desc: 'Crew rotations for construction operations', growth: 'N/A' },
		venus: { count: '0', desc: 'Automated platforms — future cloud habitats', growth: 'N/A' },
		mars: { count: '0', desc: 'No settlements yet — receiving world', growth: 'N/A' },
		asteroids: { count: '0', desc: 'Remote drone operations', growth: 'N/A' }
	};

	let data = $derived(popData[bodyId] ?? popData.earth);
</script>

<div>
	<h3 class="text-lg font-semibold mb-4">Population</h3>

	<div class="bg-[var(--color-bg-panel)] rounded-lg p-6 border border-[var(--color-border)] mb-4">
		<p class="text-xs text-[var(--color-text-dim)] mb-1">Current Population</p>
		<p class="text-3xl font-mono font-bold">{data.count}</p>
		<p class="text-xs text-[var(--color-text-dim)] mt-2">{data.desc}</p>
	</div>

	<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
		<p class="text-xs text-[var(--color-text-dim)] mb-1">Growth Rate</p>
		<p class="text-lg font-mono">{data.growth}</p>
	</div>

	{#if bodyId === 'earth'}
		<div class="mt-4 p-3 bg-[var(--color-accent-earth)]/10 border border-[var(--color-accent-earth)]/30 rounded-lg">
			<p class="text-xs text-[var(--color-accent-earth)]">
				Earth population drives funding, workforce, and political support for the terraforming project.
				Higher population → more resources, but also more competing priorities.
			</p>
		</div>
	{/if}
</div>
