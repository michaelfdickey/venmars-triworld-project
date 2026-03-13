<script lang="ts">
	import { gameState, type BodyState, type AtmosphereLayer } from '$lib/stores/gameStore';

	let { bodyId, altitude = 0 }: { bodyId: string; altitude?: number } = $props();

	let body = $derived<BodyState | undefined>(() => {
		const s = $gameState;
		if (!s) return undefined;
		const map: Record<string, BodyState> = {
			earth: s.earth, moon: s.moon, venus: s.venus, mars: s.mars, asteroids: s.asteroids
		};
		return map[bodyId];
	});

	// Default atmospheric data for display when no game state
	const defaultAtmo: Record<string, { pressure: string; temp: string; gases: { name: string; pct: string; color: string }[] }> = {
		earth: {
			pressure: '1.000 atm', temp: '15°C',
			gases: [
				{ name: 'N₂', pct: '78.08%', color: '#3b82f6' },
				{ name: 'O₂', pct: '20.95%', color: '#10b981' },
				{ name: 'Ar', pct: '0.93%', color: '#8b5cf6' },
				{ name: 'CO₂', pct: '0.04%', color: '#ef4444' },
				{ name: 'H₂O', pct: '~1%', color: '#06b6d4' }
			]
		},
		moon: {
			pressure: '~0 atm', temp: '−20°C (avg)',
			gases: [{ name: 'Negligible', pct: '—', color: '#6b7280' }]
		},
		venus: {
			pressure: '92.0 atm', temp: '464°C',
			gases: [
				{ name: 'CO₂', pct: '96.5%', color: '#ef4444' },
				{ name: 'N₂', pct: '3.5%', color: '#3b82f6' },
				{ name: 'SO₂', pct: '0.015%', color: '#f59e0b' },
				{ name: 'H₂O', pct: 'trace', color: '#06b6d4' }
			]
		},
		mars: {
			pressure: '0.006 atm', temp: '−63°C',
			gases: [
				{ name: 'CO₂', pct: '95.3%', color: '#ef4444' },
				{ name: 'N₂', pct: '2.7%', color: '#3b82f6' },
				{ name: 'Ar', pct: '1.6%', color: '#8b5cf6' },
				{ name: 'O₂', pct: '0.13%', color: '#10b981' }
			]
		},
		asteroids: {
			pressure: 'N/A', temp: 'Varies',
			gases: [{ name: 'No atmosphere', pct: '—', color: '#6b7280' }]
		}
	};

	let atmo = $derived(defaultAtmo[bodyId] ?? defaultAtmo.asteroids);
</script>

<div>
	<h3 class="text-lg font-semibold mb-4">Atmospheric Composition</h3>

	{#if bodyId === 'venus' && altitude > 0}
		<p class="text-xs text-[var(--color-text-dim)] mb-3">Viewing at altitude: {altitude} km</p>
	{/if}

	<div class="grid grid-cols-2 gap-4 mb-6">
		<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
			<p class="text-xs text-[var(--color-text-dim)] mb-1">Surface Pressure</p>
			<p class="text-2xl font-mono font-bold">{atmo.pressure}</p>
		</div>
		<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
			<p class="text-xs text-[var(--color-text-dim)] mb-1">Surface Temperature</p>
			<p class="text-2xl font-mono font-bold">{atmo.temp}</p>
		</div>
	</div>

	<!-- Gas composition bars -->
	<h4 class="text-sm font-medium mb-3 text-[var(--color-text-dim)]">Composition</h4>
	<div class="space-y-3">
		{#each atmo.gases as gas}
			<div class="flex items-center gap-3">
				<span class="w-12 text-right text-sm font-mono">{gas.name}</span>
				<div class="flex-1 bg-[var(--color-bg)] rounded-full h-5 overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
						style="width: {parseFloat(gas.pct) > 0 ? Math.max(parseFloat(gas.pct), 2) : 2}%; background-color: {gas.color};"
					>
						<span class="text-[10px] font-mono text-white/80">{gas.pct}</span>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Habitability target indicator -->
	{#if bodyId === 'venus' || bodyId === 'mars'}
		<div class="mt-6 p-3 border border-dashed border-[var(--color-accent-green)]/30 rounded-lg bg-[var(--color-accent-green)]/5">
			<p class="text-xs text-[var(--color-accent-green)]">
				🎯 Target: 0.8–1.2 atm, 0–25°C
			</p>
		</div>
	{/if}
</div>
