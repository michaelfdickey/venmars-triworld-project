<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	interface Rocket {
		name: string;
		provider: string;
		status: 'operational' | 'development' | 'retired';
		payloadLEO: number;
		payloadGTO: number;
		payloadTLI: number;
		costPerLaunch: number;
		reusable: boolean;
		stages: number;
		height: number;
		diameter: number;
		propellant: string;
		thrust: number;
		color: string;
		shape: 'single' | 'triple' | 'wide-dual' | 'srb';
	}

	const maxHeight = 121;

	// Inventory: per-body map of rocket name → count
	const inventory: Record<string, Record<string, number>> = $state({
		earth: {
			'Starship / Super Heavy': 1,
			'Falcon Heavy': 1,
			'Falcon 9 Block 5': 1,
			'SLS Block 2': 1,
			'New Glenn': 1,
			'Vulcan Centaur': 1,
			'Long March 9': 1,
			'Ariane 6 (A64)': 1,
			'Neutron': 1,
			'Terran R': 1,
		},
		moon: {},
		venus: {},
		mars: {},
		asteroids: {},
	});

	function getCount(rocketName: string): number {
		return inventory[bodyId]?.[rocketName] ?? 0;
	}

	function adjustCount(rocketName: string, delta: number) {
		if (!inventory[bodyId]) inventory[bodyId] = {};
		const current = inventory[bodyId][rocketName] ?? 0;
		const next = Math.max(0, current + delta);
		inventory[bodyId][rocketName] = next;
	}

	let totalInventory = $derived(
		Object.values(inventory[bodyId] ?? {}).reduce((sum, n) => sum + n, 0)
	);

	const rockets: Rocket[] = [
		{
			name: 'Starship / Super Heavy',
			provider: 'SpaceX',
			status: 'operational',
			payloadLEO: 150000,
			payloadGTO: 21000,
			payloadTLI: 50000,
			costPerLaunch: 10,
			reusable: true,
			stages: 2,
			height: 121,
			diameter: 9,
			propellant: 'LCH₄ / LOX',
			thrust: 74500,
			color: '#3b82f6',
			shape: 'wide-dual',
		},
		{
			name: 'Falcon Heavy',
			provider: 'SpaceX',
			status: 'operational',
			payloadLEO: 63800,
			payloadGTO: 26700,
			payloadTLI: 16000,
			costPerLaunch: 97,
			reusable: true,
			stages: 2,
			height: 70,
			diameter: 3.66,
			propellant: 'RP-1 / LOX',
			thrust: 22819,
			color: '#60a5fa',
			shape: 'triple',
		},
		{
			name: 'Falcon 9 Block 5',
			provider: 'SpaceX',
			status: 'operational',
			payloadLEO: 22800,
			payloadGTO: 8300,
			payloadTLI: 4020,
			costPerLaunch: 67,
			reusable: true,
			stages: 2,
			height: 70,
			diameter: 3.66,
			propellant: 'RP-1 / LOX',
			thrust: 7607,
			color: '#93c5fd',
			shape: 'single',
		},
		{
			name: 'SLS Block 2',
			provider: 'NASA / Boeing',
			status: 'operational',
			payloadLEO: 130000,
			payloadGTO: 42000,
			payloadTLI: 46000,
			costPerLaunch: 2200,
			reusable: false,
			stages: 2,
			height: 111,
			diameter: 8.4,
			propellant: 'LH₂ / LOX + SRBs',
			thrust: 39144,
			color: '#f97316',
			shape: 'srb',
		},
		{
			name: 'New Glenn',
			provider: 'Blue Origin',
			status: 'operational',
			payloadLEO: 45000,
			payloadGTO: 13000,
			payloadTLI: 8000,
			costPerLaunch: 68,
			reusable: true,
			stages: 2,
			height: 98,
			diameter: 7,
			propellant: 'LCH₄ / LOX (S1) + LH₂ / LOX (S2)',
			thrust: 17100,
			color: '#06b6d4',
			shape: 'wide-dual',
		},
		{
			name: 'Vulcan Centaur',
			provider: 'ULA',
			status: 'operational',
			payloadLEO: 27200,
			payloadGTO: 14400,
			payloadTLI: 7700,
			costPerLaunch: 110,
			reusable: false,
			stages: 2,
			height: 62,
			diameter: 5.4,
			propellant: 'LCH₄ / LOX + SRBs',
			thrust: 11060,
			color: '#fbbf24',
			shape: 'srb',
		},
		{
			name: 'Long March 9',
			provider: 'CASC (China)',
			status: 'operational',
			payloadLEO: 150000,
			payloadGTO: 50000,
			payloadTLI: 53000,
			costPerLaunch: 500,
			reusable: false,
			stages: 3,
			height: 114,
			diameter: 10.6,
			propellant: 'Kerolox (S1) + LH₂ / LOX (S2/S3)',
			thrust: 57840,
			color: '#ef4444',
			shape: 'srb',
		},
		{
			name: 'Ariane 6 (A64)',
			provider: 'ArianeGroup (ESA)',
			status: 'operational',
			payloadLEO: 21650,
			payloadGTO: 11500,
			payloadTLI: 4500,
			costPerLaunch: 115,
			reusable: false,
			stages: 2,
			height: 63,
			diameter: 5.4,
			propellant: 'LH₂ / LOX + SRBs',
			thrust: 8000,
			color: '#8b5cf6',
			shape: 'srb',
		},
		{
			name: 'Neutron',
			provider: 'Rocket Lab',
			status: 'operational',
			payloadLEO: 13000,
			payloadGTO: 3000,
			payloadTLI: 1500,
			costPerLaunch: 50,
			reusable: true,
			stages: 2,
			height: 43,
			diameter: 4.6,
			propellant: 'LCH₄ / LOX',
			thrust: 6900,
			color: '#10b981',
			shape: 'single',
		},
		{
			name: 'Terran R',
			provider: 'Relativity Space',
			status: 'development',
			payloadLEO: 33500,
			payloadGTO: 12000,
			payloadTLI: 5500,
			costPerLaunch: 55,
			reusable: true,
			stages: 2,
			height: 66,
			diameter: 5,
			propellant: 'LCH₄ / LOX',
			thrust: 11000,
			color: '#a78bfa',
			shape: 'single',
		},
	];

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}

	function statusColor(s: Rocket['status']): string {
		if (s === 'operational') return '#4ade80';
		if (s === 'development') return '#fbbf24';
		return '#6b7280';
	}

	let sortKey = $state<'payloadLEO' | 'costPerLaunch' | 'name'>('payloadLEO');
	let sortedRockets = $derived(
		[...rockets].sort((a, b) => {
			if (sortKey === 'name') return a.name.localeCompare(b.name);
			if (sortKey === 'costPerLaunch') return a.costPerLaunch - b.costPerLaunch;
			return b.payloadLEO - a.payloadLEO;
		})
	);
</script>

<div class="rockets-tab">
	<div class="rockets-header">
		<h3 class="text-lg font-semibold">Launch Vehicles</h3>
		<div class="inventory-summary">
			<span class="inventory-total">{totalInventory}</span>
			<span class="inventory-label">vehicles</span>
		</div>
		<div class="sort-controls">
			<span class="sort-label">Sort:</span>
			<button class="sort-btn" class:active={sortKey === 'payloadLEO'} onclick={() => sortKey = 'payloadLEO'}>Payload</button>
			<button class="sort-btn" class:active={sortKey === 'costPerLaunch'} onclick={() => sortKey = 'costPerLaunch'}>Cost</button>
			<button class="sort-btn" class:active={sortKey === 'name'} onclick={() => sortKey = 'name'}>Name</button>
		</div>
	</div>

	<div class="rocket-list">
		{#each sortedRockets as rocket}
			<div class="rocket-card" class:no-stock={getCount(rocket.name) === 0}>
				<!-- Inventory controls -->
				<div class="inventory-controls" style="border-color: {rocket.color}">
					<button class="inv-btn" onclick={() => adjustCount(rocket.name, -1)} disabled={getCount(rocket.name) === 0}>−</button>
					<span class="inv-count" style="color: {getCount(rocket.name) > 0 ? rocket.color : 'var(--color-text-dim)'}">{getCount(rocket.name)}</span>
					<button class="inv-btn" onclick={() => adjustCount(rocket.name, 1)}>+</button>
				</div>

				<!-- Horizontal rocket silhouette above specs -->
				<div class="rocket-visual">
					<div class="rocket-silhouette" style="width: {Math.max(28, (rocket.height / maxHeight) * 100)}%;">
						<svg viewBox="0 0 200 30" preserveAspectRatio="xMidYMid meet" style="filter: drop-shadow(0 0 4px {rocket.color}66);">
							{#if rocket.shape === 'single'}
								<rect x="8" y="10" width="152" height="10" rx="2" fill={rocket.color} opacity="0.7"/>
								<polygon points="160,10 160,20 188,15" fill={rocket.color} opacity="0.9"/>
								<rect x="0" y="9" width="8" height="12" rx="1" fill={rocket.color} opacity="0.4"/>
								<rect x="2" y="6" width="3" height="4" rx="1" fill={rocket.color} opacity="0.3"/>
								<rect x="2" y="20" width="3" height="4" rx="1" fill={rocket.color} opacity="0.3"/>
							{:else if rocket.shape === 'triple'}
								<rect x="8" y="11" width="152" height="8" rx="2" fill={rocket.color} opacity="0.75"/>
								<rect x="14" y="2" width="130" height="7" rx="2" fill={rocket.color} opacity="0.45"/>
								<rect x="14" y="21" width="130" height="7" rx="2" fill={rocket.color} opacity="0.45"/>
								<polygon points="160,11 160,19 186,15" fill={rocket.color} opacity="0.9"/>
								<rect x="0" y="1" width="8" height="28" rx="1" fill={rocket.color} opacity="0.3"/>
							{:else if rocket.shape === 'wide-dual'}
								<rect x="8" y="4" width="102" height="22" rx="2" fill={rocket.color} opacity="0.55"/>
								<rect x="112" y="6.5" width="53" height="17" rx="2" fill={rocket.color} opacity="0.7"/>
								<polygon points="165,6.5 165,23.5 192,15" fill={rocket.color} opacity="0.9"/>
								<rect x="0" y="3" width="8" height="24" rx="1" fill={rocket.color} opacity="0.35"/>
								<line x1="111" y1="4" x2="111" y2="26" stroke={rocket.color} stroke-width="1" opacity="0.35"/>
							{:else if rocket.shape === 'srb'}
								<rect x="8" y="9" width="152" height="12" rx="2" fill={rocket.color} opacity="0.7"/>
								<rect x="16" y="1.5" width="118" height="6" rx="2" fill={rocket.color} opacity="0.38"/>
								<rect x="16" y="22.5" width="118" height="6" rx="2" fill={rocket.color} opacity="0.38"/>
								<polygon points="160,9 160,21 188,15" fill={rocket.color} opacity="0.9"/>
								<rect x="0" y="0.5" width="8" height="29" rx="1" fill={rocket.color} opacity="0.3"/>
							{/if}
						</svg>
					</div>
					<span class="rocket-height-label">{rocket.height}m</span>
				</div>

				<div class="rocket-header">
					<div>
						<span class="rocket-name" style="color: {rocket.color}">{rocket.name}</span>
						<span class="rocket-provider">{rocket.provider}</span>
					</div>
					<span class="rocket-status" style="color: {statusColor(rocket.status)}">
						{rocket.status.toUpperCase()}
					</span>
				</div>

				<div class="rocket-specs">
					<div class="spec">
						<span class="spec-label">LEO</span>
						<span class="spec-value">{formatMass(rocket.payloadLEO)}</span>
					</div>
					<div class="spec">
						<span class="spec-label">GTO</span>
						<span class="spec-value">{formatMass(rocket.payloadGTO)}</span>
					</div>
					<div class="spec">
						<span class="spec-label">TLI</span>
						<span class="spec-value">{formatMass(rocket.payloadTLI)}</span>
					</div>
					<div class="spec">
						<span class="spec-label">Cost</span>
						<span class="spec-value">${rocket.costPerLaunch}M</span>
					</div>
				</div>

				<div class="rocket-details">
					<span>{rocket.propellant}</span>
					<span>{rocket.height}m × {rocket.diameter}m</span>
					<span>{rocket.stages}-stage</span>
					<span>{(rocket.thrust / 1000).toFixed(1)} MN</span>
					{#if rocket.reusable}
						<span class="reusable-badge">♻️ Reusable</span>
					{/if}
				</div>

				<div class="capacity-bar-bg">
					<div class="capacity-bar" style="width: {Math.min(100, (rocket.payloadLEO / 150000) * 100)}%; background: linear-gradient(90deg, {rocket.color}88, {rocket.color});"></div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.rockets-tab {
		display: flex;
		flex-direction: column;
	}

	.rockets-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.sort-label {
		color: var(--color-text-dim);
	}

	.sort-btn {
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		cursor: pointer;
		transition: all 0.15s;
	}
	.sort-btn:hover { color: var(--color-text); }
	.sort-btn.active {
		background: var(--color-border);
		color: var(--color-text);
	}

	.rocket-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.rocket-card {
		padding: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
		transition: border-color 0.15s, opacity 0.15s;
		position: relative;
	}
	.rocket-card:hover {
		border-color: var(--color-text-dim);
	}
	.rocket-card.no-stock {
		opacity: 0.45;
	}

	.inventory-controls {
		position: absolute;
		top: 0.4rem;
		right: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		border: 1px solid;
		border-radius: 1rem;
		padding: 0.15rem 0.3rem;
		background: var(--color-bg);
		z-index: 1;
	}

	.inv-btn {
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.8rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		padding: 0;
	}
	.inv-btn:hover:not(:disabled) {
		background: var(--color-border);
		color: var(--color-text);
	}
	.inv-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.inv-count {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.85rem;
		font-weight: 700;
		min-width: 1.2rem;
		text-align: center;
	}

	.inventory-summary {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.inventory-total {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 1.1rem;
		font-weight: 700;
		color: #4ade80;
	}

	.inventory-label {
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}

	.rocket-visual {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.rocket-silhouette {
		min-width: 60px;
	}

	.rocket-silhouette svg {
		width: 100%;
		height: auto;
		display: block;
	}

	.rocket-height-label {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		color: var(--color-text-dim);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.rocket-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.rocket-name {
		font-weight: 600;
		font-size: 0.9rem;
		margin-right: 0.5rem;
	}

	.rocket-provider {
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}

	.rocket-status {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.rocket-specs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.spec {
		text-align: center;
		padding: 0.3rem;
		background: var(--color-bg);
		border-radius: 0.3rem;
	}

	.spec-label {
		display: block;
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.1rem;
	}

	.spec-value {
		display: block;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.rocket-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.65rem;
		color: var(--color-text-dim);
		margin-bottom: 0.5rem;
	}

	.reusable-badge {
		color: #4ade80;
	}

	.capacity-bar-bg {
		height: 3px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
	}

	.capacity-bar {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s;
	}
</style>
