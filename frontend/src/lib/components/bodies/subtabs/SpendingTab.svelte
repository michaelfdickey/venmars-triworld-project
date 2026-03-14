<script lang="ts">
	import { difficulty, difficultyConfig } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	interface SpendCategory {
		name: string;
		icon: string;
		allocated: number;
		description: string;
	}

	const categories: SpendCategory[] = $state([
		{ name: 'Launch Infrastructure', icon: '🚀', allocated: 85, description: 'Launch pads, integration bays, ground support' },
		{ name: 'Rocket Manufacturing', icon: '🏭', allocated: 210, description: 'Vehicle production, engines, avionics' },
		{ name: 'Propellant Production', icon: '⚗️', allocated: 45, description: 'LOX, LCH₄, LH₂, RP-1 plants' },
		{ name: 'Payload Production', icon: '📦', allocated: 120, description: 'Satellites, habitats, containers, equipment' },
		{ name: 'R&D', icon: '🔬', allocated: 65, description: 'Advanced propulsion, materials science, life support' },
		{ name: 'Mining & Extraction', icon: '⛏️', allocated: 55, description: 'Iron, aluminum, titanium, rare earth mines' },
		{ name: 'Refining & Materials', icon: '🔩', allocated: 95, description: 'Steel mills, alloy foundries, composite plants' },
		{ name: 'Skilled Labor & Training', icon: '👷', allocated: 40, description: 'Engineers, technicians, operators, pilots' },
		{ name: 'Mission Operations', icon: '🖥️', allocated: 30, description: 'Ground control, communications, tracking' },
		{ name: 'Spaceport Construction', icon: '🏗️', allocated: 75, description: 'New launch site development worldwide' },
	]);

	let totalAllocated = $derived(categories.reduce((sum, c) => sum + c.allocated, 0));
	let annualBudget = $derived(difficultyConfig[$difficulty].annualBudgetB);
	let remaining = $derived(annualBudget - totalAllocated);

	function adjust(index: number, delta: number) {
		const next = categories[index].allocated + delta;
		if (next < 0) return;
		const newTotal = totalAllocated + delta;
		if (newTotal > annualBudget) return;
		categories[index].allocated = next;
	}
</script>

<div class="spending-tab">
	<div class="spending-header">
		<h3 class="text-lg font-semibold">Program Spending</h3>
		<div class="budget-summary">
			<span class="budget-label">Annual Budget ({difficultyConfig[$difficulty].gdpPercent}% GDP):</span>
			<span class="budget-total">${annualBudget}B</span>
			<span class="budget-sep">|</span>
			<span class="budget-label">Allocated:</span>
			<span class="budget-allocated">${totalAllocated}B</span>
			<span class="budget-sep">|</span>
			<span class="budget-label">Remaining:</span>
			<span class="budget-remaining" class:over={remaining < 0}>${remaining}B</span>
		</div>
	</div>

	<div class="budget-bar-container">
		<div class="budget-bar-bg">
			<div class="budget-bar-fill" style="width: {Math.min(100, (totalAllocated / annualBudget) * 100)}%"></div>
		</div>
		<span class="budget-pct">{((totalAllocated / annualBudget) * 100).toFixed(1)}%</span>
	</div>

	<div class="spend-grid">
		{#each categories as cat, i}
			<div class="spend-card">
				<div class="spend-top">
					<span class="spend-icon">{cat.icon}</span>
					<div class="spend-info">
						<span class="spend-name">{cat.name}</span>
						<span class="spend-desc">{cat.description}</span>
					</div>
				</div>
				<div class="spend-controls">
					<button class="adj-btn" onclick={() => adjust(i, -5)} disabled={cat.allocated <= 0}>−5</button>
					<button class="adj-btn" onclick={() => adjust(i, -1)} disabled={cat.allocated <= 0}>−</button>
					<span class="spend-amount">${cat.allocated}B</span>
					<button class="adj-btn" onclick={() => adjust(i, 1)} disabled={remaining <= 0}>+</button>
					<button class="adj-btn" onclick={() => adjust(i, 5)} disabled={remaining < 5}>+5</button>
				</div>
				<div class="spend-bar-bg">
					<div class="spend-bar" style="width: {(cat.allocated / annualBudget) * 100}%"></div>
				</div>
			</div>
		{/each}
	</div>

	<div class="constraints-box">
		<h4 class="constraints-title">Active Constraints</h4>
		<ul class="constraints-list">
			<li>Max <strong>10%</strong> of common materials global production can be diverted</li>
			<li>Aerospace-specific materials (carbon fiber, Inconel, etc.) can be fully allocated</li>
			<li>Industrial throughput limited by existing factory capacity — expand via spending</li>
			<li>Skilled labor pool grows at ~5%/year — accelerate via training spend</li>
			<li>Launch cadence limited by pad turnaround — build more pads to increase</li>
			<li>Propellant production scales with refinery investment</li>
		</ul>
	</div>
</div>

<style>
	.spending-tab {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.spending-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.budget-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		flex-wrap: wrap;
	}

	.budget-label { color: var(--color-text-dim); }
	.budget-total {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-weight: 700;
		color: #4ade80;
	}
	.budget-allocated {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-weight: 700;
		color: #60a5fa;
	}
	.budget-remaining {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-weight: 700;
		color: #4ade80;
	}
	.budget-remaining.over { color: #ef4444; }
	.budget-sep { color: var(--color-border); }

	.budget-bar-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.budget-bar-bg {
		flex: 1;
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}
	.budget-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #60a5fa);
		border-radius: 3px;
		transition: width 0.2s;
	}
	.budget-pct {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: var(--color-text-dim);
		min-width: 3rem;
		text-align: right;
	}

	.spend-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.spend-card {
		padding: 0.6rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}

	.spend-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.spend-icon { font-size: 1.1rem; flex-shrink: 0; }
	.spend-info { display: flex; flex-direction: column; }
	.spend-name { font-size: 0.8rem; font-weight: 600; }
	.spend-desc { font-size: 0.65rem; color: var(--color-text-dim); }

	.spend-controls {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.3rem;
	}

	.adj-btn {
		padding: 0.15rem 0.4rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.adj-btn:hover:not(:disabled) {
		background: var(--color-border);
		color: var(--color-text);
	}
	.adj-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.spend-amount {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.85rem;
		font-weight: 700;
		min-width: 4rem;
		text-align: center;
		color: #60a5fa;
	}

	.spend-bar-bg {
		height: 3px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
	}
	.spend-bar {
		height: 100%;
		background: #60a5fa;
		border-radius: 2px;
		transition: width 0.2s;
	}

	.constraints-box {
		padding: 0.75rem;
		border-radius: 0.4rem;
		border: 1px dashed var(--color-border);
		background: var(--color-bg-panel);
	}

	.constraints-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.4rem;
	}

	.constraints-list {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.7rem;
		color: var(--color-text-dim);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.constraints-list li::before {
		content: '• ';
		color: var(--color-border);
	}
</style>
