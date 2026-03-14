<script lang="ts">
	let { bodyId }: { bodyId: string } = $props();

	interface GlobalMaterial {
		name: string;
		icon: string;
		annualOutput: number;
		unit: string;
		dailyOutput: number;
		trend: 'up' | 'flat' | 'down';
		topProducers: string;
	}

	// Real-world approximate 2025 global production figures
	const materials: GlobalMaterial[] = [
		{ name: 'Iron Ore', icon: '🪨', annualOutput: 2500, unit: 'Mt', dailyOutput: 6849, trend: 'up', topProducers: 'Australia, Brazil, China' },
		{ name: 'Crude Steel', icon: '🔩', annualOutput: 1950, unit: 'Mt', dailyOutput: 5342, trend: 'flat', topProducers: 'China, India, Japan' },
		{ name: 'Aluminum (Primary)', icon: '🪶', annualOutput: 70, unit: 'Mt', dailyOutput: 192, trend: 'up', topProducers: 'China, India, Russia' },
		{ name: 'Copper (Refined)', icon: '🔶', annualOutput: 25, unit: 'Mt', dailyOutput: 68, trend: 'flat', topProducers: 'Chile, China, Congo' },
		{ name: 'Nickel', icon: '🔧', annualOutput: 3.3, unit: 'Mt', dailyOutput: 9.04, trend: 'up', topProducers: 'Indonesia, Philippines, Russia' },
		{ name: 'Titanium Sponge', icon: '⚙️', annualOutput: 0.24, unit: 'Mt', dailyOutput: 0.66, trend: 'up', topProducers: 'China, Japan, Russia' },
		{ name: 'Silicon (Metallurgical)', icon: '🔲', annualOutput: 8.5, unit: 'Mt', dailyOutput: 23.3, trend: 'flat', topProducers: 'China, Russia, Brazil' },
		{ name: 'Silicon (Electronic)', icon: '💠', annualOutput: 0.6, unit: 'Mt', dailyOutput: 1.64, trend: 'up', topProducers: 'China, Japan, S.Korea' },
		{ name: 'Rare Earth Oxides', icon: '💎', annualOutput: 0.35, unit: 'Mt', dailyOutput: 0.96, trend: 'up', topProducers: 'China, Myanmar, Australia' },
		{ name: 'Carbon Fiber', icon: '🧱', annualOutput: 0.18, unit: 'Mt', dailyOutput: 0.49, trend: 'up', topProducers: 'Japan, USA, China' },
		{ name: 'Inconel / Superalloys', icon: '🔥', annualOutput: 0.08, unit: 'Mt', dailyOutput: 0.22, trend: 'flat', topProducers: 'USA, UK, Germany' },
		{ name: 'Cement / Concrete', icon: '🏗️', annualOutput: 4100, unit: 'Mt', dailyOutput: 11233, trend: 'flat', topProducers: 'China, India, Vietnam' },
		{ name: 'Liquid Oxygen (Industrial)', icon: '🧪', annualOutput: 450, unit: 'Mt', dailyOutput: 1233, trend: 'up', topProducers: 'Global (air separation)' },
		{ name: 'Hydrogen (All Methods)', icon: '🧪', annualOutput: 94, unit: 'Mt', dailyOutput: 257, trend: 'up', topProducers: 'China, USA, EU' },
		{ name: 'Natural Gas / Methane', icon: '🔵', annualOutput: 4000, unit: 'bcm', dailyOutput: 10959, trend: 'flat', topProducers: 'USA, Russia, Iran' },
		{ name: 'RP-1 Grade Kerosene', icon: '🛢️', annualOutput: 0.05, unit: 'Mt', dailyOutput: 0.14, trend: 'flat', topProducers: 'USA, Russia' },
		{ name: 'Hydrazine', icon: '⚠️', annualOutput: 0.03, unit: 'Mt', dailyOutput: 0.08, trend: 'flat', topProducers: 'USA, Japan, France' },
		{ name: 'Xenon', icon: '💨', annualOutput: 40, unit: 't', dailyOutput: 0.11, trend: 'flat', topProducers: 'Global (air separation)' },
	];

	const trendIcon: Record<string, string> = { up: '↑', flat: '→', down: '↓' };
	const trendColor: Record<string, string> = { up: '#4ade80', flat: '#fbbf24', down: '#ef4444' };

	function formatOutput(val: number): string {
		if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
		if (val >= 1) return val.toFixed(1);
		return val.toFixed(2);
	}
</script>

<div class="global-tab">
	<p class="text-xs text-[var(--color-text-dim)] mb-3">
		Current maximum global production capacity for critical materials. These figures represent
		hard limits on how much the Tri-World program can divert.
	</p>

	<div class="global-grid">
		<div class="grid-header">
			<span class="gh-name">Material</span>
			<span class="gh-val">Annual Output</span>
			<span class="gh-val">Daily Output</span>
			<span class="gh-val">Trend</span>
			<span class="gh-prod">Top Producers</span>
		</div>
		{#each materials as mat}
			<div class="grid-row">
				<span class="gr-name">
					<span class="gr-icon">{mat.icon}</span>
					{mat.name}
				</span>
				<span class="gr-val">{mat.annualOutput.toLocaleString()} <span class="gr-unit">{mat.unit}</span></span>
				<span class="gr-val">{formatOutput(mat.dailyOutput)} <span class="gr-unit">{mat.unit === 'bcm' ? 'bcm' : mat.unit}/d</span></span>
				<span class="gr-trend" style="color: {trendColor[mat.trend]}">
					{trendIcon[mat.trend]}
				</span>
				<span class="gr-prod">{mat.topProducers}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.global-tab {
		display: flex;
		flex-direction: column;
	}

	.global-grid {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		overflow: hidden;
	}

	.grid-header {
		display: grid;
		grid-template-columns: 2fr 1.2fr 1.2fr 0.5fr 1.5fr;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem;
		background: var(--color-bg);
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
	}

	.gh-name { text-align: left; }
	.gh-val { text-align: right; }
	.gh-prod { text-align: left; }

	.grid-row {
		display: grid;
		grid-template-columns: 2fr 1.2fr 1.2fr 0.5fr 1.5fr;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-top: 1px solid var(--color-border);
		transition: background 0.1s;
	}

	.grid-row:hover {
		background: var(--color-bg-panel);
	}

	.gr-name {
		font-size: 0.75rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.gr-icon { font-size: 0.8rem; }

	.gr-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-align: right;
	}

	.gr-unit {
		font-size: 0.55rem;
		font-weight: 400;
		color: var(--color-text-dim);
	}

	.gr-trend {
		text-align: center;
		font-weight: 700;
		font-size: 0.85rem;
	}

	.gr-prod {
		font-size: 0.65rem;
		color: var(--color-text-dim);
	}
</style>
