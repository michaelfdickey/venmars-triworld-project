<script lang="ts">
	import { onMount } from 'svelte';
	import { activeTab, gameState, gameTime, simSpeed, materialAllocations, tickMaterials } from '$lib/stores/gameStore';
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

	// Simulation loop
	let rafId: number;
	let lastTime = 0;
	let currentSpeed = 0;
	let currentAllocations: number[] = [];

	const unsub = simSpeed.subscribe(v => { currentSpeed = v; });
	const unsubAlloc = materialAllocations.subscribe(v => { currentAllocations = v; });

	onMount(() => {
		lastTime = performance.now();

		function loop(now: number) {
			const dtMs = now - lastTime;
			lastTime = now;

			if (currentSpeed > 0) {
				const dtSeconds = dtMs / 1000;
				const deltaHours = currentSpeed * dtSeconds;
				gameTime.update(t => t + deltaHours);
				tickMaterials(deltaHours, currentAllocations);
			}

			rafId = requestAnimationFrame(loop);
		}

		rafId = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(rafId);
			unsub();
			unsubAlloc();
		};
	});
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
