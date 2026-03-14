<script lang="ts">
	import { rocketDefs, rocketInventory, launchComplexCosts, claimedComplexes, type RocketDef } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	const maxHeight = 121;

	// ── Inventory helpers using writable store ──
	function getOwned(rocketId: string): number {
		return $rocketInventory[rocketId] ?? 0;
	}

	function getGlobalAvailable(rocket: RocketDef): number {
		return Math.max(0, rocket.globalInventory - getOwned(rocket.id));
	}

	function purchase(rocket: RocketDef) {
		if (getGlobalAvailable(rocket) <= 0) return;
		// Must own the home base launch complex to purchase
		if (!$claimedComplexes.has(rocket.homeBase)) return;
		rocketInventory.update(inv => ({ ...inv, [rocket.id]: (inv[rocket.id] ?? 0) + 1 }));
	}

	function sell(rocketId: string) {
		const current = getOwned(rocketId);
		if (current <= 0) return;
		rocketInventory.update(inv => ({ ...inv, [rocketId]: current - 1 }));
	}

	let totalOwned = $derived(
		Object.values($rocketInventory).reduce((sum, n) => sum + n, 0)
	);

	let totalMaintenanceCostM = $derived(
		rocketDefs.reduce((sum, r) => sum + getOwned(r.id) * r.maintenanceCostM, 0)
	);

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}

	function statusColor(s: RocketDef['status']): string {
		if (s === 'operational') return '#4ade80';
		if (s === 'development') return '#fbbf24';
		return '#6b7280';
	}

	function homeBaseName(complexId: string): string {
		return launchComplexCosts[complexId]?.name ?? complexId;
	}

	let sortKey = $state<'payloadLEO' | 'costPerLaunch' | 'name'>('payloadLEO');
	let sortedRockets = $derived(
		[...rocketDefs].sort((a, b) => {
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
			<span class="inventory-total">{totalOwned}</span>
			<span class="inventory-label">owned</span>
			<span class="inventory-sep">·</span>
			<span class="inventory-cost">${(totalMaintenanceCostM / 1000).toFixed(2)}B/yr</span>
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
			{@const owned = getOwned(rocket.id)}
			{@const available = getGlobalAvailable(rocket)}
			{@const hasBase = $claimedComplexes.has(rocket.homeBase)}
			<div class="rocket-card" class:no-stock={owned === 0}>
				<!-- Inventory controls -->
				<div class="inventory-panel" style="border-color: {rocket.color}">
					<div class="inv-row">
						<span class="inv-label">Global</span>
						<span class="inv-global-count">{rocket.globalInventory}</span>
					</div>
					<div class="inv-row">
						<span class="inv-label">Available</span>
						<span class="inv-avail-count" class:none={available === 0}>{available}</span>
					</div>
					<div class="inv-row inv-row-owned">
						<span class="inv-label">Owned</span>
						<div class="inv-controls">
							<button class="inv-btn" onclick={() => sell(rocket.id)} disabled={owned === 0}>−</button>
							<span class="inv-count" style="color: {owned > 0 ? rocket.color : 'var(--color-text-dim)'}">{owned}</span>
							<button class="inv-btn" onclick={() => purchase(rocket)} disabled={available === 0 || !hasBase}>+</button>
						</div>
					</div>
					{#if owned > 0}
						<div class="inv-maint">
							<span class="inv-maint-label">Maint:</span>
							<span class="inv-maint-val">${(owned * rocket.maintenanceCostM).toFixed(0)}M/yr</span>
						</div>
					{/if}
					<div class="inv-home">
						<span class="inv-home-icon">{hasBase ? '🏠' : '🔒'}</span>
						<span class="inv-home-name" class:locked={!hasBase}>{homeBaseName(rocket.homeBase)}</span>
					</div>
					{#if !hasBase}
						<span class="inv-home-hint">Claim complex to purchase</span>
					{/if}
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
						<span class="spec-label">Volume</span>
						<span class="spec-value">{rocket.fairingVolume_m3} m³</span>
					</div>
					<div class="spec">
						<span class="spec-label">Launch</span>
						<span class="spec-value">${rocket.costPerLaunch}M</span>
					</div>
					<div class="spec">
						<span class="spec-label">Purchase</span>
						<span class="spec-value">${rocket.purchaseCostM}M</span>
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
	.rocket-card.no-stock > :not(.inventory-panel) {
		opacity: 0.55;
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

	.inventory-sep {
		color: var(--color-border);
	}

	.inventory-cost {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		color: #fbbf24;
	}

	/* Inventory panel */
	.inventory-panel {
		position: absolute;
		top: 0.4rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		border: 1px solid;
		border-radius: 0.5rem;
		padding: 0.35rem 0.45rem;
		background: var(--color-bg);
		z-index: 1;
		min-width: 110px;
	}

	.inv-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.3rem;
	}

	.inv-row-owned {
		padding-top: 0.15rem;
		border-top: 1px solid var(--color-border);
	}

	.inv-label {
		font-size: 0.55rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.inv-global-count {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}

	.inv-avail-count {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		color: #4ade80;
	}
	.inv-avail-count.none { color: #ef4444; }

	.inv-controls {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.inv-maint {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.1rem;
	}

	.inv-maint-label {
		font-size: 0.5rem;
		color: var(--color-text-dim);
	}

	.inv-maint-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.6rem;
		color: #fbbf24;
	}

	.inv-home {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		padding-top: 0.1rem;
		border-top: 1px solid var(--color-border);
	}

	.inv-home-icon { font-size: 0.6rem; }

	.inv-home-name {
		font-size: 0.5rem;
		color: var(--color-text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.inv-home-name.locked { color: #ef4444; }

	.inv-home-hint {
		font-size: 0.45rem;
		color: #ef4444;
		font-style: italic;
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
		grid-template-columns: repeat(6, 1fr);
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
