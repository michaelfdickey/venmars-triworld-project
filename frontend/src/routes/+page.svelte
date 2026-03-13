<script lang="ts">
	import TitleScreen from '$lib/components/TitleScreen.svelte';
	import GameView from '$lib/components/GameView.svelte';
	import { gameScreen } from '$lib/stores/gameStore';
</script>

{#if $gameScreen === 'title'}
	<TitleScreen />
{:else}
	<GameView />
{/if}
