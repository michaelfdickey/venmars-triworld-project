<script lang="ts">
	import { activeTab, gameState } from '$lib/stores/gameStore';
	import TabBar from './TabBar.svelte';
	import BodyPanel from './bodies/BodyPanel.svelte';
	import SettingsPanel from './SettingsPanel.svelte';
	import StatusBar from './StatusBar.svelte';

	const bodyKey: Record<string, string> = {
		earth: 'earth',
		moon: 'moon',
		venus: 'venus',
		mars: 'mars',
		asteroids: 'asteroids'
	};
</script>

<div class="flex flex-col h-screen">
	<!-- Top status bar -->
	<StatusBar />

	<!-- Tab bar -->
	<TabBar />

	<!-- Content area -->
	<div class="flex-1 overflow-auto p-4">
		{#if $activeTab === 'settings'}
			<SettingsPanel />
		{:else if bodyKey[$activeTab]}
			<BodyPanel bodyId={bodyKey[$activeTab]} />
		{/if}
	</div>
</div>
