<script lang="ts">
	import { gameState } from '$lib/stores/gameStore';

	let state = $derived($gameState);
	let year = $derived(state?.year ?? 2040);
</script>

<div class="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-panel)] border-b border-[var(--color-border)] text-sm">
	<div class="flex items-center gap-6">
		<span class="font-bold text-[var(--color-accent-earth)]">VenMars</span>
		<span class="text-[var(--color-text-dim)]">Year: <span class="text-[var(--color-text)] font-mono">{year.toFixed(1)}</span></span>
	</div>

	<div class="flex items-center gap-6">
		<!-- Milestone indicators -->
		<div class="flex items-center gap-3 text-xs">
			<span class="flex items-center gap-1" title="Lunar Mass Driver">
				<span class="w-2 h-2 rounded-full {state?.milestones.lunar_mass_driver ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				LMD
			</span>
			<span class="flex items-center gap-1" title="Venus Mass Driver">
				<span class="w-2 h-2 rounded-full {state?.milestones.venus_mass_driver ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				VMD
			</span>
			<span class="flex items-center gap-1" title="Asteroid Harvesting">
				<span class="w-2 h-2 rounded-full {state?.milestones.asteroid_harvesting ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				AST
			</span>
		</div>

		<!-- Speed controls -->
		<div class="flex items-center gap-2">
			<button class="px-2 py-0.5 rounded bg-[var(--color-bg-card)] hover:bg-[var(--color-border)] text-xs cursor-pointer">⏸</button>
			<button class="px-2 py-0.5 rounded bg-[var(--color-bg-card)] hover:bg-[var(--color-border)] text-xs cursor-pointer">1×</button>
			<button class="px-2 py-0.5 rounded bg-[var(--color-bg-card)] hover:bg-[var(--color-border)] text-xs cursor-pointer">10×</button>
			<button class="px-2 py-0.5 rounded bg-[var(--color-bg-card)] hover:bg-[var(--color-border)] text-xs cursor-pointer">100×</button>
		</div>
	</div>
</div>
