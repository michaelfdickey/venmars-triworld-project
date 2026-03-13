<script lang="ts">
	let { selectedAltitude = $bindable(0) }: { selectedAltitude: number } = $props();

	const altitudeBands = [
		{ km: 0, label: 'Surface (0 km)', desc: '92 atm · 464°C' },
		{ km: 30, label: '30 km', desc: '~12 atm · ~220°C' },
		{ km: 50, label: '50 km', desc: '~1 atm · ~75°C — Habitable zone' },
		{ km: 55, label: '55 km', desc: '~0.5 atm · ~30°C — Mass driver altitude' },
		{ km: 60, label: '60 km', desc: '~0.2 atm · −10°C — Cloud tops' },
		{ km: 70, label: '70 km', desc: '~0.04 atm · −43°C — Upper haze' }
	];
</script>

<div class="flex items-center gap-3">
	<span class="text-xs text-[var(--color-text-dim)]">Altitude:</span>
	<select
		bind:value={selectedAltitude}
		class="bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm rounded px-3 py-1.5 text-[var(--color-text)]"
	>
		{#each altitudeBands as band}
			<option value={band.km}>{band.label} — {band.desc}</option>
		{/each}
	</select>
</div>
