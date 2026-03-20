<script lang="ts">
	import EarthMap from './EarthMap.svelte';
	import MoonMap from './MoonMap.svelte';

	let { bodyId }: { bodyId: string } = $props();

	const mapConfig: Record<string, { bg: string; label: string; desc: string }> = {
		earth: { bg: 'from-blue-900/40 to-green-900/40', label: 'Earth Surface Map', desc: 'Launch sites and ground infrastructure' },
		moon: { bg: 'from-gray-800/40 to-gray-600/40', label: 'Lunar Surface Map', desc: 'Mass driver sites, regolith mining zones, construction platforms' },
		venus: { bg: 'from-amber-900/40 to-orange-900/40', label: 'Venus Atmospheric Map', desc: 'Floating platform positions, wind patterns, density gradients' },
		mars: { bg: 'from-red-900/40 to-red-800/40', label: 'Mars Surface Map', desc: 'Impact zones, atmospheric thickening patterns, ice cap coverage' },
		asteroids: { bg: 'from-purple-900/40 to-indigo-900/40', label: 'Belt Object Map', desc: 'Target asteroids, orbit tracks, mining operations' }
	};

	let cfg = $derived(mapConfig[bodyId] ?? mapConfig.earth);
</script>

{#if bodyId === 'earth'}
	<EarthMap />
{:else if bodyId === 'moon'}
	<MoonMap />
{:else}
<div>
	<h3 class="text-lg font-semibold mb-4">{cfg.label}</h3>

	<!-- Placeholder map area -->
	<div class="aspect-[2/1] bg-gradient-to-br {cfg.bg} rounded-lg border border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
		<!-- Grid overlay -->
		<div class="absolute inset-0 opacity-10" style="
			background-image:
				linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
				linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
			background-size: 40px 40px;
		"></div>

		<!-- Equator line -->
		<div class="absolute left-0 right-0 top-1/2 border-t border-dashed border-white/20"></div>

		<!-- Prime meridian -->
		<div class="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-white/20"></div>

		<div class="text-center z-10">
			<p class="text-[var(--color-text-dim)] text-lg mb-2">[ Map Placeholder ]</p>
			<p class="text-xs text-[var(--color-text-dim)]/60">{cfg.desc}</p>
			{#if bodyId === 'venus'}
				<p class="text-xs text-[var(--color-accent-venus)] mt-2">Altitude-based atmospheric layer view</p>
			{/if}
		</div>
	</div>

	<!-- Map legend placeholder -->
	<div class="flex gap-4 mt-4 text-xs text-[var(--color-text-dim)]">
		{#if bodyId === 'moon'}
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-cyan-500/50"></span> Mass Driver Sites</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-500/50"></span> Mining Zones</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500/50"></span> Construction</span>
		{:else if bodyId === 'venus'}
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-500/50"></span> Floating Platforms</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500/50"></span> Mass Drivers</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-500/50"></span> Solar Collectors</span>
		{:else if bodyId === 'mars'}
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500/50"></span> Impact Zones</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500/50"></span> Ice Caps</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500/50"></span> Habitable Zones</span>
		{:else if bodyId === 'earth'}
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500/50"></span> Launch Sites</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500/50"></span> Mission Control</span>
		{:else}
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-purple-500/50"></span> Target Objects</span>
			<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-cyan-500/50"></span> Active Mining</span>
		{/if}
	</div>
</div>
{/if}

<style>
	.earth-map-tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		padding: 0.2rem;
		background: var(--color-bg-panel, #111827);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		width: fit-content;
	}
	.map-tab-btn {
		padding: 0.35rem 0.85rem;
		font-size: 0.72rem;
		font-weight: 600;
		border-radius: 0.375rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-dim);
		cursor: pointer;
		transition: all 0.15s;
	}
	.map-tab-btn:hover { color: var(--color-text); background: rgba(255,255,255,0.04); }
	.map-tab-btn.active {
		background: rgba(99, 102, 241, 0.12);
		border-color: rgba(99, 102, 241, 0.3);
		color: var(--color-text);
	}
</style>
