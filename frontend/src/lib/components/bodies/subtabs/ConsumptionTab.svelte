<script lang="ts">
	import { claimedComplexes, launchComplexConsumption, materialDefs, materialAllocations, materialCostB as matCostBFn } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	// ── Consumption category definitions (mirror spending categories) ──
	interface ConsumptionCategoryDef {
		name: string;
		icon: string;
		description: string;
		color: string;
	}

	const categoryDefs: ConsumptionCategoryDef[] = [
		{ name: 'Launch Infrastructure', icon: '🚀', description: 'Material demands from claimed launch complexes', color: '#f97316' },
		{ name: 'Rocket Manufacturing',  icon: '🏭', description: 'Raw materials consumed by vehicle production', color: '#ef4444' },
		{ name: 'Propellant Production',  icon: '⚗️', description: 'Propellant consumption for launches & transfer', color: '#a855f7' },
		{ name: 'Payload Production',     icon: '📦', description: 'Materials consumed building satellites & habitats', color: '#3b82f6' },
		{ name: 'R&D',                    icon: '🔬', description: 'Prototype materials, lab consumables', color: '#06b6d4' },
		{ name: 'Mining & Extraction',    icon: '⛏️', description: 'Equipment & energy for mine operations', color: '#84cc16' },
		{ name: 'Refining & Materials',   icon: '🔩', description: 'Feedstock consumed by refineries & foundries', color: '#eab308' },
		{ name: 'Skilled Labor & Training', icon: '👷', description: 'Facility materials, training equipment', color: '#ec4899' },
		{ name: 'Mission Operations',     icon: '🖥️', description: 'Ground station power, consumables', color: '#14b8a6' },
		{ name: 'Spaceport Construction', icon: '🏗️', description: 'Construction materials for new sites', color: '#f59e0b' },
		{ name: 'Energy & Utilities',     icon: '⚡', description: 'Electricity & utility consumption across program', color: '#facc15' },
	];

	// ── Material demand item for a category ──
	interface MaterialDemandItem {
		name: string;       // source label (e.g. "Kennedy SC")
		material: string;   // material name
		amountMt: number;   // annual Mt (or TWh for electricity)
		color: string;
	}

	// Map material name → index in materialDefs
	const materialNameIndex = new Map<string, number>();
	for (let i = 0; i < materialDefs.length; i++) {
		materialNameIndex.set(materialDefs[i].name, i);
	}

	// Map material name → consumption category index
	// Launch complex items go to category 0 (Launch Infrastructure)
	// but propellants from complexes are really propellant consumption
	const materialToCatIndex: Record<string, number> = {
		'Steel': 0, 'Aluminum': 0, 'Copper': 0, 'Concrete / Cement': 0,
		'Titanium': 0, 'Nickel': 0, 'Silicon (Electronic)': 0,
		'LOX': 2, 'LH₂': 2, 'LCH₄': 2, 'RP-1 Kerosene': 2, 'Hydrazine': 2, 'Xenon': 2,
		'Electricity': 10,
		'Carbon Fiber': 6, 'Inconel / Superalloys': 6, 'Rare Earth Elements': 5,
	};

	// ── Compute all consumption demands reactively ──
	let consumptionByCategory = $derived.by(() => {
		const map = new Map<number, MaterialDemandItem[]>();

		// Add demands from claimed launch complexes
		for (const id of $claimedComplexes) {
			const profile = launchComplexConsumption[id];
			if (!profile) continue;
			for (const item of profile.items) {
				const catIdx = materialToCatIndex[item.material] ?? 0;
				if (!map.has(catIdx)) map.set(catIdx, []);
				const matIdx = materialNameIndex.get(item.material);
				const color = matIdx !== undefined ? materialDefs[matIdx].color : '#888';
				map.get(catIdx)!.push({
					name: profile.name,
					material: item.material,
					amountMt: item.amountMt,
					color,
				});
			}
		}

		return map;
	});

	// Total consumption per category in Mt
	function getCategoryTotalMt(catIndex: number): number {
		const items = consumptionByCategory.get(catIndex);
		if (!items) return 0;
		return items.reduce((sum, it) => sum + it.amountMt, 0);
	}

	// Total consumption per material (across all categories)
	let totalConsumptionByMaterial = $derived.by(() => {
		const totals = new Map<string, number>();
		for (const [, items] of consumptionByCategory) {
			for (const item of items) {
				totals.set(item.material, (totals.get(item.material) ?? 0) + item.amountMt);
			}
		}
		return totals;
	});

	// Material supply (from allocations) in Mt
	function getSupplyMt(materialName: string): number {
		const idx = materialNameIndex.get(materialName);
		if (idx === undefined) return 0;
		return materialDefs[idx].globalMt * ($materialAllocations[idx] / 100);
	}

	// Total demand items count (for overview)
	let totalDemandItems = $derived(
		Array.from(consumptionByCategory.values()).reduce((s, arr) => s + arr.length, 0)
	);

	// Aggregate material totals for overview
	interface MaterialSummary {
		name: string;
		consumed: number;
		supplied: number;
		unit: string;
		color: string;
		deficit: boolean;
	}

	let materialSummaries = $derived.by(() => {
		const summaries: MaterialSummary[] = [];
		for (const [matName, consumed] of totalConsumptionByMaterial) {
			const idx = materialNameIndex.get(matName);
			if (idx === undefined) continue;
			const supplied = getSupplyMt(matName);
			const unit = matName === 'Electricity' ? 'TWh' : 'Mt';
			summaries.push({
				name: matName,
				consumed,
				supplied,
				unit,
				color: materialDefs[idx].color,
				deficit: consumed > supplied,
			});
		}
		// Sort: deficits first, then alphabetical
		summaries.sort((a, b) => {
			if (a.deficit !== b.deficit) return a.deficit ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		return summaries;
	});

	// Max consumption across categories for bar scaling
	let maxCategoryMt = $derived(
		Math.max(0.001, ...categoryDefs.map((_, i) => getCategoryTotalMt(i)))
	);

	// ── Detail modal ──
	let detailModalIndex = $state<number | null>(null);
	let detailCat = $derived(detailModalIndex !== null ? categoryDefs[detailModalIndex] : null);
	let detailItems = $derived(detailModalIndex !== null ? (consumptionByCategory.get(detailModalIndex) ?? []) : []);
	let detailTotalMt = $derived(detailItems.reduce((s, it) => s + it.amountMt, 0));

	// Aggregate detail items by material for the pie chart
	interface DetailAggItem { material: string; totalMt: number; color: string; }

	let detailAggItems = $derived.by(() => {
		const agg = new Map<string, DetailAggItem>();
		for (const item of detailItems) {
			const existing = agg.get(item.material);
			if (existing) {
				existing.totalMt += item.amountMt;
			} else {
				agg.set(item.material, { material: item.material, totalMt: item.amountMt, color: item.color });
			}
		}
		return Array.from(agg.values()).sort((a, b) => b.totalMt - a.totalMt);
	});

	// Pie chart for detail modal
	const DETAIL_R = 70;
	const DETAIL_CX = 80;
	const DETAIL_CY = 80;

	interface PieSlice { label: string; value: number; color: string; path: string; }

	let detailPieSlices = $derived.by(() => {
		if (detailTotalMt <= 0 || detailAggItems.length === 0) return [];
		const slices: PieSlice[] = [];
		let cumAngle = -Math.PI / 2;
		for (const item of detailAggItems) {
			const pct = item.totalMt / detailTotalMt;
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
				label: item.material,
				value: item.totalMt,
				color: item.color,
				path: `M${DETAIL_CX},${DETAIL_CY} L${x1},${y1} A${DETAIL_R},${DETAIL_R} 0 ${large} 1 ${x2},${y2} Z`,
			});
			cumAngle = end;
		}
		return slices;
	});

	function fmtAmount(val: number, material: string): string {
		const isElec = material === 'Electricity';
		if (isElec) {
			if (val >= 1) return val.toFixed(1) + ' TWh';
			if (val >= 0.001) return (val * 1000).toFixed(0) + ' GWh';
			return (val * 1e6).toFixed(0) + ' MWh';
		}
		if (val >= 1) return val.toFixed(1) + ' Mt';
		if (val >= 0.001) return (val * 1000).toFixed(1) + ' kt';
		return (val * 1e6).toFixed(0) + ' t';
	}

	function fmtMt(val: number): string {
		if (val >= 1) return val.toFixed(1);
		if (val >= 0.001) return (val * 1000).toFixed(1) + ' k';
		return (val * 1e6).toFixed(0);
	}
</script>

<div class="consumption-tab">
	<!-- Overview section -->
	<div class="overview-section">
		<div class="overview-left">
			<h4 class="section-label">Material Consumption</h4>
			<p class="overview-desc">
				Material and energy consumed annually by program operations.
				Demands are fixed based on claimed launch complexes, production facilities, and ongoing operations.
			</p>
			{#if totalDemandItems === 0}
				<div class="no-demands">
					No consumption demands yet. Claim launch complexes or build facilities to generate material demands.
				</div>
			{/if}
		</div>
		{#if materialSummaries.length > 0}
			<div class="supply-table">
				<h4 class="section-label">Supply vs Demand</h4>
				<div class="supply-rows">
					{#each materialSummaries as ms}
						<div class="supply-row" class:deficit={ms.deficit}>
							<span class="supply-swatch" style="background: {ms.color}"></span>
							<span class="supply-name">{ms.name}</span>
							<span class="supply-consumed">{fmtAmount(ms.consumed, ms.name)}</span>
							<span class="supply-sep">/</span>
							<span class="supply-supplied">{fmtAmount(ms.supplied, ms.name)}</span>
							{#if ms.deficit}
								<span class="supply-warn">⚠</span>
							{:else}
								<span class="supply-ok">✓</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Category bars -->
	<div class="consume-grid">
		{#each categoryDefs as cat, i}
			{@const totalMt = getCategoryTotalMt(i)}
			{@const items = consumptionByCategory.get(i) ?? []}
			{@const hasItems = items.length > 0}
			<div class="consume-card" class:has-demand={hasItems}>
				<div class="consume-top">
					<span class="consume-icon">{cat.icon}</span>
					<div class="consume-info">
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<span class="consume-name" class:consume-name-clickable={hasItems}
							onclick={() => hasItems && (detailModalIndex = i)}
							style="color: {cat.color}">
							{cat.name}
							{#if hasItems}
								<span class="demand-badge">{items.length} source{items.length > 1 ? 's' : ''}</span>
							{/if}
						</span>
						<span class="consume-desc">{cat.description}</span>
					</div>
				</div>
				<!-- Demand bar (read-only, no slider) -->
				<div class="consume-bar-track">
					{#if totalMt > 0}
						<div class="consume-bar-demand"
							style="width: {Math.min(100, (totalMt / maxCategoryMt) * 100)}%; --demand-color: {cat.color}"></div>
						<div class="consume-bar-fill"
							style="width: {Math.min(100, (totalMt / maxCategoryMt) * 100)}%; background: {cat.color}; opacity: 0.6"></div>
					{/if}
				</div>
				{#if hasItems}
					<div class="consume-materials">
						{#each [...new Set(items.map(it => it.material))] as matName}
							{@const matTotal = items.filter(it => it.material === matName).reduce((s, it) => s + it.amountMt, 0)}
							{@const matIdx = materialNameIndex.get(matName)}
							<span class="consume-mat-chip" style="border-color: {matIdx !== undefined ? materialDefs[matIdx].color : '#888'}">
								{matName}: {fmtAmount(matTotal, matName)}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
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
						{#if detailPieSlices.length > 0}
							<svg viewBox="0 0 160 160" class="detail-pie-svg">
								{#each detailPieSlices as slice}
									<path d={slice.path} fill={slice.color} stroke="var(--color-bg)" stroke-width="1" />
								{/each}
								<circle cx={DETAIL_CX} cy={DETAIL_CY} r="30" fill="var(--color-bg-panel)" />
								<text x={DETAIL_CX} y={DETAIL_CY - 4} text-anchor="middle" fill="var(--color-text)" font-size="9" font-weight="700">{detailAggItems.length}</text>
								<text x={DETAIL_CX} y={DETAIL_CY + 8} text-anchor="middle" fill="var(--color-text-dim)" font-size="6">materials</text>
							</svg>
						{:else}
							<div class="no-demands" style="font-size: 0.7rem;">No demands</div>
						{/if}
						<div class="detail-legend">
							{#each detailAggItems as ag}
								<div class="detail-legend-row">
									<span class="detail-legend-swatch" style="background: {ag.color}"></span>
									<span class="detail-legend-name">{ag.material}</span>
									<span class="detail-legend-val">{fmtAmount(ag.totalMt, ag.material)}</span>
								</div>
							{/each}
						</div>
					</div>
					<div class="detail-summary">
						<h5 class="detail-sub-header">Sources</h5>
						<div class="detail-source-list">
							{#each detailItems as item}
								<div class="detail-source-row">
									<span class="detail-source-swatch" style="background: {item.color}"></span>
									<span class="detail-source-name">{item.name}</span>
									<span class="detail-source-mat">{item.material}</span>
									<span class="detail-source-val">{fmtAmount(item.amountMt, item.material)}</span>
								</div>
							{/each}
						</div>
						<div class="detail-supply-check">
							<h5 class="detail-sub-header">Supply Check</h5>
							{#each detailAggItems as ag}
								{@const supplied = getSupplyMt(ag.material)}
								{@const deficit = ag.totalMt > supplied}
								<div class="detail-supply-row" class:deficit>
									<span class="detail-supply-mat">{ag.material}</span>
									<span class="detail-supply-bar-wrap">
										<span class="detail-supply-bar-bg">
											<span class="detail-supply-bar-fill" style="width: {supplied > 0 ? Math.min(100, (ag.totalMt / supplied) * 100) : 100}%; background: {deficit ? '#ef4444' : ag.color}"></span>
										</span>
									</span>
									<span class="detail-supply-pct" class:deficit>{supplied > 0 ? ((ag.totalMt / supplied) * 100).toFixed(0) : '∞'}%</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.consumption-tab {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-dim);
		margin-bottom: 0.5rem;
	}

	/* Overview */
	.overview-section {
		display: flex;
		gap: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.overview-left { flex: 1; }

	.overview-desc {
		font-size: 0.7rem;
		color: var(--color-text-dim);
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}

	.no-demands {
		padding: 0.75rem;
		border-radius: 0.4rem;
		border: 1px dashed var(--color-border);
		background: var(--color-bg-panel);
		color: var(--color-text-dim);
		font-size: 0.7rem;
		text-align: center;
	}

	/* Supply table */
	.supply-table {
		min-width: 260px;
		max-width: 320px;
	}

	.supply-rows {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.supply-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6rem;
		padding: 0.15rem 0.3rem;
		border-radius: 0.2rem;
	}

	.supply-row.deficit {
		background: rgba(239, 68, 68, 0.08);
	}

	.supply-swatch {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.supply-name {
		flex: 1;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 600;
	}

	.supply-consumed {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		color: #fbbf24;
		flex-shrink: 0;
	}

	.supply-sep { color: var(--color-border); }

	.supply-supplied {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		color: #4ade80;
		flex-shrink: 0;
	}

	.supply-warn { color: #ef4444; font-weight: 700; flex-shrink: 0; }
	.supply-ok { color: #4ade80; flex-shrink: 0; }

	/* Category grid */
	.consume-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.consume-card {
		padding: 0.6rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
	}

	.consume-card.has-demand {
		border-color: rgba(251, 191, 36, 0.25);
	}

	.consume-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.consume-icon { font-size: 1.1rem; flex-shrink: 0; }
	.consume-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
	.consume-name {
		font-size: 0.8rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}
	.consume-name-clickable {
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 2px;
	}
	.consume-name-clickable:hover { text-decoration-style: solid; filter: brightness(1.2); }
	.consume-desc { font-size: 0.65rem; color: var(--color-text-dim); }

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

	/* Bar */
	.consume-bar-track {
		position: relative;
		height: 14px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.3rem;
	}

	.consume-bar-demand {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		border-radius: 4px;
		pointer-events: none;
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 3px,
			color-mix(in srgb, var(--demand-color) 25%, transparent) 3px,
			color-mix(in srgb, var(--demand-color) 25%, transparent) 6px
		);
		z-index: 0;
	}

	.consume-bar-fill {
		position: relative;
		height: 100%;
		border-radius: 4px;
		pointer-events: none;
		z-index: 1;
	}

	/* Material chips */
	.consume-materials {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.consume-mat-chip {
		font-size: 0.55rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		border: 1px solid;
		background: var(--color-bg);
		color: var(--color-text-dim);
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
		width: 540px;
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
	}

	.detail-sub-header {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin: 0;
	}

	.detail-source-list {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		max-height: 150px;
		overflow-y: auto;
	}

	.detail-source-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6rem;
		padding: 0.1rem 0;
	}

	.detail-source-swatch {
		width: 6px;
		height: 6px;
		border-radius: 1px;
		flex-shrink: 0;
	}

	.detail-source-name {
		flex: 1;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.detail-source-mat {
		color: var(--color-text-dim);
		font-style: italic;
		flex-shrink: 0;
		margin-right: 0.3rem;
	}

	.detail-source-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		color: #fbbf24;
		flex-shrink: 0;
	}

	/* Supply check */
	.detail-supply-check {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.detail-supply-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.6rem;
		padding: 0.15rem 0;
	}

	.detail-supply-row.deficit { color: #fca5a5; }

	.detail-supply-mat {
		min-width: 5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.detail-supply-bar-wrap {
		flex: 1;
	}

	.detail-supply-bar-bg {
		display: block;
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.detail-supply-bar-fill {
		display: block;
		height: 100%;
		border-radius: 3px;
		transition: width 0.2s;
	}

	.detail-supply-pct {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.6rem;
		min-width: 2.5rem;
		text-align: right;
		color: #4ade80;
	}

	.detail-supply-pct.deficit { color: #ef4444; }
</style>
