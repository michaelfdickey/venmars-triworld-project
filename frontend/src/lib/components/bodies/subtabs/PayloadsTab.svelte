<script lang="ts">
	import MarketSatellitesTab from './payloads/MarketSatellitesTab.svelte';
	import VenMarsPayloadsTab from './payloads/VenMarsPayloadsTab.svelte';
	import PayloadInventoryTab from './payloads/PayloadInventoryTab.svelte';
	import DesignTab from './payloads/DesignTab.svelte';

	let { bodyId }: { bodyId: string } = $props();

	let activePayloadTab = $state('market');

	const payloadSubTabs = [
		{ id: 'market', label: 'Market Satellites' },
		{ id: 'venmars', label: 'VenMars Payloads' },
		{ id: 'inventory', label: 'Inventory' },
		{ id: 'design', label: 'Design' },
	];
</script>

<div class="payloads-tab">
	<h3 class="text-lg font-semibold mb-1">Payloads</h3>

	<!-- Payload sub-tabs -->
	<div class="payload-tabs">
		{#each payloadSubTabs as tab}
			<button
				onclick={() => activePayloadTab = tab.id}
				class="payload-tab-btn"
				class:active={activePayloadTab === tab.id}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Payload sub-tab content -->
	<div class="payload-content">
		{#if activePayloadTab === 'market'}
			<MarketSatellitesTab {bodyId} />
		{:else if activePayloadTab === 'venmars'}
			<VenMarsPayloadsTab {bodyId} />
		{:else if activePayloadTab === 'inventory'}
			<PayloadInventoryTab {bodyId} />
		{:else if activePayloadTab === 'design'}
			<DesignTab {bodyId} />
		{/if}
	</div>
</div>

<style>
	.payloads-tab {
		display: flex;
		flex-direction: column;
	}

	.payload-tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0;
	}

	.payload-tab-btn {
		padding: 0.4rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 0.3rem 0.3rem 0 0;
		border: 1px solid transparent;
		border-bottom: none;
		background: transparent;
		color: var(--color-text-dim);
		cursor: pointer;
		transition: all 0.15s;
		margin-bottom: -1px;
	}

	.payload-tab-btn:hover {
		color: var(--color-text);
	}

	.payload-tab-btn.active {
		background: var(--color-bg-panel);
		color: var(--color-text);
		border-color: var(--color-border);
		border-bottom-color: var(--color-bg-panel);
	}

	.payload-content {
		flex: 1;
	}
</style>
