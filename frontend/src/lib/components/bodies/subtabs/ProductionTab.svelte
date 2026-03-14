<script lang="ts">
	import AllocationTab from './production/AllocationTab.svelte';
	import PipelinesTab from './production/PipelinesTab.svelte';
	import GlobalOutputTab from './production/GlobalOutputTab.svelte';
	import InventoryTab from './production/InventoryTab.svelte';

	let { bodyId }: { bodyId: string } = $props();

	let activeProductionTab = $state('allocation');

	const prodSubTabs = [
		{ id: 'allocation', label: 'Allocation' },
		{ id: 'pipelines', label: 'Pipelines' },
		{ id: 'global-output', label: 'Global Output' },
		{ id: 'inventory', label: 'Inventory' },
	];
</script>

<div class="production-tab">
	<h3 class="text-lg font-semibold mb-1">Production</h3>

	<!-- Production sub-tabs -->
	<div class="prod-tabs">
		{#each prodSubTabs as tab}
			<button
				onclick={() => activeProductionTab = tab.id}
				class="prod-tab-btn"
				class:active={activeProductionTab === tab.id}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Production sub-tab content -->
	<div class="prod-content">
		{#if activeProductionTab === 'allocation'}
			<AllocationTab {bodyId} />
		{:else if activeProductionTab === 'pipelines'}
			<PipelinesTab {bodyId} />
		{:else if activeProductionTab === 'global-output'}
			<GlobalOutputTab {bodyId} />
		{:else if activeProductionTab === 'inventory'}
			<InventoryTab {bodyId} />
		{/if}
	</div>
</div>

<style>
	.production-tab {
		display: flex;
		flex-direction: column;
	}

	.prod-tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0;
	}

	.prod-tab-btn {
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

	.prod-tab-btn:hover {
		color: var(--color-text);
	}

	.prod-tab-btn.active {
		background: var(--color-bg-panel);
		color: var(--color-text);
		border-color: var(--color-border);
		border-bottom-color: var(--color-bg-panel);
	}

	.prod-content {
		flex: 1;
	}
</style>
