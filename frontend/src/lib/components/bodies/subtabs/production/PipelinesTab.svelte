<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	interface Flow {
		name: string;
		tPerDay: number;
		type: 'primary' | 'secondary' | 'waste';
	}

	interface StageNode {
		id: string;
		name: string;
		facility: string;
		icon: string;
		inputs: Flow[];
		outputs: Flow[];
		laborPerUnit: number;
		energyMW: number;
		capitalCostM: number;
		color: string;
	}

	// Max throughput in the chain (for normalizing arrow widths)
	const MAX_FLOW = 30000; // t/day
	const MIN_ARROW_PX = 2;
	const MAX_ARROW_PX = 14;

	function flowWidth(tPerDay: number): number {
		return MIN_ARROW_PX + (tPerDay / MAX_FLOW) * (MAX_ARROW_PX - MIN_ARROW_PX);
	}

	function flowColor(type: Flow['type']): string {
		if (type === 'primary') return '#4ade80';
		if (type === 'secondary') return '#fbbf24';
		return '#6b7280';
	}

	const steelChain: StageNode[] = [
		{
			id: 'iron-mine',
			name: 'Iron Ore Mining',
			facility: 'Open-Pit Mine',
			icon: '⛏️',
			inputs: [
				{ name: 'Diesel Fuel', tPerDay: 105, type: 'secondary' },
				{ name: 'Explosives', tPerDay: 6, type: 'secondary' },
			],
			outputs: [
				{ name: 'Raw Ore', tPerDay: 30000, type: 'primary' },
			],
			laborPerUnit: 850,
			energyMW: 45,
			capitalCostM: 4500,
			color: '#a78bfa',
		},
		{
			id: 'beneficiation',
			name: 'Ore Processing',
			facility: 'Beneficiation Plant (×3)',
			icon: '🏭',
			inputs: [
				{ name: 'Raw Ore', tPerDay: 30000, type: 'primary' },
			],
			outputs: [
				{ name: 'Iron Concentrate', tPerDay: 19500, type: 'primary' },
				{ name: 'Tailings / Waste', tPerDay: 10500, type: 'waste' },
			],
			laborPerUnit: 600,
			energyMW: 90,
			capitalCostM: 2400,
			color: '#8b5cf6',
		},
		{
			id: 'blast-furnace',
			name: 'Iron Smelting',
			facility: 'Blast Furnace (×1.5)',
			icon: '🔥',
			inputs: [
				{ name: 'Iron Concentrate', tPerDay: 19500, type: 'primary' },
				{ name: 'Coke', tPerDay: 7800, type: 'secondary' },
				{ name: 'Limestone', tPerDay: 2700, type: 'secondary' },
			],
			outputs: [
				{ name: 'Pig Iron', tPerDay: 15000, type: 'primary' },
				{ name: 'Slag', tPerDay: 5000, type: 'waste' },
				{ name: 'BF Gas', tPerDay: 4500, type: 'waste' },
			],
			laborPerUnit: 900,
			energyMW: 375,
			capitalCostM: 4800,
			color: '#f97316',
		},
		{
			id: 'steelmaking',
			name: 'Steelmaking',
			facility: 'BOF Converter (×1.5)',
			icon: '⚡',
			inputs: [
				{ name: 'Pig Iron', tPerDay: 12750, type: 'primary' },
				{ name: 'Scrap Steel', tPerDay: 2250, type: 'secondary' },
				{ name: 'Oxygen', tPerDay: 900, type: 'secondary' },
			],
			outputs: [
				{ name: 'Raw Steel', tPerDay: 15000, type: 'primary' },
				{ name: 'BOF Slag', tPerDay: 1500, type: 'waste' },
			],
			laborPerUnit: 600,
			energyMW: 270,
			capitalCostM: 3750,
			color: '#ef4444',
		},
		{
			id: 'alloying',
			name: 'Alloying',
			facility: 'Ladle Refinery (×1.5)',
			icon: '🧪',
			inputs: [
				{ name: 'Raw Steel', tPerDay: 15000, type: 'primary' },
				{ name: 'Alloy Additives', tPerDay: 435, type: 'secondary' },
			],
			outputs: [
				{ name: 'Steel Alloys', tPerDay: 14700, type: 'primary' },
				{ name: 'Dross', tPerDay: 735, type: 'waste' },
			],
			laborPerUnit: 375,
			energyMW: 120,
			capitalCostM: 1350,
			color: '#06b6d4',
		},
		{
			id: 'forming',
			name: 'Forming & Fab',
			facility: 'Forming Plant (×3)',
			icon: '🔨',
			inputs: [
				{ name: 'Steel Alloys', tPerDay: 14700, type: 'primary' },
			],
			outputs: [
				{ name: 'Structural Steel', tPerDay: 13500, type: 'primary' },
				{ name: 'Scrap / Trim', tPerDay: 1200, type: 'waste' },
			],
			laborPerUnit: 1050,
			energyMW: 180,
			capitalCostM: 3600,
			color: '#4ade80',
		},
	];

	// Compute connection flows: output of stage i → input of stage i+1
	// Compare the primary output throughput vs the matching input throughput
	interface Connection {
		name: string;
		outputTPD: number;
		inputTPD: number;
		color: string;
	}

	function getConnections(): Connection[] {
		const conns: Connection[] = [];
		for (let i = 0; i < steelChain.length - 1; i++) {
			const src = steelChain[i];
			const dst = steelChain[i + 1];
			const primaryOut = src.outputs.find(o => o.type === 'primary');
			const matchIn = dst.inputs.find(inp => inp.type === 'primary');
			if (primaryOut && matchIn) {
				conns.push({
					name: primaryOut.name,
					outputTPD: primaryOut.tPerDay,
					inputTPD: matchIn.tPerDay,
					color: src.color,
				});
			}
		}
		return conns;
	}
	const connections = getConnections();

	// Build SVG taper polygon points for a connector
	function taperPoints(outW: number, inW: number, svgH: number): string {
		const cy = svgH / 2;
		const y1out = cy - outW / 2;
		const y2out = cy + outW / 2;
		const y1in = cy - inW / 2;
		const y2in = cy + inW / 2;
		return `0,${y1out} 0,${y2out} 20,${y2in} 20,${y1in}`;
	}

	function formatTPD(t: number): string {
		if (t >= 1000) return (t / 1000).toFixed(1) + 'k';
		return t.toString();
	}
</script>

<div class="pipelines-tab">
	<p class="text-xs text-[var(--color-text-dim)] mb-4">
		Production pipelines showing material flow from extraction to finished products.
		Arrow thickness depicts throughput — mismatched widths show unrealized capacity.
	</p>

	<!-- Steel Production Chain -->
	<div class="chain-section">
		<h4 class="chain-title">🔩 Steel Production Chain</h4>

		<div class="pipeline-scroll">
			<div class="pipeline-row">
				{#each steelChain as node, i}
					<!-- Stage tile -->
					<div class="stage-tile" style="border-color: {node.color}">
						<!-- Header -->
						<div class="tile-header" style="background: {node.color}18; border-bottom-color: {node.color}33">
							<span class="tile-icon">{node.icon}</span>
							<div class="tile-titles">
								<span class="tile-name" style="color: {node.color}">{node.name}</span>
								<span class="tile-facility">{node.facility}</span>
							</div>
						</div>

						<!-- Inputs -->
						<div class="tile-io-section">
							<span class="tile-io-label">INPUTS</span>
							{#each node.inputs as inp}
								<div class="tile-io-row">
									<div class="flow-indicator" style="width: {flowWidth(inp.tPerDay)}px; background: {flowColor(inp.type)}"></div>
									<span class="tile-io-name">{inp.name}</span>
									<span class="tile-io-amount">{formatTPD(inp.tPerDay)} t/d</span>
								</div>
							{/each}
						</div>

						<!-- Outputs -->
						<div class="tile-io-section">
							<span class="tile-io-label">OUTPUTS</span>
							{#each node.outputs as out}
								<div class="tile-io-row">
									<div class="flow-indicator" style="width: {flowWidth(out.tPerDay)}px; background: {flowColor(out.type)}"></div>
									<span class="tile-io-name" class:output-primary={out.type === 'primary'} class:output-waste={out.type === 'waste'}>
										{out.name}
									</span>
									<span class="tile-io-amount">{formatTPD(out.tPerDay)} t/d</span>
								</div>
							{/each}
						</div>

						<!-- Stats footer -->
						<div class="tile-footer">
							<span class="tile-stat">👷 {node.laborPerUnit}</span>
							<span class="tile-stat">⚡ {node.energyMW} MW</span>
							<span class="tile-stat">💰 ${node.capitalCostM}M</span>
						</div>
					</div>

					<!-- Connection between stages -->
					{#if i < steelChain.length - 1}
						{@const conn = connections[i]}
						{@const outW = flowWidth(conn.outputTPD)}
						{@const inW = flowWidth(conn.inputTPD)}
						{@const maxW = Math.max(outW, inW)}
						<div class="stage-connector">
							<!-- Primary flow line (thick) -->
							<div class="connector-flow" style="height: {maxW + 4}px">
								<div class="flow-line-out" style="height: {outW}px; background: {conn.color}"></div>
								{#if conn.outputTPD !== conn.inputTPD}
									<svg class="flow-taper" viewBox="0 0 20 {maxW + 4}" preserveAspectRatio="none"
										style="height: {maxW + 4}px">
										<polygon
											points="{taperPoints(outW, inW, maxW + 4)}"
											fill="{conn.color}" opacity="0.5"
										/>
									</svg>
								{/if}
								<div class="flow-line-in" style="height: {inW}px; background: {conn.color}; opacity: 0.7"></div>
							</div>
							<!-- Label -->
							<div class="connector-label">
								<span class="connector-name">{conn.name}</span>
								<span class="connector-tpd">{formatTPD(conn.outputTPD)} t/d</span>
								{#if conn.outputTPD !== conn.inputTPD}
									<span class="connector-mismatch">→ {formatTPD(conn.inputTPD)} t/d in</span>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Summary -->
		<div class="chain-summary">
			<h5 class="summary-title">Full Chain Summary</h5>
			<div class="summary-stats">
				<div class="summary-item">
					<span class="sum-label">End-to-end</span>
					<span class="sum-value">1 mine → 3 beneficiation → 1.5 blast furnaces → 1.5 BOF → 1.5 foundries → 3 forming plants</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Total labor</span>
					<span class="sum-value">~4,375 workers for a full integrated steel complex</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Total energy</span>
					<span class="sum-value">~1,080 MW</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Total capital</span>
					<span class="sum-value">~$20.4B for a complete mine-to-product facility</span>
				</div>
				<div class="summary-item">
					<span class="sum-label">Daily output</span>
					<span class="sum-value">~13,500 t/day structural steel components per full chain</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.pipelines-tab {
		display: flex;
		flex-direction: column;
	}

	.chain-section {
		margin-bottom: 1.5rem;
	}

	.chain-title {
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	/* Horizontal scrollable pipeline */
	.pipeline-scroll {
		overflow-x: auto;
		padding-bottom: 0.5rem;
	}

	.pipeline-row {
		display: flex;
		align-items: stretch;
		gap: 0;
		min-width: max-content;
	}

	/* Square-ish stage tiles */
	.stage-tile {
		width: 190px;
		min-width: 190px;
		border: 1px solid;
		border-radius: 0.5rem;
		background: var(--color-bg-panel);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.tile-header {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid;
		border-radius: 0.5rem 0.5rem 0 0;
	}

	.tile-icon { font-size: 1rem; }

	.tile-titles {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.tile-name {
		font-size: 0.72rem;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tile-facility {
		font-size: 0.55rem;
		color: var(--color-text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* I/O sections inside tile */
	.tile-io-section {
		padding: 0.3rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.tile-io-section + .tile-io-section {
		border-top: 1px solid var(--color-border);
	}

	.tile-io-label {
		font-size: 0.5rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.05rem;
	}

	.tile-io-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6rem;
	}

	.flow-indicator {
		height: 8px;
		border-radius: 1px;
		flex-shrink: 0;
	}

	.tile-io-name {
		color: var(--color-text-dim);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tile-io-name.output-primary {
		color: #4ade80;
		font-weight: 600;
	}

	.tile-io-name.output-waste {
		color: #6b7280;
		font-style: italic;
	}

	.tile-io-amount {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.55rem;
		color: var(--color-text-dim);
		flex-shrink: 0;
	}

	/* Stats footer */
	.tile-footer {
		margin-top: auto;
		padding: 0.3rem 0.5rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.tile-stat {
		font-size: 0.5rem;
		color: var(--color-text-dim);
		white-space: nowrap;
	}

	/* Connector between tiles */
	.stage-connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 60px;
		min-width: 60px;
		flex-shrink: 0;
		padding: 0 2px;
	}

	.connector-flow {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.flow-line-out {
		flex: 1;
		border-radius: 1px 0 0 1px;
		opacity: 0.6;
	}

	.flow-taper {
		width: 20px;
		flex-shrink: 0;
	}

	.flow-line-in {
		flex: 1;
		border-radius: 0 1px 1px 0;
	}

	.connector-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.2rem;
		text-align: center;
	}

	.connector-name {
		font-size: 0.5rem;
		color: var(--color-text-dim);
		white-space: nowrap;
		line-height: 1.1;
	}

	.connector-tpd {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.5rem;
		color: var(--color-text);
		font-weight: 600;
		white-space: nowrap;
	}

	.connector-mismatch {
		font-size: 0.45rem;
		color: #fbbf24;
		white-space: nowrap;
	}

	/* Summary */
	.chain-summary {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: 0.4rem;
		border: 1px dashed var(--color-border);
		background: var(--color-bg-panel);
	}

	.summary-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.5rem;
	}

	.summary-stats {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.summary-item {
		display: flex;
		gap: 0.5rem;
		font-size: 0.7rem;
	}

	.sum-label {
		font-weight: 600;
		color: var(--color-text-dim);
		min-width: 6rem;
		flex-shrink: 0;
	}

	.sum-value {
		color: var(--color-text);
	}
</style>
