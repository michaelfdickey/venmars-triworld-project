<script lang="ts">
	import { difficulty, difficultyConfig, materialAllocations, materialDefs, materialCostB as matCostBFn } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	interface MaterialDisplay {
		name: string;
		icon: string;
		globalProductionPerYear: string;
		maxPercent: number;
		aerospace: boolean;
		annualOutput: string;
		dailyOutput: string;
		trend: 'up' | 'flat' | 'down';
		topProducers: string;
	}

	const materials: MaterialDisplay[] = [
		{ name: 'Steel', icon: '🔩', globalProductionPerYear: '1,950 Mt', maxPercent: 10, aerospace: false, annualOutput: '1,950 Mt', dailyOutput: '5,342 Mt/d', trend: 'flat', topProducers: 'China, India, Japan' },
		{ name: 'Aluminum', icon: '🪶', globalProductionPerYear: '70 Mt', maxPercent: 10, aerospace: false, annualOutput: '70 Mt', dailyOutput: '192 kt/d', trend: 'up', topProducers: 'China, India, Russia' },
		{ name: 'Copper', icon: '🔶', globalProductionPerYear: '25 Mt', maxPercent: 10, aerospace: false, annualOutput: '25 Mt', dailyOutput: '68 kt/d', trend: 'flat', topProducers: 'Chile, China, Congo' },
		{ name: 'Titanium', icon: '⚙️', globalProductionPerYear: '0.24 Mt', maxPercent: 100, aerospace: true, annualOutput: '0.24 Mt', dailyOutput: '660 t/d', trend: 'up', topProducers: 'China, Japan, Russia' },
		{ name: 'Nickel', icon: '🔧', globalProductionPerYear: '3.3 Mt', maxPercent: 10, aerospace: false, annualOutput: '3.3 Mt', dailyOutput: '9 kt/d', trend: 'up', topProducers: 'Indonesia, Philippines, Russia' },
		{ name: 'Silicon (Electronic)', icon: '🔲', globalProductionPerYear: '0.6 Mt', maxPercent: 10, aerospace: false, annualOutput: '0.6 Mt', dailyOutput: '1.6 kt/d', trend: 'up', topProducers: 'China, Japan, S.Korea' },
		{ name: 'Rare Earth Elements', icon: '💎', globalProductionPerYear: '0.35 Mt', maxPercent: 10, aerospace: false, annualOutput: '0.35 Mt', dailyOutput: '960 t/d', trend: 'up', topProducers: 'China, Myanmar, Australia' },
		{ name: 'Carbon Fiber', icon: '🧱', globalProductionPerYear: '0.18 Mt', maxPercent: 100, aerospace: true, annualOutput: '0.18 Mt', dailyOutput: '490 t/d', trend: 'up', topProducers: 'Japan, USA, China' },
		{ name: 'Inconel / Superalloys', icon: '🔥', globalProductionPerYear: '0.08 Mt', maxPercent: 100, aerospace: true, annualOutput: '0.08 Mt', dailyOutput: '220 t/d', trend: 'flat', topProducers: 'USA, UK, Germany' },
		{ name: 'Concrete / Cement', icon: '🧱', globalProductionPerYear: '4,100 Mt', maxPercent: 10, aerospace: false, annualOutput: '4,100 Mt', dailyOutput: '11,233 Mt/d', trend: 'flat', topProducers: 'China, India, Vietnam' },
		{ name: 'LOX', icon: '🧪', globalProductionPerYear: '450 Mt', maxPercent: 10, aerospace: false, annualOutput: '450 Mt', dailyOutput: '1,233 kt/d', trend: 'up', topProducers: 'Global (air separation)' },
		{ name: 'LH₂', icon: '🧪', globalProductionPerYear: '94 Mt', maxPercent: 10, aerospace: false, annualOutput: '94 Mt', dailyOutput: '257 kt/d', trend: 'up', topProducers: 'China, USA, EU' },
		{ name: 'LCH₄', icon: '🧪', globalProductionPerYear: '180 Mt', maxPercent: 10, aerospace: false, annualOutput: '180 Mt', dailyOutput: '493 kt/d', trend: 'flat', topProducers: 'USA, Russia, Iran' },
		{ name: 'RP-1 Kerosene', icon: '🛢️', globalProductionPerYear: '0.05 Mt', maxPercent: 100, aerospace: true, annualOutput: '0.05 Mt', dailyOutput: '137 t/d', trend: 'flat', topProducers: 'USA, Russia' },
		{ name: 'Hydrazine', icon: '⚠️', globalProductionPerYear: '0.03 Mt', maxPercent: 100, aerospace: true, annualOutput: '0.03 Mt', dailyOutput: '82 t/d', trend: 'flat', topProducers: 'USA, Japan, France' },
		{ name: 'Xenon', icon: '💨', globalProductionPerYear: '0.00004 Mt', maxPercent: 100, aerospace: true, annualOutput: '40 t', dailyOutput: '110 kg/d', trend: 'flat', topProducers: 'Global (air separation)' },
		{ name: 'Electricity', icon: '⚡', globalProductionPerYear: '29,000 TWh', maxPercent: 10, aerospace: false, annualOutput: '29,000 TWh', dailyOutput: '79.5 TWh/d', trend: 'up', topProducers: 'China, USA, India' },
	];

	const trendIcon: Record<string, string> = { up: '↑', flat: '→', down: '↓' };
	const trendColor: Record<string, string> = { up: '#4ade80', flat: '#fbbf24', down: '#ef4444' };

	let allocations = $derived($materialAllocations);
	let annualBudget = $derived(difficultyConfig[$difficulty].annualBudgetB);

	function setAllocation(index: number, value: number) {
		materialAllocations.update(arr => {
			const next = [...arr];
			next[index] = value;
			return next;
		});
	}

	// Cost for each material in $B
	function materialCostBLocal(index: number): number {
		return matCostBFn(index, allocations[index]);
	}

	function materialTonnage(index: number): string {
		const m = materialDefs[index];
		const val = m.globalMt * (allocations[index] / 100);
		// Electricity uses TWh not Mt
		if (m.name === 'Electricity') {
			if (val >= 1) return val.toFixed(1) + ' TWh';
			if (val >= 0.001) return (val * 1000).toFixed(0) + ' GWh';
			return (val * 1e6).toFixed(0) + ' MWh';
		}
		if (val >= 1) return val.toFixed(1) + ' Mt';
		if (val >= 0.001) return (val * 1000).toFixed(0) + ' kt';
		return (val * 1e6).toFixed(0) + ' t';
	}

	let totalProcurementB = $derived(
		materialDefs.reduce((sum, _, i) => sum + materialCostBLocal(i), 0)
	);

	function formatB(v: number): string {
		if (v >= 1) return v.toFixed(1);
		if (v >= 0.01) return v.toFixed(2);
		return v.toFixed(3);
	}

	// Set allocation from a cost value in $B
	function setFromCost(index: number, costB: number) {
		const m = materialDefs[index];
		const pct = (costB * 100000) / (m.globalMt * m.costPerMt);
		setAllocation(index, Math.max(0, Math.min(materials[index].maxPercent, Math.round(pct * 100) / 100)));
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
		setAllocation(index, Math.round(pct * max * 100) / 100);
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
		<!-- Column headers -->
		<div class="alloc-col-headers">
			<span class="ach-alloc">Material &amp; Allocation</span>
			<span class="ach-val">Annual</span>
			<span class="ach-val">Daily</span>
			<span class="ach-val ach-trend">Trend</span>
			<span class="ach-prod">Top Producers</span>
		</div>
		{#each materials as mat, i}
			<div class="alloc-row" class:aerospace={mat.aerospace}>
				<div class="alloc-main">
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
								value={formatB(materialCostBLocal(i))}
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
								style="width: {(allocations[i] / mat.maxPercent) * 100}%; background: {materialDefs[i].color}"></div>
							<div class="alloc-bar-thumb" style="left: {(allocations[i] / mat.maxPercent) * 100}%; background: {materialDefs[i].color}"></div>
						</div>
						<span class="alloc-cap">{mat.maxPercent}%</span>
					</div>
				</div>
				<div class="alloc-global-cols">
					<span class="agc-val">{mat.annualOutput}</span>
					<span class="agc-val">{mat.dailyOutput}</span>
					<span class="agc-trend" style="color: {trendColor[mat.trend]}">{trendIcon[mat.trend]}</span>
					<span class="agc-prod">{mat.topProducers}</span>
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
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
		padding: 0.5rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}

	.alloc-row.aerospace {
		border-color: rgba(96, 165, 250, 0.3);
	}

	.alloc-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.alloc-global-cols {
		display: grid;
		grid-template-columns: 5.5rem 5.5rem 1.8rem 1fr;
		gap: 0.25rem;
		align-items: center;
		flex-shrink: 0;
		border-left: 1px solid var(--color-border);
		padding-left: 0.5rem;
		min-width: 260px;
	}

	.agc-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text);
		text-align: right;
		white-space: nowrap;
	}

	.agc-trend {
		text-align: center;
		font-weight: 700;
		font-size: 0.8rem;
	}

	.agc-prod {
		font-size: 0.6rem;
		color: var(--color-text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Column headers */
	.alloc-col-headers {
		display: flex;
		gap: 0.5rem;
		padding: 0.3rem 0.6rem;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
	}

	.ach-alloc {
		flex: 1;
		min-width: 0;
	}

	.ach-val {
		width: 5.5rem;
		text-align: right;
		flex-shrink: 0;
	}

	.ach-trend {
		width: 1.8rem;
		text-align: center;
	}

	.ach-prod {
		flex-shrink: 0;
		min-width: 0;
		/* Align with agc-prod — offset for border-left + padding */
		padding-left: 0.5rem;
		border-left: 1px solid transparent;
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
