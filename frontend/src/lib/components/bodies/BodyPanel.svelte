<script lang="ts">
	import { gameState, type BodyState } from '$lib/stores/gameStore';
	import AtmosphereTab from './subtabs/AtmosphereTab.svelte';
	import MapTab from './subtabs/MapTab.svelte';
	import ProductionTab from './subtabs/ProductionTab.svelte';
	import RocketsTab from './subtabs/RocketsTab.svelte';
	import PayloadsTab from './subtabs/PayloadsTab.svelte';
	import MissionsTab from './subtabs/MissionsTab.svelte';
	import LaunchTab from './subtabs/LaunchTab.svelte';
	import PopulationTab from './subtabs/PopulationTab.svelte';
	import VenusAltitudeSelector from './VenusAltitudeSelector.svelte';

	let { bodyId }: { bodyId: string } = $props();

	let activeSubTab = $state('atmosphere');

	const subTabs = [
		{ id: 'atmosphere', label: 'Atmosphere' },
		{ id: 'map', label: 'Planetary Map' },
		{ id: 'production', label: 'Production' },
		{ id: 'rockets', label: 'Rockets' },
		{ id: 'payloads', label: 'Payloads' },
		{ id: 'missions', label: 'Missions' },
		{ id: 'launch', label: 'Payload to Orbit' },
		{ id: 'population', label: 'Population' }
	];

	let body = $derived<BodyState | null>(() => {
		const s = $gameState;
		if (!s) return null;
		const map: Record<string, BodyState> = {
			earth: s.earth,
			moon: s.moon,
			venus: s.venus,
			mars: s.mars,
			asteroids: s.asteroids
		};
		return map[bodyId] ?? null;
	});

	const bodyColors: Record<string, string> = {
		earth: 'var(--color-accent-earth)',
		moon: 'var(--color-accent-moon)',
		venus: 'var(--color-accent-venus)',
		mars: 'var(--color-accent-mars)',
		asteroids: 'var(--color-accent-asteroid)'
	};

	let selectedAltitude = $state(0);
</script>

<div class="flex flex-col h-full">
	<!-- Body header -->
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-2xl font-bold" style="color: {bodyColors[bodyId]}">
			{bodyId === 'asteroids' ? 'Asteroid Belt' : bodyId.charAt(0).toUpperCase() + bodyId.slice(1)}
		</h2>
		{#if bodyId === 'venus'}
			<VenusAltitudeSelector bind:selectedAltitude />
		{/if}
	</div>

	<!-- Sub-tabs -->
	<div class="flex gap-1 mb-4 border-b border-[var(--color-border)]">
		{#each subTabs as tab}
			<button
				onclick={() => activeSubTab = tab.id}
				class="px-4 py-2 text-xs font-medium rounded-t transition-all cursor-pointer
					{activeSubTab === tab.id
						? 'bg-[var(--color-bg-card)] text-[var(--color-text)] border border-[var(--color-border)] border-b-transparent -mb-px'
						: 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Sub-tab content -->
	<div class="flex-1 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)] p-4 overflow-auto">
		{#if activeSubTab === 'atmosphere'}
			<AtmosphereTab {bodyId} altitude={bodyId === 'venus' ? selectedAltitude : 0} />
		{:else if activeSubTab === 'map'}
			<MapTab {bodyId} />
		{:else if activeSubTab === 'production'}
			<ProductionTab {bodyId} />
		{:else if activeSubTab === 'rockets'}
			<RocketsTab {bodyId} />
		{:else if activeSubTab === 'payloads'}
			<PayloadsTab {bodyId} />
		{:else if activeSubTab === 'missions'}
			<MissionsTab {bodyId} />
		{:else if activeSubTab === 'launch'}
			<LaunchTab {bodyId} />
		{:else if activeSubTab === 'population'}
			<PopulationTab {bodyId} />
		{/if}
	</div>
</div>
