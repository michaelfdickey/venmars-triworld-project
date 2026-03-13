<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	const launchData: Record<string, { sites: number; maxPayload: string; rate: string; annual: string; available: boolean; method: string }> = {
		earth: {
			sites: 5, maxPayload: '150,000 kg', rate: '50 launches/yr',
			annual: '5,000,000 kg/yr', available: true, method: 'Chemical rockets (Starship-class)'
		},
		moon: {
			sites: 0, maxPayload: '—', rate: '0 launches/day',
			annual: '0 kg/yr', available: false, method: 'Electromagnetic mass driver'
		},
		venus: {
			sites: 0, maxPayload: '—', rate: '0 launches/day',
			annual: '0 kg/yr', available: false, method: 'Floating electromagnetic mass driver'
		},
		mars: {
			sites: 0, maxPayload: '—', rate: '0',
			annual: '0 kg/yr', available: false, method: 'N/A (receiving only)'
		},
		asteroids: {
			sites: 0, maxPayload: '—', rate: '0',
			annual: '0 kg/yr', available: false, method: 'Low-energy ejection / ion tugs'
		}
	};

	let data = $derived(launchData[bodyId] ?? launchData.earth);
</script>

<div>
	<h3 class="text-lg font-semibold mb-4">Payload to Orbit</h3>

	<div class="grid grid-cols-2 gap-4 mb-6">
		<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
			<p class="text-xs text-[var(--color-text-dim)] mb-1">Launch Sites</p>
			<p class="text-2xl font-mono font-bold">{data.sites}</p>
		</div>
		<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
			<p class="text-xs text-[var(--color-text-dim)] mb-1">Max Payload per Launch</p>
			<p class="text-2xl font-mono font-bold">{data.maxPayload}</p>
		</div>
		<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
			<p class="text-xs text-[var(--color-text-dim)] mb-1">Launch Rate</p>
			<p class="text-2xl font-mono font-bold">{data.rate}</p>
		</div>
		<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
			<p class="text-xs text-[var(--color-text-dim)] mb-1">Annual Mass to Orbit</p>
			<p class="text-2xl font-mono font-bold">{data.annual}</p>
		</div>
	</div>

	<div class="bg-[var(--color-bg-panel)] rounded-lg p-4 border border-[var(--color-border)]">
		<p class="text-xs text-[var(--color-text-dim)] mb-1">Launch Method</p>
		<p class="text-sm font-medium">{data.method}</p>
	</div>

	{#if !data.available && bodyId !== 'mars'}
		<div class="mt-4 p-3 border border-dashed border-[var(--color-border)] rounded-lg text-center">
			<p class="text-xs text-[var(--color-text-dim)]">🔒 Not yet operational</p>
		</div>
	{/if}

	{#if bodyId === 'earth'}
		<div class="mt-4 p-3 bg-[var(--color-accent-earth)]/10 border border-[var(--color-accent-earth)]/30 rounded-lg">
			<p class="text-xs text-[var(--color-accent-earth)]">
				📈 Earth launch capacity grows over time as more pads come online and rocket technology improves.
				Goal: maximize mass delivered to cislunar space for Lunar mass driver construction.
			</p>
		</div>
	{/if}
</div>
