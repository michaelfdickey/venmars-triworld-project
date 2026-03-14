<script lang="ts">
	import { difficulty, difficultyConfig } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	interface MaterialAllocation {
		name: string;
		icon: string;
		globalProductionPerYear: string;
		globalMt: number;             // numeric global production in Mt
		currentSpacePercent: number;
		maxPercent: number;
		aerospace: boolean;
		unit: string;
		costPerMt: number;            // cost in $M per Mt
		color: string;
	}

	const materials: MaterialAllocation[] = [
		{ name: 'Steel', icon: '🔩', globalProductionPerYear: '1,950 Mt', globalMt: 1950, currentSpacePercent: 0.02, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 800, color: '#a78bfa' },
		{ name: 'Aluminum', icon: '🪶', globalProductionPerYear: '70 Mt', globalMt: 70, currentSpacePercent: 0.15, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 2400, color: '#38bdf8' },
		{ name: 'Copper', icon: '🔶', globalProductionPerYear: '25 Mt', globalMt: 25, currentSpacePercent: 0.03, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 8500, color: '#f97316' },
		{ name: 'Titanium', icon: '⚙️', globalProductionPerYear: '0.24 Mt', globalMt: 0.24, currentSpacePercent: 8.0, maxPercent: 100, aerospace: true, unit: 'Mt', costPerMt: 35000, color: '#818cf8' },
		{ name: 'Nickel', icon: '🔧', globalProductionPerYear: '3.3 Mt', globalMt: 3.3, currentSpacePercent: 0.08, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 18000, color: '#a3a3a3' },
		{ name: 'Silicon (Electronic)', icon: '🔲', globalProductionPerYear: '0.6 Mt', globalMt: 0.6, currentSpacePercent: 0.5, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 50000, color: '#22d3ee' },
		{ name: 'Rare Earth Elements', icon: '💎', globalProductionPerYear: '0.35 Mt', globalMt: 0.35, currentSpacePercent: 1.2, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 120000, color: '#e879f9' },
		{ name: 'Carbon Fiber', icon: '🧱', globalProductionPerYear: '0.18 Mt', globalMt: 0.18, currentSpacePercent: 12.0, maxPercent: 100, aerospace: true, unit: 'Mt', costPerMt: 25000, color: '#4ade80' },
		{ name: 'Inconel / Superalloys', icon: '🔥', globalProductionPerYear: '0.08 Mt', globalMt: 0.08, currentSpacePercent: 22.0, maxPercent: 100, aerospace: true, unit: 'Mt', costPerMt: 80000, color: '#fb923c' },
		{ name: 'Concrete / Cement', icon: '🧱', globalProductionPerYear: '4,100 Mt', globalMt: 4100, currentSpacePercent: 0.001, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 120, color: '#78716c' },
		{ name: 'LOX', icon: '🧪', globalProductionPerYear: '450 Mt', globalMt: 450, currentSpacePercent: 0.01, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 150, color: '#67e8f9' },
		{ name: 'LH₂', icon: '🧪', globalProductionPerYear: '94 Mt', globalMt: 94, currentSpacePercent: 0.005, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 3000, color: '#fca5a5' },
		{ name: 'LCH₄', icon: '🧪', globalProductionPerYear: '180 Mt', globalMt: 180, currentSpacePercent: 0.002, maxPercent: 10, aerospace: false, unit: 'Mt', costPerMt: 600, color: '#86efac' },
		{ name: 'RP-1 Kerosene', icon: '🛢️', globalProductionPerYear: '0.05 Mt', globalMt: 0.05, currentSpacePercent: 60.0, maxPercent: 100, aerospace: true, unit: 'Mt', costPerMt: 1200, color: '#fde047' },
		{ name: 'Hydrazine', icon: '⚠️', globalProductionPerYear: '0.03 Mt', globalMt: 0.03, currentSpacePercent: 35.0, maxPercent: 100, aerospace: true, unit: 'Mt', costPerMt: 45000, color: '#f87171' },
		{ name: 'Xenon', icon: '💨', globalProductionPerYear: '0.00004 Mt', globalMt: 0.00004, currentSpacePercent: 25.0, maxPercent: 100, aerospace: true, unit: 'Mt', costPerMt: 3500000, color: '#c4b5fd' },
	];

	let allocations = $state(materials.map(m => m.currentSpacePercent));
	let annualBudget = $derived(difficultyConfig[$difficulty].annualBudgetB);

	// Cost for each material in $B: (globalMt * pct/100) * costPerMt_$M / 1000
	function materialCostB(index: number): number {
		const m = materials[index];
		const tonnage = m.globalMt * (allocations[index] / 100);
		return (tonnage * m.costPerMt) / 1000; // $M to $B
	}

	function materialTonnage(index: number): string {
		const m = materials[index];
		const mt = m.globalMt * (allocations[index] / 100);
		if (mt >= 1) return mt.toFixed(1) + ' Mt';
		if (mt >= 0.001) return (mt * 1000).toFixed(0) + ' kt';
		return (mt * 1e6).toFixed(0) + ' t';
	}

	let totalProcurementB = $derived(
		materials.reduce((sum, _, i) => sum + materialCostB(i), 0)
	);

	function formatB(v: number): string {
		if (v >= 1) return v.toFixed(1);
		if (v >= 0.01) return v.toFixed(2);
		return v.toFixed(3);
	}

	// Set allocation from a cost value in $B
	function setFromCost(index: number, costB: number) {
		const m = materials[index];
		// costB = (globalMt * pct/100 * costPerMt) / 1000
		// pct = costB * 1000 * 100 / (globalMt * costPerMt)
		const pct = (costB * 100000) / (m.globalMt * m.costPerMt);
		allocations[index] = Math.max(0, Math.min(m.maxPercent, Math.round(pct * 100) / 100));
	}

	function handleCostInput(index: number, e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		if (!isNaN(val) && val >= 0) {
			setFromCost(index, val);
		}
	}

	// Draggable slider (by % of max)
	let draggingIndex = $state<number | null>(null);

	function startDrag(index: number, e: PointerEvent) {
		draggingIndex = index;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const track = (e.currentTarget as HTMLElement).closest('.alloc-bar-track') as HTMLElement;
		if (track) updateDrag(index, track, e.clientX);
	}

	function onDragMove(index: number, e: PointerEvent) {
		if (draggingIndex !== index) return;
		const track = (e.currentTarget as HTMLElement).closest('.alloc-bar-track') as HTMLElement;
		if (track) updateDrag(index, track, e.clientX);
	}

	function endDrag() { draggingIndex = null; }

	function updateDrag(index: number, track: HTMLElement, clientX: number) {
		const rect = track.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const max = materials[index].maxPercent;
		allocations[index] = Math.round(pct * max * 100) / 100;
	}
</script>

<div class="alloc-tab">
	<!-- Procurement summary header -->
	<div class="procurement-header">
		<div class="procurement-summary">
			<span class="proc-label">Total Procurement Cost</span>
			<span class="proc-total" class:over={totalProcurementB > annualBudget}>${formatB(totalProcurementB)}B</span>
			<span class="proc-sep">/</span>
			<span class="proc-budget">${annualBudget}B budget</span>
			<span class="proc-pct" class:over={totalProcurementB > annualBudget}>
				({((totalProcurementB / annualBudget) * 100).toFixed(1)}%)
			</span>
		</div>
		<div class="proc-bar-wrap">
			<div class="proc-bar-bg">
				<div class="proc-bar-fill" class:over={totalProcurementB > annualBudget}
					style="width: {Math.min(100, (totalProcurementB / annualBudget) * 100)}%"></div>
			</div>
		</div>
		<p class="text-xs text-[var(--color-text-dim)]">
			Allocate global production to the program. Common materials capped at <strong>10%</strong>; aerospace-specific uncapped.
			Costs are deducted from the annual budget. If you fund new production pipelines, 100% of those pipelines' output goes to the program.
		</p>
	</div>

	<div class="alloc-list">
		{#each materials as mat, i}
			<div class="alloc-row" class:aerospace={mat.aerospace}>
				<div class="alloc-top-row">
					<span class="alloc-icon">{mat.icon}</span>
					<div class="alloc-info">
						<span class="alloc-name">
							{mat.name}
							{#if mat.aerospace}
								<span class="aero-badge">AEROSPACE</span>
							{/if}
						</span>
						<span class="alloc-global">Global: {mat.globalProductionPerYear}/yr · Procuring: {materialTonnage(i)}</span>
					</div>
					<div class="alloc-cost-wrap">
						<span class="alloc-dollar">$</span>
						<input
							class="alloc-cost-input"
							type="number"
							min="0"
							step="0.1"
							value={formatB(materialCostB(i))}
							oninput={(e) => handleCostInput(i, e)}
						/>
						<span class="alloc-unit">B</span>
					</div>
				</div>
				<div class="alloc-slider-row">
					<span class="alloc-pct-label">{allocations[i].toFixed(1)}%</span>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="alloc-bar-track"
						onpointerdown={(e) => startDrag(i, e)}
						onpointermove={(e) => onDragMove(i, e)}
						onpointerup={endDrag}
						onpointercancel={endDrag}
					>
						<div class="alloc-bar-fill" class:aerospace-bar={mat.aerospace}
							style="width: {(allocations[i] / mat.maxPercent) * 100}%; background: {mat.color}"></div>
						<div class="alloc-bar-thumb" style="left: {(allocations[i] / mat.maxPercent) * 100}%; background: {mat.color}"></div>
					</div>
					<span class="alloc-cap">{mat.maxPercent}%</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="constraints-box">
		<h4 class="constraints-title">Active Constraints</h4>
		<ul class="constraints-list">
			<li>Common materials capped at <strong>10%</strong> of global production</li>
			<li>Aerospace-specific materials (titanium, carbon fiber, Inconel, etc.) can be fully allocated</li>
			<li>All procurement costs are deducted from the annual program budget</li>
			<li>Increasing allocation beyond current capacity requires additional Spending on production expansion</li>
		</ul>
	</div>
</div>

<style>
	.alloc-tab {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Procurement header */
	.procurement-header {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.procurement-summary {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.proc-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.proc-total {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 1rem;
		font-weight: 700;
		color: #4ade80;
	}
	.proc-total.over { color: #ef4444; }

	.proc-sep {
		color: var(--color-border);
		font-size: 0.8rem;
	}

	.proc-budget {
		font-size: 0.75rem;
		color: var(--color-text-dim);
	}

	.proc-pct {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}
	.proc-pct.over { color: #ef4444; }

	.proc-bar-wrap {
		width: 100%;
	}

	.proc-bar-bg {
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.proc-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #60a5fa);
		border-radius: 3px;
		transition: width 0.2s;
	}
	.proc-bar-fill.over {
		background: linear-gradient(90deg, #ef4444, #f97316);
	}

	/* Material list */
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

	.alloc-top-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.35rem;
	}

	.alloc-icon { font-size: 0.9rem; flex-shrink: 0; }

	.alloc-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
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
		font-size: 0.6rem;
		color: var(--color-text-dim);
	}

	/* Cost input */
	.alloc-cost-wrap {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		flex-shrink: 0;
		margin-left: auto;
	}

	.alloc-dollar {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		color: var(--color-text-dim);
	}

	.alloc-cost-input {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		font-weight: 700;
		color: #60a5fa;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		padding: 0.15rem 0.3rem;
		width: 5rem;
		text-align: right;
		-moz-appearance: textfield;
	}

	.alloc-cost-input::-webkit-inner-spin-button,
	.alloc-cost-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.alloc-cost-input:focus {
		outline: none;
		border-color: #60a5fa;
	}

	.alloc-unit {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}

	/* Slider row */
	.alloc-slider-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.alloc-pct-label {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text-dim);
		min-width: 3rem;
		text-align: right;
	}

	.alloc-bar-track {
		position: relative;
		flex: 1;
		height: 14px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: visible;
		cursor: pointer;
		touch-action: none;
		user-select: none;
	}

	.alloc-bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.05s;
		pointer-events: none;
	}

	.alloc-bar-thumb {
		position: absolute;
		top: -3px;
		width: 6px;
		height: 20px;
		border-radius: 3px;
		transform: translateX(-3px);
		box-shadow: 0 0 4px rgba(0,0,0,0.4);
		pointer-events: none;
		transition: left 0.05s;
	}

	.alloc-cap {
		font-size: 0.6rem;
		color: var(--color-text-dim);
		min-width: 2.5rem;
	}

	/* Constraints */
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
