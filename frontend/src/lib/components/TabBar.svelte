<script lang="ts">
	import { activeTab } from '$lib/stores/gameStore';

	interface Tab {
		id: string;
		label: string;
		color: string;
		icon: string;
	}

	const bodyTabs: Tab[] = [
		{ id: 'earth', label: 'Earth', color: 'var(--color-accent-earth)', icon: '🌍' },
		{ id: 'moon', label: 'Moon', color: 'var(--color-accent-moon)', icon: '🌙' },
		{ id: 'venus', label: 'Venus', color: 'var(--color-accent-venus)', icon: '☀️' },
		{ id: 'mars', label: 'Mars', color: 'var(--color-accent-mars)', icon: '🔴' },
		{ id: 'asteroids', label: 'Asteroid Belt', color: 'var(--color-accent-asteroid)', icon: '☄️' }
	];

	const settingsTab: Tab = { id: 'settings', label: 'Settings', color: 'var(--color-text-dim)', icon: '⚙️' };

	function setTab(id: string) {
		activeTab.set(id);
	}
</script>

<div class="flex items-center bg-[var(--color-bg-panel)] border-b border-[var(--color-border)]">
	<!-- Body tabs -->
	<div class="flex flex-1">
		{#each bodyTabs as tab}
			<button
				onclick={() => setTab(tab.id)}
				class="px-5 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 cursor-pointer
					{$activeTab === tab.id
						? 'border-current text-white bg-[var(--color-bg-card)]'
						: 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-card)]/50'}"
				style={$activeTab === tab.id ? `color: ${tab.color}` : ''}
			>
				<span class="mr-1.5">{tab.icon}</span>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Settings tab (right-aligned) -->
	<button
		onclick={() => setTab('settings')}
		class="px-5 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 cursor-pointer
			{$activeTab === 'settings'
				? 'border-[var(--color-text-dim)] text-white bg-[var(--color-bg-card)]'
				: 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-card)]/50'}"
	>
		<span class="mr-1.5">{settingsTab.icon}</span>
		{settingsTab.label}
	</button>
</div>
