<script lang="ts">
	import { difficulty, difficultyConfig, spendingAllocations, spendingReserves, claimedComplexes, launchComplexCosts, rocketDefs, rocketInventory } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	interface SpendCategoryDef {
		name: string;
		icon: string;
		description: string;
		color: string;
	}

	const categoryDefs: SpendCategoryDef[] = [
		{ name: 'Launch Infrastructure', icon: '🚀', description: 'Launch pads, integration bays, ground support', color: '#f97316' },
		{ name: 'Rocket Manufacturing', icon: '🏭', description: 'Vehicle production, engines, avionics', color: '#ef4444' },
		{ name: 'Propellant Production', icon: '⚗️', description: 'LOX, LCH₄, LH₂, RP-1 plants', color: '#a855f7' },
		{ name: 'Payload Production', icon: '📦', description: 'Satellites, habitats, containers, equipment', color: '#3b82f6' },
		{ name: 'R&D', icon: '🔬', description: 'Advanced propulsion, materials science, life support', color: '#06b6d4' },
		{ name: 'Mining & Extraction', icon: '⛏️', description: 'Iron, aluminum, titanium, rare earth mines', color: '#84cc16' },
		{ name: 'Refining & Materials', icon: '🔩', description: 'Steel mills, alloy foundries, composite plants', color: '#eab308' },
		{ name: 'Skilled Labor & Training', icon: '👷', description: 'Engineers, technicians, operators, pilots', color: '#ec4899' },
		{ name: 'Mission Operations', icon: '🖥️', description: 'Ground control, communications, tracking', color: '#14b8a6' },
		{ name: 'Spaceport Construction', icon: '🏗️', description: 'New launch site development worldwide', color: '#f59e0b' },
		{ name: 'Energy & Utilities', icon: '⚡', description: 'Electricity, water, gas for all program operations', color: '#facc15' },
	];

	// Build reactive categories from store + defs
	let categories = $derived(
		categoryDefs.map((def, i) => ({ ...def, allocated: $spendingAllocations[i] ?? 0 }))
	);

	let totalAllocated = $derived(categories.reduce((sum, c) => sum + c.allocated, 0));
	let annualBudget = $derived(difficultyConfig[$difficulty].annualBudgetB);
	let remaining = $derived(annualBudget - totalAllocated);
	let surplus = $derived(Math.max(0, remaining));
	let deficit = $derived(Math.max(0, -remaining));

	let reserves = $derived($spendingReserves);
	let reserveCapacity = 2000;

	// ── Cost demands from claimed launch complexes ──
	interface CostDemandItem {
		name: string;
		costB: number;
		color: string;
	}

	let claimedLaunchCosts = $derived.by(() => {
		const items: CostDemandItem[] = [];
		const colors = ['#fb923c', '#fdba74', '#fed7aa', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309'];
		let ci = 0;
		for (const id of $claimedComplexes) {
			const info = launchComplexCosts[id];
			if (info) {
				items.push({ name: info.name, costB: info.costM / 1000, color: colors[ci % colors.length] });
				ci++;
			}
		}
		return items;
	});

	let launchInfraDemandB = $derived(
		claimedLaunchCosts.reduce((sum, c) => sum + c.costB, 0)
	);

	// Rocket maintenance cost demand (category 1 = Rocket Manufacturing)
	let rocketMaintCosts = $derived.by(() => {
		const items: CostDemandItem[] = [];
		const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#e879f9', '#fb7185', '#fdba74'];
		let ci = 0;
		for (const rocket of rocketDefs) {
			const count = $rocketInventory[rocket.id] ?? 0;
			if (count <= 0) continue;
			items.push({
				name: `${rocket.name} ×${count}`,
				costB: (count * rocket.maintenanceCostM) / 1000,
				color: colors[ci % colors.length],
			});
			ci++;
		}
		return items;
	});

	let rocketMaintDemandB = $derived(
		rocketMaintCosts.reduce((sum, c) => sum + c.costB, 0)
	);

	// Cost demand per category (in $B).
	// Demands come from actual consumption drivers (claimed complexes, owned rockets, etc.)
	function getCostDemandB(catIndex: number): number {
		if (catIndex === 0) return launchInfraDemandB;
		if (catIndex === 1) return rocketMaintDemandB;
		return 0; // other categories gain demands as game mechanics are built
	}

	// ── Detail modal state ──
	let detailModalIndex = $state<number | null>(null);
	let detailCat = $derived(detailModalIndex !== null ? categories[detailModalIndex] : null);
	let detailDemand = $derived(detailModalIndex !== null ? getCostDemandB(detailModalIndex) : 0);

	// Detail pie slices for modal
	const DETAIL_R = 70;
	const DETAIL_CX = 80;
	const DETAIL_CY = 80;

	interface DetailSlice {
		label: string;
		value: number;
		color: string;
		path: string;
	}

	let detailPieSlices = $derived.by(() => {
		if (detailModalIndex === null || !detailCat) return [];
		const allocated = detailCat.allocated;

		const slices: DetailSlice[] = [];
		let cumAngle = -Math.PI / 2;

		// Collect demand items for this category
		const items: CostDemandItem[] = [];
		if (detailModalIndex === 0) items.push(...claimedLaunchCosts);
		if (detailModalIndex === 1) items.push(...rocketMaintCosts);
		const totalDemand = items.reduce((s, it) => s + it.costB, 0);

		if (allocated <= 0 && totalDemand <= 0) return [];

		// Scale pie relative to whichever is larger: allocated or demand
		const pieTotal = Math.max(allocated, totalDemand, 0.001);

		for (const item of items) {
			const pct = item.costB / pieTotal;
			if (pct <= 0) continue;
			const angle = Math.min(pct, 1) * 2 * Math.PI;
			const start = cumAngle;
			const end = cumAngle + angle;
			const x1 = DETAIL_CX + DETAIL_R * Math.cos(start);
			const y1 = DETAIL_CY + DETAIL_R * Math.sin(start);
			const x2 = DETAIL_CX + DETAIL_R * Math.cos(end);
			const y2 = DETAIL_CY + DETAIL_R * Math.sin(end);
			const large = angle > Math.PI ? 1 : 0;
			slices.push({
				label: item.name,
				value: item.costB,
				color: item.color,
				path: `M${DETAIL_CX},${DETAIL_CY} L${x1},${y1} A${DETAIL_R},${DETAIL_R} 0 ${large} 1 ${x2},${y2} Z`,
			});
			cumAngle = end;
		}

		// Remainder (unmet or unallocated portion)
		const remainder = pieTotal - totalDemand;
		if (remainder > 0.001) {
			const pct = remainder / pieTotal;
			const angle = pct * 2 * Math.PI;
			const start = cumAngle;
			const end = cumAngle + angle;
			const x1 = DETAIL_CX + DETAIL_R * Math.cos(start);
			const y1 = DETAIL_CY + DETAIL_R * Math.sin(start);
			const x2 = DETAIL_CX + DETAIL_R * Math.cos(end);
			const y2 = DETAIL_CY + DETAIL_R * Math.sin(end);
			const large = angle > Math.PI ? 1 : 0;
			slices.push({
				label: allocated > 0 ? 'Unallocated' : 'Unfunded',
				value: remainder,
				color: '#334155',
				path: `M${DETAIL_CX},${DETAIL_CY} L${x1},${y1} A${DETAIL_R},${DETAIL_R} 0 ${large} 1 ${x2},${y2} Z`,
			});
		}

		return slices;
	});

	function setAllocated(index: number, value: number) {
		const clamped = Math.max(0, Math.round(value));
		const othersTotal = totalAllocated - categories[index].allocated;
		const maxAllowed = annualBudget - othersTotal;
		spendingAllocations.update(arr => {
			const next = [...arr];
			next[index] = Math.min(clamped, maxAllowed);
			return next;
		});
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

			// SVG arc path — full circle needs two half-arcs since a single arc with same start/end collapses
			let path: string;
			if (pct >= 1) {
				path = `M${PIE_CX},${PIE_CY - PIE_R} A${PIE_R},${PIE_R} 0 1 1 ${PIE_CX},${PIE_CY + PIE_R} A${PIE_R},${PIE_R} 0 1 1 ${PIE_CX},${PIE_CY - PIE_R} Z`;
			} else {
				const x1 = PIE_CX + PIE_R * Math.cos(startAngle);
				const y1 = PIE_CY + PIE_R * Math.sin(startAngle);
				const x2 = PIE_CX + PIE_R * Math.cos(endAngle);
				const y2 = PIE_CY + PIE_R * Math.sin(endAngle);
				const largeArc = angle > Math.PI ? 1 : 0;
				path = `M${PIE_CX},${PIE_CY} L${x1},${y1} A${PIE_R},${PIE_R} 0 ${largeArc} 1 ${x2},${y2} Z`;
			}

			// Label position (outside pie)
			const labelR = PIE_R + 14;
			const labelX = PIE_CX + labelR * Math.cos(midAngle);
			const labelY = PIE_CY + labelR * Math.sin(midAngle);

			slices.push({ name: cat.name, value: cat.allocated, color: cat.color, startAngle, endAngle, path, labelX, labelY, pct: pct * 100 });
			cumAngle = endAngle;
		}
		return slices;
	});

	// ── Budget Overview pie ──
	const BPIE_R = 72;
	const BPIE_CX = 90;
	const BPIE_CY = 90;
	const BPIE_RING_R = 84;

	let budgetAllocPct = $derived(Math.min(1, totalAllocated / Math.max(annualBudget, 1)));

	let budgetPieSlices = $derived.by(() => {
		const allocPct = budgetAllocPct;
		const surplusPct = 1 - allocPct;
		const slices: Array<{label: string; pct: number; color: string; path: string}> = [];
		let cumAngle = -Math.PI / 2;

		if (allocPct > 0) {
			if (allocPct >= 1) {
				slices.push({
					label: 'Allocated', pct: 1, color: '#60a5fa',
					path: `M${BPIE_CX},${BPIE_CY - BPIE_R} A${BPIE_R},${BPIE_R} 0 1 1 ${BPIE_CX},${BPIE_CY + BPIE_R} A${BPIE_R},${BPIE_R} 0 1 1 ${BPIE_CX},${BPIE_CY - BPIE_R} Z`
				});
			} else {
				const angle = allocPct * 2 * Math.PI;
				const end = cumAngle + angle;
				const x1 = BPIE_CX + BPIE_R * Math.cos(cumAngle);
				const y1 = BPIE_CY + BPIE_R * Math.sin(cumAngle);
				const x2 = BPIE_CX + BPIE_R * Math.cos(end);
				const y2 = BPIE_CY + BPIE_R * Math.sin(end);
				const large = angle > Math.PI ? 1 : 0;
				slices.push({
					label: 'Allocated', pct: allocPct, color: '#60a5fa',
					path: `M${BPIE_CX},${BPIE_CY} L${x1},${y1} A${BPIE_R},${BPIE_R} 0 ${large} 1 ${x2},${y2} Z`
				});
				cumAngle = end;
			}
		}

		if (surplusPct > 0) {
			if (surplusPct >= 1) {
				slices.push({
					label: 'Surplus', pct: 1, color: '#4ade80',
					path: `M${BPIE_CX},${BPIE_CY - BPIE_R} A${BPIE_R},${BPIE_R} 0 1 1 ${BPIE_CX},${BPIE_CY + BPIE_R} A${BPIE_R},${BPIE_R} 0 1 1 ${BPIE_CX},${BPIE_CY - BPIE_R} Z`
				});
			} else {
				const angle = surplusPct * 2 * Math.PI;
				const end = cumAngle + angle;
				const x1 = BPIE_CX + BPIE_R * Math.cos(cumAngle);
				const y1 = BPIE_CY + BPIE_R * Math.sin(cumAngle);
				const x2 = BPIE_CX + BPIE_R * Math.cos(end);
				const y2 = BPIE_CY + BPIE_R * Math.sin(end);
				const large = angle > Math.PI ? 1 : 0;
				slices.push({
					label: 'Surplus', pct: surplusPct, color: '#4ade80',
					path: `M${BPIE_CX},${BPIE_CY} L${x1},${y1} A${BPIE_R},${BPIE_R} 0 ${large} 1 ${x2},${y2} Z`
				});
			}
		}

		return slices;
	});

	// Overspend ring — grows around the pie when totalAllocated > annualBudget
	// 100% ring = spending is 2× budget; 50% ring = spending is 1.5× budget
	let overspendPct = $derived(totalAllocated > annualBudget ? Math.min(1, (totalAllocated - annualBudget) / annualBudget) : 0);

	let overspendRingPath = $derived.by(() => {
		if (overspendPct <= 0) return '';
		const startAngle = -Math.PI / 2;
		if (overspendPct >= 1) {
			return `M${BPIE_CX},${BPIE_CY - BPIE_RING_R} A${BPIE_RING_R},${BPIE_RING_R} 0 1 1 ${BPIE_CX},${BPIE_CY + BPIE_RING_R} A${BPIE_RING_R},${BPIE_RING_R} 0 1 1 ${BPIE_CX},${BPIE_CY - BPIE_RING_R}`;
		}
		const angle = overspendPct * 2 * Math.PI;
		const end = startAngle + angle;
		const x1 = BPIE_CX + BPIE_RING_R * Math.cos(startAngle);
		const y1 = BPIE_CY + BPIE_RING_R * Math.sin(startAngle);
		const x2 = BPIE_CX + BPIE_RING_R * Math.cos(end);
		const y2 = BPIE_CY + BPIE_RING_R * Math.sin(end);
		const large = angle > Math.PI ? 1 : 0;
		return `M${x1},${y1} A${BPIE_RING_R},${BPIE_RING_R} 0 ${large} 1 ${x2},${y2}`;
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

		<!-- Budget Overview Pie -->
		<div class="budget-pie-section">
			<h4 class="section-label">Budget Overview</h4>
			<svg viewBox="0 0 180 180" class="budget-pie-svg">
				{#each budgetPieSlices as slice}
					<path d={slice.path} fill={slice.color} stroke="var(--color-bg)" stroke-width="1.5" />
				{/each}
				{#if overspendPct > 0}
					<path d={overspendRingPath} fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round" opacity="0.85" />
				{/if}
				<circle cx={BPIE_CX} cy={BPIE_CY} r="32" fill="var(--color-bg-panel)" />
				<text x={BPIE_CX} y={BPIE_CY - 6} text-anchor="middle" fill="var(--color-text)" font-size="11" font-weight="700">${annualBudget}B</text>
				<text x={BPIE_CX} y={BPIE_CY + 8} text-anchor="middle" fill="var(--color-text-dim)" font-size="7">budget</text>
			</svg>
			<div class="budget-pie-legend">
				<div class="legend-item">
					<span class="legend-swatch" style="background: #60a5fa"></span>
					<span class="legend-name">Allocated</span>
					<span class="legend-val">${totalAllocated}B</span>
				</div>
				<div class="legend-item">
					<span class="legend-swatch" style="background: #4ade80"></span>
					<span class="legend-name">Surplus</span>
					<span class="legend-val">${surplus}B</span>
				</div>
				{#if deficit > 0}
					<div class="legend-item">
						<span class="legend-swatch" style="background: #ef4444"></span>
						<span class="legend-name">Overspend</span>
						<span class="legend-val">${deficit}B</span>
					</div>
				{/if}
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
			{@const demandB = getCostDemandB(i)}
			<div class="spend-card" class:has-demand={demandB > 0}>
				<div class="spend-top">
					<span class="spend-icon">{cat.icon}</span>
					<div class="spend-info">
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<span class="spend-name spend-name-clickable" onclick={() => detailModalIndex = i} style="color: {cat.color}">
							{cat.name}
							{#if demandB > 0}
								<span class="demand-badge">${demandB.toFixed(1)}B committed</span>
							{/if}
						</span>
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
					<!-- Shadow demand bar (striped, behind the slider fill) -->
					{#if demandB > 0}
						<div class="spend-bar-demand" style="width: {Math.max(1.5, Math.min(100, (demandB / annualBudget) * 100))}%; --demand-color: {cat.color}"></div>
					{/if}
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

	<!-- Detail Modal -->
	{#if detailModalIndex !== null && detailCat}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="detail-overlay" onclick={() => detailModalIndex = null}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="detail-modal" onclick={(e) => e.stopPropagation()}>
				<div class="detail-header">
					<span class="detail-icon">{detailCat.icon}</span>
					<span class="detail-title" style="color: {detailCat.color}">{detailCat.name}</span>
					<button class="detail-close" onclick={() => detailModalIndex = null}>✕</button>
				</div>
				<div class="detail-body">
					<div class="detail-pie-section">
						<svg viewBox="0 0 160 160" class="detail-pie-svg">
							{#each detailPieSlices as slice}
								<path d={slice.path} fill={slice.color} stroke="var(--color-bg)" stroke-width="1" />
							{/each}
							<circle cx={DETAIL_CX} cy={DETAIL_CY} r="30" fill="var(--color-bg-panel)" />
							<text x={DETAIL_CX} y={DETAIL_CY - 4} text-anchor="middle" fill="var(--color-text)" font-size="10" font-weight="700">{detailCat.allocated > 0 ? `$${detailCat.allocated}B` : 'No budget'}</text>
							<text x={DETAIL_CX} y={DETAIL_CY + 8} text-anchor="middle" fill="var(--color-text-dim)" font-size="6">allocated</text>
						</svg>
						<div class="detail-legend">
							{#each detailPieSlices as slice}
								<div class="detail-legend-row">
									<span class="detail-legend-swatch" style="background: {slice.color}"></span>
									<span class="detail-legend-name">{slice.label}</span>
									<span class="detail-legend-val">${slice.value.toFixed(2)}B</span>
								</div>
							{/each}
						</div>
					</div>
					<div class="detail-summary">
						<div class="detail-sum-row">
							<span class="detail-sum-label">Budget Allocated</span>
							<span class="detail-sum-val" style="color: {detailCat.color}">${detailCat.allocated}B</span>
						</div>
						<div class="detail-sum-row">
							<span class="detail-sum-label">Cost Demand</span>
							<span class="detail-sum-val" style="color: {detailDemand > detailCat.allocated ? '#ef4444' : '#fbbf24'}">${detailDemand.toFixed(2)}B</span>
						</div>
						<div class="detail-sum-row">
							<span class="detail-sum-label">Coverage</span>
							<span class="detail-sum-val" style="color: {detailDemand <= detailCat.allocated ? '#4ade80' : '#ef4444'}">
								{detailCat.allocated > 0 ? Math.min(100, (detailDemand / detailCat.allocated * 100)).toFixed(0) : 0}%
							</span>
						</div>
						{#if detailDemand > detailCat.allocated}
							<div class="detail-warning">
								⚠ Shortfall of ${(detailDemand - detailCat.allocated).toFixed(2)}B — will draw from unallocated budget or reserves
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
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
		grid-template-columns: auto minmax(0, 1fr) auto auto;
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
		max-width: 280px;
	}

	/* Budget Overview pie */
	.budget-pie-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 180px;
	}

	.budget-pie-svg {
		width: 170px;
		height: 170px;
		margin-bottom: 0.5rem;
	}

	.budget-pie-legend {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		width: 100%;
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
	.spend-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
	.spend-name { font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
	.spend-name-clickable { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 2px; }
	.spend-name-clickable:hover { text-decoration-style: solid; filter: brightness(1.2); }
	.spend-desc { font-size: 0.65rem; color: var(--color-text-dim); }

	.demand-badge {
		font-size: 0.5rem;
		padding: 0.05rem 0.3rem;
		border-radius: 0.2rem;
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
		font-weight: 700;
		letter-spacing: 0.03em;
		white-space: nowrap;
	}

	.spend-card.has-demand {
		border-color: rgba(251, 191, 36, 0.25);
	}

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

	.spend-bar-demand {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		border-radius: 4px;
		pointer-events: none;
		background:
			repeating-linear-gradient(
				-45deg,
				transparent,
				transparent 3px,
				color-mix(in srgb, var(--demand-color) 50%, transparent) 3px,
				color-mix(in srgb, var(--demand-color) 50%, transparent) 6px
			),
			color-mix(in srgb, var(--demand-color) 15%, transparent);
		z-index: 0;
		min-width: 14px;
	}

	.spend-bar-fill {
		position: relative;
		height: 100%;
		border-radius: 4px;
		transition: width 0.05s;
		pointer-events: none;
		z-index: 1;
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
		z-index: 2;
	}

	/* Detail modal */
	.detail-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.detail-modal {
		background: var(--color-bg-card, #1a2234);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		width: 480px;
		max-width: 90vw;
		max-height: 85vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.detail-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.detail-icon { font-size: 1.2rem; }
	.detail-title { font-size: 1rem; font-weight: 700; flex: 1; }

	.detail-close {
		background: transparent;
		border: none;
		color: var(--color-text-dim);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
	}
	.detail-close:hover { background: var(--color-border); color: var(--color-text); }

	.detail-body {
		padding: 1rem;
		display: flex;
		gap: 1.25rem;
	}

	.detail-pie-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 170px;
	}

	.detail-pie-svg {
		width: 160px;
		height: 160px;
		margin-bottom: 0.5rem;
	}

	.detail-legend {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		width: 100%;
	}

	.detail-legend-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6rem;
	}

	.detail-legend-swatch {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.detail-legend-name {
		flex: 1;
		color: var(--color-text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.detail-legend-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.6rem;
		color: var(--color-text);
		flex-shrink: 0;
	}

	.detail-summary {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.5rem;
	}

	.detail-sum-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.detail-sum-label {
		font-size: 0.75rem;
		color: var(--color-text-dim);
	}

	.detail-sum-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.detail-warning {
		margin-top: 0.5rem;
		padding: 0.4rem 0.5rem;
		border-radius: 0.3rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #fca5a5;
		font-size: 0.65rem;
		line-height: 1.4;
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
