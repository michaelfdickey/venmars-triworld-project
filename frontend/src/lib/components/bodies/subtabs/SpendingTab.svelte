<script lang="ts">
	import { difficulty, difficultyConfig } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	interface SpendCategory {
		name: string;
		icon: string;
		allocated: number;
		description: string;
		color: string;
	}

	const categories: SpendCategory[] = $state([
		{ name: 'Launch Infrastructure', icon: '🚀', allocated: 85, description: 'Launch pads, integration bays, ground support', color: '#f97316' },
		{ name: 'Rocket Manufacturing', icon: '🏭', allocated: 210, description: 'Vehicle production, engines, avionics', color: '#ef4444' },
		{ name: 'Propellant Production', icon: '⚗️', allocated: 45, description: 'LOX, LCH₄, LH₂, RP-1 plants', color: '#a855f7' },
		{ name: 'Payload Production', icon: '📦', allocated: 120, description: 'Satellites, habitats, containers, equipment', color: '#3b82f6' },
		{ name: 'R&D', icon: '🔬', allocated: 65, description: 'Advanced propulsion, materials science, life support', color: '#06b6d4' },
		{ name: 'Mining & Extraction', icon: '⛏️', allocated: 55, description: 'Iron, aluminum, titanium, rare earth mines', color: '#84cc16' },
		{ name: 'Refining & Materials', icon: '🔩', allocated: 95, description: 'Steel mills, alloy foundries, composite plants', color: '#eab308' },
		{ name: 'Skilled Labor & Training', icon: '👷', allocated: 40, description: 'Engineers, technicians, operators, pilots', color: '#ec4899' },
		{ name: 'Mission Operations', icon: '🖥️', allocated: 30, description: 'Ground control, communications, tracking', color: '#14b8a6' },
		{ name: 'Spaceport Construction', icon: '🏗️', allocated: 75, description: 'New launch site development worldwide', color: '#f59e0b' },
	]);

	let totalAllocated = $derived(categories.reduce((sum, c) => sum + c.allocated, 0));
	let annualBudget = $derived(difficultyConfig[$difficulty].annualBudgetB);
	let remaining = $derived(annualBudget - totalAllocated);
	let surplus = $derived(Math.max(0, remaining));
	let deficit = $derived(Math.max(0, -remaining));

	// Reserve fund: accumulates surplus each year (placeholder)
	let reserves = $state(320);
	let reserveCapacity = 2000;

	function setAllocated(index: number, value: number) {
		const clamped = Math.max(0, Math.round(value));
		const othersTotal = totalAllocated - categories[index].allocated;
		const maxAllowed = annualBudget - othersTotal;
		categories[index].allocated = Math.min(clamped, maxAllowed);
	}

	function handleInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const parsed = parseInt(target.value, 10);
		if (!isNaN(parsed)) {
			setAllocated(index, parsed);
		}
	}

	// Draggable bar logic
	let draggingIndex = $state<number | null>(null);

	function startDrag(index: number, e: PointerEvent) {
		draggingIndex = index;
		const bar = (e.currentTarget as HTMLElement).closest('.spend-bar-track') as HTMLElement;
		if (!bar) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		updateDrag(index, bar, e.clientX);
	}

	function onDragMove(index: number, e: PointerEvent) {
		if (draggingIndex !== index) return;
		const bar = (e.currentTarget as HTMLElement).closest('.spend-bar-track') as HTMLElement;
		if (!bar) return;
		updateDrag(index, bar, e.clientX);
	}

	function endDrag() {
		draggingIndex = null;
	}

	function updateDrag(index: number, bar: HTMLElement, clientX: number) {
		const rect = bar.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const value = Math.round(pct * annualBudget);
		setAllocated(index, value);
	}

	// Pie chart geometry
	const PIE_R = 80;
	const PIE_CX = 90;
	const PIE_CY = 90;

	interface PieSlice {
		name: string;
		value: number;
		color: string;
		startAngle: number;
		endAngle: number;
		path: string;
		labelX: number;
		labelY: number;
		pct: number;
	}

	let pieSlices = $derived.by(() => {
		const total = Math.max(totalAllocated, 1);
		const slices: PieSlice[] = [];
		let cumAngle = -Math.PI / 2; // start at top

		for (const cat of categories) {
			if (cat.allocated <= 0) continue;
			const pct = cat.allocated / total;
			const angle = pct * 2 * Math.PI;
			const startAngle = cumAngle;
			const endAngle = cumAngle + angle;
			const midAngle = startAngle + angle / 2;

			// SVG arc path
			const x1 = PIE_CX + PIE_R * Math.cos(startAngle);
			const y1 = PIE_CY + PIE_R * Math.sin(startAngle);
			const x2 = PIE_CX + PIE_R * Math.cos(endAngle);
			const y2 = PIE_CY + PIE_R * Math.sin(endAngle);
			const largeArc = angle > Math.PI ? 1 : 0;
			const path = `M${PIE_CX},${PIE_CY} L${x1},${y1} A${PIE_R},${PIE_R} 0 ${largeArc} 1 ${x2},${y2} Z`;

			// Label position (outside pie)
			const labelR = PIE_R + 14;
			const labelX = PIE_CX + labelR * Math.cos(midAngle);
			const labelY = PIE_CY + labelR * Math.sin(midAngle);

			slices.push({ name: cat.name, value: cat.allocated, color: cat.color, startAngle, endAngle, path, labelX, labelY, pct: pct * 100 });
			cumAngle = endAngle;
		}
		return slices;
	});
</script>

<div class="spending-tab">
	<!-- Top overview row: Pie + Budget Text + Reserves -->
	<div class="overview-row">
		<!-- Pie Chart -->
		<div class="pie-section">
			<h4 class="section-label">Program Spending</h4>
			<svg viewBox="0 0 180 180" class="pie-svg">
				{#each pieSlices as slice}
					<path d={slice.path} fill={slice.color} stroke="var(--color-bg)" stroke-width="1.5" />
				{/each}
				<!-- Center text -->
				<circle cx={PIE_CX} cy={PIE_CY} r="38" fill="var(--color-bg-panel)" />
				<text x={PIE_CX} y={PIE_CY - 6} text-anchor="middle" fill="var(--color-text)" font-size="11" font-weight="700">${totalAllocated}B</text>
				<text x={PIE_CX} y={PIE_CY + 8} text-anchor="middle" fill="var(--color-text-dim)" font-size="7">allocated</text>
			</svg>
			<!-- Legend -->
			<div class="pie-legend">
				{#each categories as cat}
					{#if cat.allocated > 0}
						<div class="legend-item">
							<span class="legend-swatch" style="background: {cat.color}"></span>
							<span class="legend-name">{cat.name}</span>
							<span class="legend-val">${cat.allocated}B</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Budget text summary -->
		<div class="budget-text">
			<h4 class="section-label">Budget Summary</h4>
			<div class="budget-rows">
				<div class="budget-row">
					<span class="budget-key">Annual Budget</span>
					<span class="budget-note">({difficultyConfig[$difficulty].gdpPercent}% Global GDP)</span>
					<span class="budget-val budget-val-total">${annualBudget}B</span>
				</div>
				<div class="budget-row">
					<span class="budget-key">Total Allocated</span>
					<span class="budget-note">{((totalAllocated / annualBudget) * 100).toFixed(1)}% of budget</span>
					<span class="budget-val budget-val-alloc">${totalAllocated}B</span>
				</div>
				<div class="budget-divider"></div>
				{#if surplus > 0}
					<div class="budget-row">
						<span class="budget-key">Surplus</span>
						<span class="budget-note">→ added to reserves</span>
						<span class="budget-val budget-val-surplus">+${surplus}B</span>
					</div>
				{/if}
				{#if deficit > 0}
					<div class="budget-row">
						<span class="budget-key">Deficit</span>
						<span class="budget-note">⚠ drawn from reserves</span>
						<span class="budget-val budget-val-deficit">−${deficit}B</span>
					</div>
				{/if}
				{#if remaining === 0}
					<div class="budget-row">
						<span class="budget-key">Balance</span>
						<span class="budget-note">fully allocated</span>
						<span class="budget-val budget-val-balanced">$0B</span>
					</div>
				{/if}
			</div>
			<div class="budget-bar-container">
				<div class="budget-bar-bg">
					<div class="budget-bar-fill" style="width: {Math.min(100, (totalAllocated / annualBudget) * 100)}%"></div>
				</div>
				<span class="budget-pct">{((totalAllocated / annualBudget) * 100).toFixed(1)}%</span>
			</div>
		</div>

		<!-- Reserves column -->
		<div class="reserves-section">
			<h4 class="section-label">Reserves</h4>
			<div class="reserve-column">
				<div class="reserve-bar-track">
					<div class="reserve-bar-fill" style="height: {(reserves / reserveCapacity) * 100}%"></div>
				</div>
				<div class="reserve-labels">
					<span class="reserve-amount">${reserves}B</span>
					<span class="reserve-cap">of ${reserveCapacity}B</span>
					<span class="reserve-pct">{((reserves / reserveCapacity) * 100).toFixed(0)}%</span>
				</div>
			</div>
			<div class="reserve-notes">
				<p>Unspent budget accumulates here.</p>
				<p>Covers deficit years & emergency spending.</p>
			</div>
		</div>
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
					<div class="spend-input-wrap">
						<span class="spend-dollar">$</span>
						<input
							class="spend-input"
							type="number"
							min="0"
							max={annualBudget}
							value={cat.allocated}
							oninput={(e) => handleInput(i, e)}
						/>
						<span class="spend-unit">B</span>
					</div>
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="spend-bar-track"
					onpointerdown={(e) => startDrag(i, e)}
					onpointermove={(e) => onDragMove(i, e)}
					onpointerup={endDrag}
					onpointercancel={endDrag}
				>
					<div class="spend-bar-fill" style="width: {(cat.allocated / annualBudget) * 100}%; background: {cat.color}"></div>
					<div class="spend-bar-thumb" style="left: {(cat.allocated / annualBudget) * 100}%; background: {cat.color}"></div>
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

	/* ── Overview row: pie + text + reserves ── */
	.overview-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1.5rem;
		align-items: start;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-dim);
		margin-bottom: 0.5rem;
	}

	/* Pie chart */
	.pie-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 200px;
	}

	.pie-svg {
		width: 180px;
		height: 180px;
		margin-bottom: 0.5rem;
	}

	.pie-legend {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.15rem 0.75rem;
		width: 100%;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.55rem;
	}

	.legend-swatch {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-name {
		color: var(--color-text-dim);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.legend-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.55rem;
		color: var(--color-text);
		flex-shrink: 0;
	}

	/* Budget text */
	.budget-text {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.25rem;
	}

	.budget-rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.budget-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.budget-key {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text);
		min-width: 7rem;
	}

	.budget-note {
		font-size: 0.65rem;
		color: var(--color-text-dim);
		flex: 1;
	}

	.budget-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.95rem;
		font-weight: 700;
		min-width: 4.5rem;
		text-align: right;
	}

	.budget-val-total { color: var(--color-text); }
	.budget-val-alloc { color: #60a5fa; }
	.budget-val-surplus { color: #4ade80; }
	.budget-val-deficit { color: #ef4444; }
	.budget-val-balanced { color: #fbbf24; }

	.budget-divider {
		border-top: 1px dashed var(--color-border);
	}

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

	/* Reserves column */
	.reserves-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 90px;
	}

	.reserve-column {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		height: 140px;
		margin-bottom: 0.5rem;
	}

	.reserve-bar-track {
		width: 32px;
		height: 100%;
		background: var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.reserve-bar-fill {
		width: 100%;
		background: linear-gradient(0deg, #4ade80, #22d3ee);
		border-radius: 0 0 4px 4px;
		transition: height 0.3s;
	}

	.reserve-labels {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
	}

	.reserve-amount {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 1rem;
		font-weight: 700;
		color: #4ade80;
	}

	.reserve-cap {
		font-size: 0.6rem;
		color: var(--color-text-dim);
	}

	.reserve-pct {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}

	.reserve-notes {
		font-size: 0.55rem;
		color: var(--color-text-dim);
		text-align: center;
		line-height: 1.3;
	}

	.reserve-notes p {
		margin: 0;
	}

	/* ── Spend grid (unchanged) ── */

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

	.spend-input-wrap {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		margin-left: auto;
		flex-shrink: 0;
	}

	.spend-dollar {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.85rem;
		color: var(--color-text-dim);
	}

	.spend-input {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.85rem;
		font-weight: 700;
		color: #60a5fa;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		padding: 0.15rem 0.3rem;
		width: 4.5rem;
		text-align: right;
		-moz-appearance: textfield;
	}

	.spend-input::-webkit-inner-spin-button,
	.spend-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.spend-input:focus {
		outline: none;
		border-color: #60a5fa;
	}

	.spend-unit {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		color: var(--color-text-dim);
	}

	/* Draggable bar */
	.spend-bar-track {
		position: relative;
		height: 14px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: visible;
		cursor: pointer;
		touch-action: none;
		user-select: none;
	}

	.spend-bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.05s;
		pointer-events: none;
	}

	.spend-bar-thumb {
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
