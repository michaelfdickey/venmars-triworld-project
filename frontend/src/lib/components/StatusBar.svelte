<script lang="ts">
	import { gameState, gameTime, simSpeedIndex, speedPresets, formatGameTimestamp } from '$lib/stores/gameStore';

	let state = $derived($gameState);
	let timestamp = $derived(formatGameTimestamp($gameTime));
	let currentPreset = $derived(speedPresets[$simSpeedIndex]);
	let isPaused = $derived($simSpeedIndex === 0);

	function setSpeed(index: number) {
		$simSpeedIndex = index;
	}
</script>

<div class="status-bar">
	<div class="status-left">
		<span class="status-brand">VenMars</span>
		<span class="status-clock">{timestamp}</span>
	</div>

	<div class="status-right">
		<!-- Milestone indicators -->
		<div class="flex items-center gap-3 text-xs">
			<span class="flex items-center gap-1" title="Lunar Mass Driver">
				<span class="w-2 h-2 rounded-full {state?.milestones.lunar_mass_driver ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				LMD
			</span>
			<span class="flex items-center gap-1" title="Venus Mass Driver">
				<span class="w-2 h-2 rounded-full {state?.milestones.venus_mass_driver ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				VMD
			</span>
			<span class="flex items-center gap-1" title="Asteroid Harvesting">
				<span class="w-2 h-2 rounded-full {state?.milestones.asteroid_harvesting ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				AST
			</span>
		</div>

		<!-- Speed controls -->
		<div class="speed-controls">
			{#each speedPresets as preset, i}
				<button
					class="speed-btn"
					class:active={$simSpeedIndex === i}
					onclick={() => setSpeed(i)}
				>
					{preset.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.35rem 1rem;
		background: var(--color-bg-panel);
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
	}

	.status-left {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.status-brand {
		font-weight: 700;
		color: var(--color-accent-earth);
		font-size: 0.9rem;
	}

	.status-clock {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: 0.04em;
	}

	.status-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.speed-controls {
		display: flex;
		gap: 0.25rem;
	}

	.speed-btn {
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-card);
		color: var(--color-text-dim);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.1s;
		white-space: nowrap;
	}

	.speed-btn:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.speed-btn.active {
		background: var(--color-accent-earth);
		color: #fff;
		border-color: var(--color-accent-earth);
	}
</style>
