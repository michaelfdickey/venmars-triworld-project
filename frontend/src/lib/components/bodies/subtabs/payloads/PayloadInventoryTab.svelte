<script lang="ts">
	import { payloadInventory, reservedPayloads, marketSatellites, venMarsPayloads, customPayloads, payloadCategoryLabels, payloadCategoryIcons, type PayloadDef, type PayloadCategory, type DeployMethod } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	const deployMethodLabels: Record<DeployMethod, string> = {
		'spin-stabilized': 'Spin',
		'propulsive': 'Propulsive',
		'docking': 'Docking',
		'electromagnetic': 'EM Rail',
		'cold-gas': 'Cold-Gas',
		'gravity-release': 'Gravity',
	};

	// Build a lookup of all payload defs by id
	let allPayloads = $derived.by(() => {
		const map = new Map<string, PayloadDef>();
		for (const p of marketSatellites) map.set(p.id, p);
		for (const p of venMarsPayloads) map.set(p.id, p);
		for (const p of $customPayloads) map.set(p.id, p);
		return map;
	});

	// Inventory items with resolved defs
	interface InventoryItem {
		payload: PayloadDef;
		count: number;
		reserved: number;
		available: number;
	}

	let inventoryItems = $derived.by(() => {
		const items: InventoryItem[] = [];
		for (const [id, count] of Object.entries($payloadInventory)) {
			if (count <= 0) continue;
			const payload = allPayloads.get(id);
			if (payload) {
				const reserved = $reservedPayloads[id] ?? 0;
				items.push({ payload, count, reserved, available: count - reserved });
			}
		}
		return items;
	});

	// Group by category
	const categoryOrder: PayloadCategory[] = [
		'comms', 'weather', 'nav', 'science', 'imaging', 'relay', 'probe',
		'terraforming', 'infrastructure', 'habitat', 'vehicle', 'mining',
		'factory', 'transport', 'supply', 'fuel',
	];

	let grouped = $derived(
		categoryOrder
			.map(cat => ({
				cat,
				label: payloadCategoryLabels[cat],
				icon: payloadCategoryIcons[cat],
				items: inventoryItems.filter(i => i.payload.category === cat),
			}))
			.filter(g => g.items.length > 0)
	);

	let totalItems = $derived(inventoryItems.reduce((sum, i) => sum + i.count, 0));
	let totalReserved = $derived(inventoryItems.reduce((sum, i) => sum + i.reserved, 0));
	let totalValue = $derived(inventoryItems.reduce((sum, i) => sum + i.payload.cost * i.count, 0));

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}
</script>

<div class="inventory-tab">
	<div class="flex items-center justify-between mb-3">
		<div>
			<h3 class="text-base font-semibold">Payload Inventory</h3>
			<p class="text-xs text-[var(--color-text-dim)]">All payloads currently owned and available for missions</p>
		</div>
		{#if totalItems > 0}
			<div class="summary-badges">
				<span class="badge">{totalItems} unit{totalItems !== 1 ? 's' : ''}</span>
				{#if totalReserved > 0}
					<span class="badge reserved">{totalReserved} reserved</span>
				{/if}
				<span class="badge value">${totalValue.toFixed(1)}M total</span>
			</div>
		{/if}
	</div>

	{#if inventoryItems.length === 0}
		<div class="empty-state">
			<span class="text-3xl">📦</span>
			<p class="text-sm text-[var(--color-text-dim)]">No payloads in inventory</p>
			<p class="text-xs text-[var(--color-text-dim)]">Purchase satellites from Market or order VenMars payloads to get started</p>
		</div>
	{:else}
		{#each grouped as group}
			<div class="category-section">
				<div class="category-header">
					<span>{group.icon}</span>
					<span>{group.label}</span>
					<span class="category-count">{group.items.reduce((s, i) => s + i.count, 0)}</span>
				</div>

				<div class="inv-grid">
					{#each group.items as { payload, count, reserved, available }}
						<div class="inv-card" class:has-reserved={reserved > 0}>
							<div class="inv-top">
								<span class="inv-icon">{payload.icon}</span>
								<div class="inv-info">
									<span class="inv-name">{payload.name}</span>
									<span class="inv-cat">{payloadCategoryLabels[payload.category]}</span>
								</div>
								<div class="inv-qty-col">
									<span class="inv-qty">×{count}</span>
									{#if reserved > 0}
										<div class="inv-alloc-row">
											<span class="inv-avail">{available} avail</span>
											<span class="inv-reserved">{reserved} sched</span>
										</div>
									{/if}
								</div>
							</div>

							<div class="inv-stats">
								<div class="stat">
									<span class="stat-label">Mass</span>
									<span class="stat-value">{formatMass(payload.mass)}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Cost ea.</span>
									<span class="stat-value">${payload.cost}M</span>
								</div>
								<div class="stat">
									<span class="stat-label">ΔV</span>
									<span class="stat-value">{payload.deltaV > 0 ? payload.deltaV.toLocaleString() + ' m/s' : '—'}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Comm</span>
									<span class="stat-value comm">{payload.commRange}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Life</span>
									<span class="stat-value">{payload.lifespan > 0 ? payload.lifespan + ' yr' : '1-use'}</span>
								</div>
								<div class="stat">								<span class="stat-label">Max G</span>
								<span class="stat-value">{payload.maxGs > 0 ? payload.maxGs + ' g' : '—'}</span>
							</div>
							<div class="stat">									<span class="stat-label">Vol</span>
									<span class="stat-value">{payload.volume_m3} m³</span>
								</div>
							<div class="stat">
								<span class="stat-label">Deploy</span>
								<span class="stat-value">{deployMethodLabels[payload.deployMethod]}</span>
							</div>
								{#each payload.destinations as dest}
									<span class="dest-tag">{dest}</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.inventory-tab {
		display: flex;
		flex-direction: column;
	}

	.summary-badges {
		display: flex;
		gap: 0.4rem;
	}

	.badge {
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		background: var(--color-border);
		color: var(--color-text-dim);
	}

	.badge.value {
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
		border: 1px solid rgba(59, 130, 246, 0.25);
	}

	.badge.reserved {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.25);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 3rem;
		border: 1px dashed var(--color-border);
		border-radius: 0.5rem;
	}

	.category-section { margin-bottom: 1rem; }

	.category-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.5rem;
	}

	.category-count {
		margin-left: auto;
		font-size: 0.65rem;
		background: var(--color-border);
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		font-weight: 500;
	}

	.inv-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.5rem;
	}

	.inv-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.65rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
		transition: border-color 0.15s;
	}
	.inv-card:hover { border-color: var(--color-text-dim); }

	.inv-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.inv-icon { font-size: 1.4rem; flex-shrink: 0; }

	.inv-info { flex: 1; min-width: 0; }
	.inv-name { display: block; font-weight: 600; font-size: 0.8rem; }
	.inv-cat { display: block; font-size: 0.6rem; color: var(--color-text-dim); }

	.inv-qty {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 1rem;
		font-weight: 700;
		color: #60a5fa;
		flex-shrink: 0;
	}

	.inv-qty-col {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.1rem;
		flex-shrink: 0;
	}

	.inv-alloc-row {
		display: flex;
		gap: 0.3rem;
	}

	.inv-avail {
		font-size: 0.5rem;
		font-weight: 600;
		color: #4ade80;
	}

	.inv-reserved {
		font-size: 0.5rem;
		font-weight: 600;
		color: #f59e0b;
	}

	.inv-card.has-reserved {
		border-color: rgba(245, 158, 11, 0.25);
	}

	.inv-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.3rem;
	}

	.stat {
		text-align: center;
		padding: 0.25rem;
		background: var(--color-bg);
		border-radius: 0.25rem;
	}
	.stat-label {
		display: block;
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
	}
	.stat-value {
		display: block;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.stat-value.comm { font-size: 0.55rem; }

	.inv-destinations {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.dest-tag {
		font-size: 0.55rem;
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		background: rgba(139, 92, 246, 0.15);
		color: #a78bfa;
		border: 1px solid rgba(139, 92, 246, 0.25);
	}
</style>
