<script lang="ts">
	import { gameScreen } from '$lib/stores/gameStore';
</script>

<div>
	<h3 class="text-lg font-semibold mb-6">Settings</h3>

	<div class="space-y-6 max-w-lg">
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
