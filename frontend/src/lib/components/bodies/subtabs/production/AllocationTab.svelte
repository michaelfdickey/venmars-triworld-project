<script lang="ts">
	import { difficulty, difficultyConfig } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	interface MaterialAllocation {
		name: string;
		icon: string;
		globalProductionPerYear: string;
		currentSpacePercent: number;
		maxPercent: number;
		aerospace: boolean;
		unit: string;
	}

	// Real-world approximate annual global production figures (2025 estimates)
	// Space program allocation estimates based on current aerospace industry share
	const materials: MaterialAllocation[] = [
		{ name: 'Steel', icon: '🔩', globalProductionPerYear: '1,950 Mt', currentSpacePercent: 0.02, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'Aluminum', icon: '🪶', globalProductionPerYear: '70 Mt', currentSpacePercent: 0.15, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'Copper', icon: '🔶', globalProductionPerYear: '25 Mt', currentSpacePercent: 0.03, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'Titanium', icon: '⚙️', globalProductionPerYear: '0.24 Mt', currentSpacePercent: 8.0, maxPercent: 100, aerospace: true, unit: 'Mt' },
		{ name: 'Nickel', icon: '🔧', globalProductionPerYear: '3.3 Mt', currentSpacePercent: 0.08, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'Silicon (Electronic Grade)', icon: '🔲', globalProductionPerYear: '0.6 Mt', currentSpacePercent: 0.5, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'Rare Earth Elements', icon: '💎', globalProductionPerYear: '0.35 Mt', currentSpacePercent: 1.2, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'Carbon Fiber', icon: '🧱', globalProductionPerYear: '0.18 Mt', currentSpacePercent: 12.0, maxPercent: 100, aerospace: true, unit: 'Mt' },
		{ name: 'Inconel / Superalloys', icon: '🔥', globalProductionPerYear: '0.08 Mt', currentSpacePercent: 22.0, maxPercent: 100, aerospace: true, unit: 'Mt' },
		{ name: 'Concrete / Cement', icon: '🧱', globalProductionPerYear: '4,100 Mt', currentSpacePercent: 0.001, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'LOX', icon: '🧪', globalProductionPerYear: '450 Mt', currentSpacePercent: 0.01, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'LH₂', icon: '🧪', globalProductionPerYear: '94 Mt', currentSpacePercent: 0.005, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'LCH₄', icon: '🧪', globalProductionPerYear: '180 Mt', currentSpacePercent: 0.002, maxPercent: 10, aerospace: false, unit: 'Mt' },
		{ name: 'RP-1 Kerosene', icon: '🛢️', globalProductionPerYear: '0.05 Mt', currentSpacePercent: 60.0, maxPercent: 100, aerospace: true, unit: 'Mt' },
		{ name: 'Hydrazine', icon: '⚠️', globalProductionPerYear: '0.03 Mt', currentSpacePercent: 35.0, maxPercent: 100, aerospace: true, unit: 'Mt' },
		{ name: 'Xenon', icon: '💨', globalProductionPerYear: '0.00004 Mt', currentSpacePercent: 25.0, maxPercent: 100, aerospace: true, unit: 'Mt' },
	];

	let allocations = $state(materials.map(m => m.currentSpacePercent));

	function adjustAlloc(index: number, delta: number) {
		const max = materials[index].maxPercent;
		allocations[index] = Math.max(0, Math.min(max, allocations[index] + delta));
	}
</script>

<div class="alloc-tab">
	<p class="text-xs text-[var(--color-text-dim)] mb-3">
		Current allocation of global production to the VenMars Tri-World Program.
		Common materials capped at <strong>10%</strong> of global production; aerospace-specific materials uncapped.
	</p>

	<div class="alloc-list">
		{#each materials as mat, i}
			<div class="alloc-row" class:aerospace={mat.aerospace}>
				<div class="alloc-left">
					<span class="alloc-icon">{mat.icon}</span>
					<div class="alloc-info">
						<span class="alloc-name">
							{mat.name}
							{#if mat.aerospace}
								<span class="aero-badge">AEROSPACE</span>
							{/if}
						</span>
						<span class="alloc-global">Global: {mat.globalProductionPerYear}/yr</span>
					</div>
				</div>
				<div class="alloc-right">
					<button class="alloc-btn" onclick={() => adjustAlloc(i, -0.5)} disabled={allocations[i] <= 0}>−</button>
					<span class="alloc-pct" class:maxed={allocations[i] >= mat.maxPercent}>
						{allocations[i].toFixed(1)}%
					</span>
					<button class="alloc-btn" onclick={() => adjustAlloc(i, 0.5)} disabled={allocations[i] >= mat.maxPercent}>+</button>
					<span class="alloc-cap">/ {mat.maxPercent}%</span>
				</div>
				<div class="alloc-bar-bg">
					<div class="alloc-bar" class:aerospace-bar={mat.aerospace} style="width: {(allocations[i] / mat.maxPercent) * 100}%"></div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.alloc-tab {
		display: flex;
		flex-direction: column;
	}

	.alloc-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.alloc-row {
		padding: 0.5rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}

	.alloc-row.aerospace {
		border-color: rgba(96, 165, 250, 0.3);
	}

	.alloc-left {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.3rem;
	}

	.alloc-icon { font-size: 0.9rem; flex-shrink: 0; }

	.alloc-info {
		display: flex;
		flex-direction: column;
	}

	.alloc-name {
		font-size: 0.8rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.aero-badge {
		font-size: 0.55rem;
		padding: 0.05rem 0.3rem;
		border-radius: 0.2rem;
		background: rgba(96, 165, 250, 0.2);
		color: #60a5fa;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.alloc-global {
		font-size: 0.65rem;
		color: var(--color-text-dim);
	}

	.alloc-right {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.3rem;
	}

	.alloc-btn {
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.alloc-btn:hover:not(:disabled) {
		background: var(--color-border);
		color: var(--color-text);
	}
	.alloc-btn:disabled { opacity: 0.3; cursor: not-allowed; }

	.alloc-pct {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		font-weight: 700;
		min-width: 3.5rem;
		text-align: center;
		color: #4ade80;
	}
	.alloc-pct.maxed { color: #fbbf24; }

	.alloc-cap {
		font-size: 0.6rem;
		color: var(--color-text-dim);
	}

	.alloc-bar-bg {
		height: 3px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
	}
	.alloc-bar {
		height: 100%;
		background: #4ade80;
		border-radius: 2px;
		transition: width 0.2s;
	}
	.alloc-bar.aerospace-bar {
		background: #60a5fa;
	}
</style>
