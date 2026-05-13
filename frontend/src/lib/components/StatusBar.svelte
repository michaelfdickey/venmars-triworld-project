<script lang="ts">
	import { gameState, gameTime, simSpeedIndex, paused, speedPresets, formatGameTimestamp, cashBalanceM } from '$lib/stores/gameStore';

	let gameStateVal = $derived($gameState);
	let timestamp = $derived(formatGameTimestamp($gameTime));
	let currentPreset = $derived(speedPresets[$simSpeedIndex]);
	let isPaused = $derived($paused);
	let dropdownOpen = $state(false);

	// Format cash balance for display
	let cashDisplay = $derived.by(() => {
		const m = $cashBalanceM;
		if (Math.abs(m) >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`;
		if (Math.abs(m) >= 1_000) return `$${(m / 1_000).toFixed(1)}B`;
		return `$${m.toFixed(0)}M`;
	});
	let cashNegative = $derived($cashBalanceM < 0);

	function togglePause() {
		$paused = !$paused;
	}

	function setSpeed(index: number) {
		$simSpeedIndex = index;
		$paused = false;
		dropdownOpen = false;
	}

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.speed-controls')) {
			dropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="status-bar">
	<div class="status-left">
		<span class="status-brand">VenMars</span>
		<span class="status-clock">{timestamp}</span>
		<span class="status-cash" class:negative={cashNegative} title="Program cash balance">
			💰 {cashDisplay}
		</span>
	</div>

	<div class="status-right">
		<!-- Milestone indicators -->
		<div class="flex items-center gap-3 text-xs">
			<span class="flex items-center gap-1" title="Lunar Mass Driver">
				<span class="w-2 h-2 rounded-full {gameStateVal?.milestones.lunar_mass_driver ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				LMD
			</span>
			<span class="flex items-center gap-1" title="Venus Mass Driver">
				<span class="w-2 h-2 rounded-full {gameStateVal?.milestones.venus_mass_driver ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				VMD
			</span>
			<span class="flex items-center gap-1" title="Asteroid Harvesting">
				<span class="w-2 h-2 rounded-full {gameStateVal?.milestones.asteroid_harvesting ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-border)]'}"></span>
				AST
			</span>
		</div>

		<!-- Speed controls -->
		<div class="speed-controls">
			<button
				class="speed-btn"
				class:active={isPaused}
				onclick={togglePause}
				title="Pause"
			>
				⏸
			</button>
			<button
				class="speed-btn"
				class:active={!isPaused}
				onclick={togglePause}
				title="Play"
			>
				▶
			</button>
			<button
				class="speed-btn current-speed"
				onclick={toggleDropdown}
			>
				{currentPreset.label}
				<span class="dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
			</button>
			{#if dropdownOpen}
				<div class="speed-dropdown">
					{#each speedPresets as preset, i}
						<button
							class="speed-dropdown-item"
							class:active={$simSpeedIndex === i}
							onclick={() => setSpeed(i)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			{/if}
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

	.status-cash {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		font-weight: 600;
		color: #4ade80;
		letter-spacing: 0.02em;
	}

	.status-cash.negative {
		color: #f87171;
	}

	.status-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.speed-controls {
		display: flex;
		gap: 0.25rem;
		position: relative;
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

	.current-speed {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		min-width: 3rem;
		justify-content: center;
	}

	.dropdown-arrow {
		font-size: 0.5rem;
		opacity: 0.7;
	}

	.speed-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: var(--color-bg-panel);
		border: 1px solid var(--color-border);
		border-radius: 0.35rem;
		padding: 0.25rem;
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.speed-dropdown-item {
		padding: 0.3rem 0.75rem;
		border: none;
		border-radius: 0.2rem;
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.7rem;
		cursor: pointer;
		white-space: nowrap;
		text-align: center;
		transition: all 0.1s;
	}

	.speed-dropdown-item:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.speed-dropdown-item.active {
		background: var(--color-accent-earth);
		color: #fff;
	}
</style>
