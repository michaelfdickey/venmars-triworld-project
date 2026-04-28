<script lang="ts">
	import { gameScreen, gameState, difficulty, difficultyConfig } from '$lib/stores/gameStore';
	import { apiPost } from '$lib/api/client';
	import type { GameState, Difficulty } from '$lib/stores/gameStore';
	import { onMount, onDestroy } from 'svelte';

	let loading = $state(false);
	let selectedDifficulty = $state<Difficulty>('medium');
	let step = $state(0);
	let timer: ReturnType<typeof setInterval>;

	onMount(() => {
		timer = setInterval(() => {
			step += 1;
		}, 4000);
	});

	onDestroy(() => {
		clearInterval(timer);
	});

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

	const planets = [
		{ name: 'Venus', img: '/venus_terraformed.jpg', glow: 'rgba(245,158,11,0.5)', label: 'Terraformed Venus' },
		{ name: 'Earth', img: '/earth_from_space.jpg', glow: 'rgba(59,130,246,0.5)', label: 'Earth' },
		{ name: 'Mars', img: '/mars_terraformed.jpg', glow: 'rgba(239,68,68,0.5)', label: 'Terraformed Mars' },
	];

	/* Slot layout: center is big, left/right are smaller and offset */
	const slots = [
		{ x: 0,    scale: 1.0,  z: 3, y: 0  },   /* center */
		{ x: 320,  scale: 0.55, z: 1, y: 20 },   /* right  */
		{ x: -320, scale: 0.55, z: 1, y: 20 },   /* left   */
	];

	function getSlot(planetIndex: number) {
		return slots[(planetIndex + step) % 3];
	}
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

	<!-- Rotating planet carousel -->
	<div class="planet-carousel relative z-10 mb-12">
		{#each planets as planet, i}
			{@const slot = getSlot(i)}
			<div
				class="planet-item"
				style="
					transform: translateX({slot.x}px) translateY({slot.y}px) scale({slot.scale});
					z-index: {slot.z};
				"
			>
				<div class="planet-img-wrap" style="box-shadow: 0 0 50px 12px {planet.glow};">
					<img src={planet.img} alt={planet.name} />
				</div>
				<p class="planet-label">{planet.label}</p>
			</div>
		{/each}
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

	<!-- Story blurb -->
	<div class="relative z-10 max-w-xl mx-auto mb-10 px-6 py-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)]">
		<p class="text-sm text-[var(--color-text-dim)] leading-relaxed italic text-center">
			In an age of abundance and prosperity, the Global Space Consortium has agreed to fund the
			<span class="text-[var(--color-text)] font-semibold not-italic">VenMars Tri-World Project</span>
			— creating two new habitable worlds in our solar system to encourage the expansion of human
			civilization among the stars and to mitigate the threats existential risks pose.
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

	.planet-carousel {
		position: relative;
		width: 800px;
		height: 340px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.planet-item {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: transform 1.4s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.7s;
	}

	.planet-img-wrap {
		width: 280px;
		height: 280px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.15);
	}

	.planet-img-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.planet-label {
		margin-top: 10px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-dim);
		text-align: center;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
</style>
