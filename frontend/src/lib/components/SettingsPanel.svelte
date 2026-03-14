<script lang="ts">
	import { gameScreen, difficulty, difficultyConfig } from '$lib/stores/gameStore';
	import type { Difficulty } from '$lib/stores/gameStore';

	const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
	const diffColors: Record<Difficulty, string> = {
		easy: '#4ade80',
		medium: '#fbbf24',
		hard: '#ef4444',
	};
</script>

<div>
	<h3 class="text-lg font-semibold mb-6">Settings</h3>

	<div class="space-y-6 max-w-lg">
		<!-- Difficulty -->
		<div class="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
			<h4 class="text-sm font-medium mb-3">Difficulty</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[var(--color-text-dim)]">Budget Level</span>
					<div class="flex gap-2">
						{#each difficulties as diff}
							<button
								onclick={() => difficulty.set(diff)}
								class="px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer border"
								style="border-color: {diffColors[diff]}; color: {diffColors[diff]}; background: {$difficulty === diff ? diffColors[diff] + '22' : 'transparent'}; opacity: {$difficulty === diff ? 1 : 0.5}"
							>
								{difficultyConfig[diff].label}
							</button>
						{/each}
					</div>
				</div>
				<div class="text-xs text-[var(--color-text-dim)] space-y-1">
					<p>Max {difficultyConfig[$difficulty].gdpPercent}% of global GDP annually ({difficultyConfig[$difficulty].description})</p>
					<p>Max 10% of common materials global production; aerospace-specific materials uncapped</p>
					<p>Constraints: industrial throughput, skilled labor, launch infrastructure, propellant production</p>
				</div>
			</div>
		</div>

		<!-- Simulation settings -->
		<div class="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
			<h4 class="text-sm font-medium mb-3">Simulation</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[var(--color-text-dim)]">Tick Rate</span>
					<select class="bg-[var(--color-bg-panel)] border border-[var(--color-border)] text-sm rounded px-3 py-1 text-[var(--color-text)]">
						<option>1 day / tick</option>
						<option>7 days / tick</option>
						<option>30 days / tick</option>
						<option>365 days / tick</option>
					</select>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-[var(--color-text-dim)]">Auto-pause on Events</span>
					<input type="checkbox" checked class="w-4 h-4" />
				</div>
			</div>
		</div>

		<!-- Display settings -->
		<div class="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
			<h4 class="text-sm font-medium mb-3">Display</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[var(--color-text-dim)]">Units</span>
					<select class="bg-[var(--color-bg-panel)] border border-[var(--color-border)] text-sm rounded px-3 py-1 text-[var(--color-text)]">
						<option>Metric (kg, km)</option>
						<option>Scientific (kg, m)</option>
					</select>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-[var(--color-text-dim)]">Temperature</span>
					<select class="bg-[var(--color-bg-panel)] border border-[var(--color-border)] text-sm rounded px-3 py-1 text-[var(--color-text)]">
						<option>Celsius</option>
						<option>Kelvin</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Game actions -->
		<div class="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]">
			<h4 class="text-sm font-medium mb-3">Game</h4>
			<div class="space-y-2">
				<button class="w-full px-4 py-2 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-border)] transition-colors cursor-pointer text-left">
					💾 Save Game
				</button>
				<button class="w-full px-4 py-2 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-border)] transition-colors cursor-pointer text-left">
					📂 Load Game
				</button>
				<button
					onclick={() => gameScreen.set('title')}
					class="w-full px-4 py-2 bg-[var(--color-bg-panel)] border border-[var(--color-accent-mars)]/30 rounded text-sm hover:bg-[var(--color-accent-mars)]/20 transition-colors cursor-pointer text-left text-[var(--color-accent-mars)]"
				>
					🚪 Return to Title
				</button>
			</div>
		</div>
	</div>
</div>
