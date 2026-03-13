<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>VenMars: Tri-World Project</title>
</svelte:head>

<div class="min-h-screen bg-[var(--color-bg)]">
	{@render children()}
</div>
