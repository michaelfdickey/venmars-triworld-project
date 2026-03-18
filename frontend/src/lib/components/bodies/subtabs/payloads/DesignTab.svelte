<script lang="ts">
	import { customPayloads, payloadCategoryLabels, payloadCategoryIcons, type PayloadCategory, type PayloadDef } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	// Design categories
	const designCategories: { cat: PayloadCategory; label: string; icon: string }[] = [
		{ cat: 'comms',          label: 'Communications Satellite', icon: '📡' },
		{ cat: 'weather',        label: 'Weather & Climate Monitor', icon: '🌤️' },
		{ cat: 'nav',            label: 'Navigation Satellite', icon: '🛰️' },
		{ cat: 'science',        label: 'Science & Survey Platform', icon: '🔭' },
		{ cat: 'imaging',        label: 'Imaging & Reconnaissance', icon: '📸' },
		{ cat: 'relay',          label: 'Deep-Space Relay', icon: '📡' },
		{ cat: 'probe',          label: 'Probe / Drone', icon: '🎈' },
		{ cat: 'terraforming',   label: 'Terraforming System', icon: '🌍' },
		{ cat: 'infrastructure', label: 'Orbital Infrastructure', icon: '🏗️' },
		{ cat: 'habitat',        label: 'Habitat Module', icon: '🏠' },
		{ cat: 'vehicle',        label: 'Vehicle / Lander', icon: '🚀' },
		{ cat: 'mining',         label: 'Mining & ISRU Unit', icon: '⛏️' },
		{ cat: 'factory',        label: 'Orbital Factory', icon: '🏭' },
		{ cat: 'transport',      label: 'Cargo Transfer Vehicle', icon: '🚛' },
		{ cat: 'supply',         label: 'Supply Pod', icon: '📦' },
	];

	// Form state
	let formCategory = $state<PayloadCategory>('comms');
	let formName = $state('');
	let formMass = $state(1000);
	let formVolumeDims = $state('2m × 1m × 1m');
	let formVolumeM3 = $state(2);
	let formCost = $state(50);
	let formDeltaV = $state(0);
	let formCommRange = $state('600 km (LEO)');
	let formLifespan = $state(10);
	let formDescription = $state('');
	let formDestinations = $state('LEO');

	let showForm = $state(false);

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}

	function resetForm() {
		formName = '';
		formMass = 1000;
		formVolumeDims = '2m × 1m × 1m';
		formVolumeM3 = 2;
		formCost = 50;
		formDeltaV = 0;
		formCommRange = '600 km (LEO)';
		formLifespan = 10;
		formDescription = '';
		formDestinations = 'LEO';
	}

	function submitDesign() {
		if (!formName.trim()) return;
		const catDef = designCategories.find(c => c.cat === formCategory);
		const newPayload: PayloadDef = {
			id: 'custom-' + Date.now(),
			name: formName.trim(),
			icon: catDef?.icon ?? '📦',
			category: formCategory,
			mass: formMass,
			volume: formVolumeDims,
			volume_m3: formVolumeM3,
			cost: formCost,
			deltaV: formDeltaV,
			commRange: formCommRange,
			lifespan: formLifespan,
			description: formDescription.trim(),
			destinations: formDestinations.split(',').map(d => d.trim()).filter(Boolean),
		};
		customPayloads.update(list => [...list, newPayload]);
		resetForm();
		showForm = false;
	}

	function deleteDesign(id: string) {
		customPayloads.update(list => list.filter(p => p.id !== id));
	}

	// Grouped custom payloads
	const categoryOrder: PayloadCategory[] = [
		'comms', 'weather', 'nav', 'science', 'imaging', 'relay', 'probe',
		'terraforming', 'infrastructure', 'habitat', 'vehicle', 'mining', 'factory', 'transport', 'supply',
	];

	let grouped = $derived(
		categoryOrder
			.map(cat => ({
				cat,
				label: payloadCategoryLabels[cat],
				icon: payloadCategoryIcons[cat],
				items: $customPayloads.filter(p => p.category === cat),
			}))
			.filter(g => g.items.length > 0)
	);
</script>

<div class="design-tab">
	<div class="flex items-center justify-between mb-3">
		<div>
			<h3 class="text-base font-semibold">Payload Design Lab</h3>
			<p class="text-xs text-[var(--color-text-dim)]">Design custom satellites and payloads for the VenMars program</p>
		</div>
		<button class="new-design-btn" onclick={() => { showForm = !showForm; if (showForm) resetForm(); }}>
			{showForm ? '✕ Cancel' : '+ New Design'}
		</button>
	</div>

	<!-- Design form -->
	{#if showForm}
		<div class="design-form">
			<div class="form-header">
				<span class="text-sm font-semibold">New Payload Design</span>
			</div>

			<div class="form-grid">
				<div class="form-field span-2">
					<label for="cat">Category</label>
					<select id="cat" bind:value={formCategory}>
						{#each designCategories as dc}
							<option value={dc.cat}>{dc.icon} {dc.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-field span-2">
					<label for="name">Designation</label>
					<input id="name" type="text" bind:value={formName} placeholder="e.g. Mars Surveyor Mk.II" />
				</div>

				<div class="form-field">
					<label for="mass">Mass (kg)</label>
					<input id="mass" type="number" bind:value={formMass} min="1" />
				</div>

				<div class="form-field">
					<label for="cost">Cost ($M)</label>
					<input id="cost" type="number" bind:value={formCost} min="0" step="0.1" />
				</div>

				<div class="form-field">
					<label for="vol-dims">Dimensions</label>
					<input id="vol-dims" type="text" bind:value={formVolumeDims} placeholder="3m × 2m × 2m" />
				</div>

				<div class="form-field">
					<label for="vol-m3">Volume (m³)</label>
					<input id="vol-m3" type="number" bind:value={formVolumeM3} min="0" step="0.1" />
				</div>

				<div class="form-field">
					<label for="dv">ΔV (m/s)</label>
					<input id="dv" type="number" bind:value={formDeltaV} min="0" />
				</div>

				<div class="form-field">
					<label for="comm">Comm Range</label>
					<input id="comm" type="text" bind:value={formCommRange} placeholder="400M km (Mars–Earth)" />
				</div>

				<div class="form-field">
					<label for="life">Lifespan (years)</label>
					<input id="life" type="number" bind:value={formLifespan} min="0" />
				</div>

				<div class="form-field">
					<label for="dest">Destinations (comma-sep)</label>
					<input id="dest" type="text" bind:value={formDestinations} placeholder="LEO, Mars Orbit" />
				</div>

				<div class="form-field span-2">
					<label for="desc">Description</label>
					<textarea id="desc" bind:value={formDescription} rows="2" placeholder="Mission profile and capabilities..."></textarea>
				</div>
			</div>

			<div class="form-actions">
				<button class="submit-btn" onclick={submitDesign} disabled={!formName.trim()}>
					Finalize Design
				</button>
			</div>
		</div>
	{/if}

	<!-- Custom designs list -->
	{#if $customPayloads.length === 0 && !showForm}
		<div class="empty-state">
			<span class="text-3xl">🔧</span>
			<p class="text-sm text-[var(--color-text-dim)]">No custom designs yet</p>
			<p class="text-xs text-[var(--color-text-dim)]">Click "New Design" to create your first custom payload</p>
		</div>
	{:else}
		{#each grouped as group}
			<div class="category-section">
				<div class="category-header">
					<span>{group.icon}</span>
					<span>{group.label}</span>
					<span class="category-count">{group.items.length}</span>
				</div>

				<div class="payload-grid">
					{#each group.items as payload}
						<div class="payload-card">
							<div class="payload-header">
								<span class="payload-icon">{payload.icon}</span>
								<div>
									<span class="payload-name">{payload.name}</span>
									<span class="payload-cat">{payloadCategoryLabels[payload.category]}</span>
								</div>
								<button class="delete-btn" onclick={() => deleteDesign(payload.id)} title="Delete design">🗑️</button>
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
									<span class="stat-label">Comm</span>
									<span class="stat-value comm">{payload.commRange}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Lifespan</span>
									<span class="stat-value">{payload.lifespan > 0 ? payload.lifespan + ' yr' : '1-use'}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Volume</span>
									<span class="stat-value">{payload.volume_m3} m³</span>
								</div>
							</div>

							<div class="payload-destinations">
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
	.design-tab {
		display: flex;
		flex-direction: column;
	}

	.new-design-btn {
		padding: 0.4rem 0.8rem;
		border-radius: 0.4rem;
		border: 1px solid #3b82f6;
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.new-design-btn:hover { background: rgba(59, 130, 246, 0.3); }

	.design-form {
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg-panel);
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.form-header {
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.form-field.span-2 {
		grid-column: span 2;
	}

	.form-field label {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		font-weight: 500;
	}

	.form-field input,
	.form-field select,
	.form-field textarea {
		padding: 0.4rem 0.5rem;
		border-radius: 0.3rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.75rem;
		font-family: inherit;
	}

	.form-field input:focus,
	.form-field select:focus,
	.form-field textarea:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.form-field textarea {
		resize: vertical;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.submit-btn {
		padding: 0.5rem 1.25rem;
		border-radius: 0.4rem;
		border: 1px solid #22c55e;
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.submit-btn:hover:not(:disabled) { background: rgba(34, 197, 94, 0.3); }
	.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

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
	}
	.payload-card:hover { border-color: var(--color-text-dim); }

	.payload-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.payload-icon { font-size: 1.4rem; flex-shrink: 0; }
	.payload-name { display: block; font-weight: 600; font-size: 0.8rem; }
	.payload-cat { display: block; font-size: 0.6rem; color: var(--color-text-dim); }

	.delete-btn {
		margin-left: auto;
		background: none;
		border: none;
		font-size: 0.8rem;
		cursor: pointer;
		opacity: 0.4;
		transition: opacity 0.15s;
		padding: 0.2rem;
	}
	.delete-btn:hover { opacity: 1; }

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
	.stat-value.comm { font-size: 0.55rem; }

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
</style>
