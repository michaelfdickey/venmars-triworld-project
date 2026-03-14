<script lang="ts">
	import { gameScreen, gameState, difficulty, difficultyConfig } from '$lib/stores/gameStore';
	import { apiPost } from '$lib/api/client';
	import type { GameState, Difficulty } from '$lib/stores/gameStore';

	let loading = $state(false);
	let selectedDifficulty = $state<Difficulty>('medium');

	async function startGame() {
		loading = true;
		difficulty.set(selectedDifficulty);
		try {
			const state = await apiPost<GameState>('/game/new');
			gameState.set(state);
			gameScreen.set('playing');
		} catch {
			gameScreen.set('playing');
		}
		loading = false;
	}

	const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
	const diffColors: Record<Difficulty, string> = {
		easy: '#4ade80',
		medium: '#fbbf24',
		hard: '#ef4444',
	};
</script>

<div class="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
	<!-- Starfield background -->
	<div class="absolute inset-0 bg-[var(--color-bg)]">
		{#each Array(80) as _, i}
			<div
				class="absolute rounded-full bg-white"
				style="
					width: {1 + Math.random() * 2}px;
					height: {1 + Math.random() * 2}px;
					top: {Math.random() * 100}%;
					left: {Math.random() * 100}%;
					opacity: {0.3 + Math.random() * 0.7};
					animation: twinkle {2 + Math.random() * 4}s ease-in-out infinite;
					animation-delay: {Math.random() * 3}s;
				"
			></div>
		{/each}
	</div>

	<!-- Planets placeholder -->
	<div class="relative z-10 flex items-center gap-12 mb-16">
		<!-- Venus -->
		<div class="flex flex-col items-center">
			<div class="w-28 h-28 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600 shadow-[0_0_40px_rgba(245,158,11,0.4)] flex items-center justify-center">
				<span class="text-xs font-bold text-amber-900/70">VENUS</span>
			</div>
			<p class="text-[var(--color-accent-venus)] text-sm mt-3 font-medium">92 atm · 464°C</p>
		</div>

		<!-- Earth -->
		<div class="flex flex-col items-center -mt-8">
			<div class="w-36 h-36 rounded-full bg-gradient-to-br from-blue-400 via-green-400 to-blue-600 shadow-[0_0_50px_rgba(59,130,246,0.4)] flex items-center justify-center">
				<span class="text-sm font-bold text-blue-100/80">EARTH</span>
			</div>
			<p class="text-[var(--color-accent-earth)] text-sm mt-3 font-medium">1.0 atm · 15°C</p>
		</div>

		<!-- Mars -->
		<div class="flex flex-col items-center">
			<div class="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-800 shadow-[0_0_30px_rgba(239,68,68,0.3)] flex items-center justify-center">
				<span class="text-xs font-bold text-red-200/70">MARS</span>
			</div>
			<p class="text-[var(--color-accent-mars)] text-sm mt-3 font-medium">0.006 atm · −63°C</p>
		</div>
	</div>

	<!-- Title -->
	<div class="relative z-10 text-center mb-12">
		<h1 class="text-6xl font-black tracking-tight mb-4">
			<span class="text-[var(--color-accent-venus)]">Ven</span><span class="text-[var(--color-accent-mars)]">Mars</span>
		</h1>
		<h2 class="text-2xl font-light text-[var(--color-text-dim)] tracking-widest uppercase">
			Tri-World Project
		</h2>
		<p class="text-[var(--color-text-dim)] mt-4 max-w-lg mx-auto text-sm leading-relaxed">
			Strip Venus' atmosphere. Thicken Mars'. Engineer two new habitable worlds.
		</p>
	</div>

	<!-- Difficulty selector -->
	<div class="relative z-10 mb-8">
		<p class="text-xs text-[var(--color-text-dim)] mb-3 text-center uppercase tracking-widest">Budget Difficulty</p>
		<div class="flex gap-3">
			{#each difficulties as diff}
				<button
					onclick={() => selectedDifficulty = diff}
					class="px-6 py-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
						{selectedDifficulty === diff ? 'scale-105' : 'opacity-60 hover:opacity-80'}"
					style="border-color: {diffColors[diff]}; background: {selectedDifficulty === diff ? diffColors[diff] + '22' : 'transparent'};"
				>
					<span class="block text-sm font-bold" style="color: {diffColors[diff]}">{difficultyConfig[diff].label}</span>
					<span class="block text-xs mt-1" style="color: {diffColors[diff]}; opacity: 0.8">{difficultyConfig[diff].gdpPercent}% GDP</span>
					<span class="block text-[0.65rem] mt-0.5 text-[var(--color-text-dim)]">
						~${difficultyConfig[diff].annualBudgetB >= 1000 ? (difficultyConfig[diff].annualBudgetB / 1000).toFixed(1) + 'T' : difficultyConfig[diff].annualBudgetB + 'B'}/yr
					</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Start button -->
	<button
		onclick={startGame}
		disabled={loading}
		class="relative z-10 px-12 py-4 bg-gradient-to-r from-[var(--color-accent-venus)] to-[var(--color-accent-mars)]
			text-white font-bold text-lg rounded-lg tracking-wider uppercase
			hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all duration-300
			disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
	>
		{loading ? 'Initializing...' : 'Begin Terraforming'}
	</button>

	<!-- Milestones preview -->
	<div class="relative z-10 mt-16 flex gap-8 text-xs text-[var(--color-text-dim)]">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-[var(--color-accent-moon)]"></div>
			<span>Lunar Mass Driver</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-[var(--color-accent-venus)]"></div>
			<span>Venus Atmospheric Harvesting</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-[var(--color-accent-asteroid)]"></div>
			<span>Asteroid & Comet Harvesting</span>
		</div>
	</div>
</div>

<style>
	@keyframes twinkle {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}
</style>
