<script lang="ts">
	import { marketSatellites, payloadCategoryLabels, payloadCategoryIcons, payloadInventory, type PayloadCategory, type PayloadDef } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	const allCategories: PayloadCategory[] = ['comms', 'weather', 'nav', 'science', 'imaging', 'relay'];

	let selectedCategory = $state<PayloadCategory | 'all'>('all');
	let filtered = $derived(
		selectedCategory === 'all'
			? marketSatellites
			: marketSatellites.filter(p => p.category === selectedCategory)
	);

	const deployLabels: Record<string, string> = {
		'spin-stabilized': '🔄 Spin',
		'propulsive': '🚀 Propulsive',
		'docking': '🔗 Docking',
		'electromagnetic': '⚡ EM Rail',
		'cold-gas': '💨 Cold-Gas',
		'gravity-release': '⬇️ Gravity',
	};

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}

	// Detail modal
	let detailPayload = $state<PayloadDef | null>(null);
</script>

<div class="market-tab">
	<div class="flex items-center justify-between mb-3">
		<div>
			<h3 class="text-base font-semibold">Market Satellites</h3>
			<p class="text-xs text-[var(--color-text-dim)]">Off-the-shelf commercial satellites available for immediate purchase</p>
		</div>
		<span class="text-xs text-[var(--color-text-dim)]">{marketSatellites.length} models</span>
	</div>

	<!-- Category filter -->
	<div class="filter-bar">
		<button class="filter-btn" class:active={selectedCategory === 'all'} onclick={() => selectedCategory = 'all'}>
			All
		</button>
		{#each allCategories as cat}
			{@const count = marketSatellites.filter(p => p.category === cat).length}
			{#if count > 0}
				<button class="filter-btn" class:active={selectedCategory === cat} onclick={() => selectedCategory = cat}>
					{payloadCategoryIcons[cat]} {payloadCategoryLabels[cat]} ({count})
				</button>
			{/if}
		{/each}
	</div>

	<div class="payload-grid">
		{#each filtered as payload}
			<button class="payload-card" onclick={() => detailPayload = payload}>
				<div class="payload-header">
					<span class="payload-icon">{payload.icon}</span>
					<div>
						<span class="payload-name">{payload.name}</span>
						<span class="payload-cat">{payloadCategoryLabels[payload.category]}</span>
					</div>
				</div>

				<p class="payload-desc">{payload.description}</p>

				<div class="payload-stats">
					<div class="stat">
						<span class="stat-label">Mass</span>
						<span class="stat-value">{formatMass(payload.mass)}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Cost</span>
						<span class="stat-value">${payload.cost}M</span>
					</div>
					<div class="stat">
						<span class="stat-label">ΔV</span>
						<span class="stat-value">{payload.deltaV > 0 ? payload.deltaV.toLocaleString() + ' m/s' : '—'}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Comm Range</span>
						<span class="stat-value comm">{payload.commRange}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Lifespan</span>
						<span class="stat-value">{payload.lifespan > 0 ? payload.lifespan + ' yr' : 'Single-use'}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Volume</span>
						<span class="stat-value">{payload.volume_m3} m³</span>
					</div>
					<div class="stat">
						<span class="stat-label">Max G</span>
						<span class="stat-value">{payload.maxGs > 0 ? payload.maxGs + ' g' : '—'}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Deploy</span>
						<span class="stat-value">{deployLabels[payload.deployMethod] ?? payload.deployMethod}</span>
					</div>
				</div>

				<div class="payload-destinations">
					{#each payload.destinations as dest}
						<span class="dest-tag">{dest}</span>
					{/each}
				</div>
			</button>
		{/each}
	</div>
</div>

<!-- Detail Modal -->
{#if detailPayload}
	<div class="modal-overlay" onclick={() => detailPayload = null} role="dialog" aria-modal="true">
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<span class="text-2xl">{detailPayload.icon}</span>
				<div>
					<h3 class="text-lg font-bold">{detailPayload.name}</h3>
					<span class="text-xs text-[var(--color-text-dim)]">{payloadCategoryLabels[detailPayload.category]}</span>
				</div>
				<button class="modal-close" onclick={() => detailPayload = null}>✕</button>
			</div>

			<p class="text-sm text-[var(--color-text-dim)] mb-4 leading-relaxed">{detailPayload.description}</p>

			<div class="detail-grid">
				<div class="detail-item">
					<span class="detail-label">Mass</span>
					<span class="detail-value">{formatMass(detailPayload.mass)}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Volume</span>
					<span class="detail-value">{detailPayload.volume} ({detailPayload.volume_m3} m³)</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Unit Cost</span>
					<span class="detail-value">${detailPayload.cost}M</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">ΔV (Onboard)</span>
					<span class="detail-value">{detailPayload.deltaV > 0 ? detailPayload.deltaV.toLocaleString() + ' m/s' : 'None'}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Comm Range</span>
					<span class="detail-value">{detailPayload.commRange}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Lifespan</span>
					<span class="detail-value">{detailPayload.lifespan > 0 ? detailPayload.lifespan + ' years' : 'Single-use'}</span>
				</div>
			</div>

			<div class="mt-4">
				<span class="text-xs text-[var(--color-text-dim)] uppercase tracking-wide">Destinations</span>
				<div class="flex flex-wrap gap-1 mt-1">
					{#each detailPayload.destinations as dest}
						<span class="dest-tag">{dest}</span>
					{/each}
				</div>
			</div>

			<div class="modal-actions">
				<span class="text-xs text-[var(--color-text-dim)]">
					Owned: {$payloadInventory[detailPayload.id] ?? 0}
				</span>
				<button class="buy-btn" onclick={() => {
					payloadInventory.update(inv => ({ ...inv, [detailPayload!.id]: (inv[detailPayload!.id] ?? 0) + 1 }));
				}}>
					Purchase (${detailPayload.cost}M)
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.market-tab {
		display: flex;
		flex-direction: column;
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.filter-btn {
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.65rem;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.filter-btn:hover { color: var(--color-text); border-color: var(--color-text-dim); }
	.filter-btn.active {
		background: var(--color-border);
		color: var(--color-text);
	}

	.payload-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.5rem;
	}

	.payload-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.65rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-panel);
		transition: border-color 0.15s;
		text-align: left;
		cursor: pointer;
		width: 100%;
	}
	.payload-card:hover {
		border-color: var(--color-text-dim);
	}

	.payload-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.payload-icon { font-size: 1.4rem; flex-shrink: 0; }
	.payload-name { display: block; font-weight: 600; font-size: 0.8rem; }
	.payload-cat { display: block; font-size: 0.6rem; color: var(--color-text-dim); }

	.payload-desc {
		font-size: 0.68rem;
		color: var(--color-text-dim);
		line-height: 1.4;
	}

	.payload-stats {
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

	.stat-value.comm {
		font-size: 0.55rem;
	}

	.payload-destinations {
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

	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0; left: 0;
		width: 100%; height: 100%;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal-content {
		background: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		max-width: 500px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.modal-close {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--color-text-dim);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.25rem;
	}
	.modal-close:hover { color: var(--color-text); }

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.detail-item {
		padding: 0.5rem;
		background: var(--color-bg);
		border-radius: 0.35rem;
	}

	.detail-label {
		display: block;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.15rem;
	}

	.detail-value {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.buy-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.4rem;
		border: 1px solid #3b82f6;
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.buy-btn:hover {
		background: rgba(59, 130, 246, 0.3);
	}
</style>
