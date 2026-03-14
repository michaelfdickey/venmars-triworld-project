<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();
</script>

<div class="consumption-tab">
	<h3 class="text-lg font-semibold mb-2">Consumption</h3>
	<p class="text-xs text-[var(--color-text-dim)]">
		Material consumption tracking for {bodyId === 'asteroids' ? 'Asteroid Belt' : bodyId.charAt(0).toUpperCase() + bodyId.slice(1)}.
	</p>
</div>

<style>
	.consumption-tab {
		display: flex;
		flex-direction: column;
	}
</style>
