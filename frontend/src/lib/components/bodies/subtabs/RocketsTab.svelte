<script lang="ts">
	import { rocketDefs, rocketInventory, reservedRockets, launchComplexCosts, claimedComplexes, type RocketDef, type ReuseMode, reuseModeLabels } from '$lib/stores/gameStore';

	let { bodyId }: { bodyId: string } = $props();

	const maxHeight = 121;

	// ── Inventory helpers using writable store ──
	function getOwned(rocketId: string): number {
		return $rocketInventory[rocketId] ?? 0;
	}

	function getGlobalAvailable(rocket: RocketDef): number {
		return Math.max(0, rocket.globalInventory - getOwned(rocket.id));
	}

	function getReserved(rocketId: string): number {
		return $reservedRockets[rocketId] ?? 0;
	}

	function purchase(rocket: RocketDef) {
		if (getGlobalAvailable(rocket) <= 0) return;
		// Must own the home base launch complex to purchase
		if (!$claimedComplexes.has(rocket.homeBase)) return;
		rocketInventory.update(inv => ({ ...inv, [rocket.id]: (inv[rocket.id] ?? 0) + 1 }));
	}

	function sell(rocketId: string) {
		const current = getOwned(rocketId);
		if (current <= 0) return;
		rocketInventory.update(inv => ({ ...inv, [rocketId]: current - 1 }));
	}

	let totalOwned = $derived(
		Object.values($rocketInventory).reduce((sum, n) => sum + n, 0)
	);

	let totalMaintenanceCostM = $derived(
		rocketDefs.reduce((sum, r) => sum + getOwned(r.id) * r.maintenanceCostM, 0)
	);

	function formatMass(kg: number): string {
		if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
		return kg.toLocaleString() + ' kg';
	}

	function statusColor(s: RocketDef['status']): string {
		if (s === 'operational') return '#4ade80';
		if (s === 'development') return '#fbbf24';
		return '#6b7280';
	}

	function homeBaseName(complexId: string): string {
		return launchComplexCosts[complexId]?.name ?? complexId;
	}

	let sortKey = $state<'payloadLEO' | 'purchaseCostM' | 'name'>('payloadLEO');
	let sortAsc = $state(false); // false = descending for payload (heaviest first)

	function handleSort(key: typeof sortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			// sensible defaults: payload desc, cost asc, name asc
			sortAsc = key !== 'payloadLEO';
		}
	}

	let sortedRockets = $derived(
		[...rocketDefs].sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortKey === 'purchaseCostM') cmp = a.purchaseCostM - b.purchaseCostM;
			else cmp = a.payloadLEO - b.payloadLEO;
			return sortAsc ? cmp : -cmp;
		})
	);

	// ── Propellant tank visuals ──
	const propColors: Record<string, string> = {
		lox: '#60a5fa', rp1: '#f59e0b', lch4: '#4ade80', lh2: '#f472b6', solid: '#fb923c',
	};
	const propLabels: Record<string, string> = {
		lox: 'LOX', rp1: 'RP-1', lch4: 'CH₄', lh2: 'LH₂', solid: 'Solid',
	};

	interface StageFuel { ox: string; fuel: string; oxFrac: number }
	const rocketFuel: Record<string, { s1: StageFuel; s2: StageFuel; s3?: StageFuel }> = {
		'starship':      { s1: { ox:'lox', fuel:'lch4', oxFrac:0.57 }, s2: { ox:'lox', fuel:'lch4', oxFrac:0.57 } },
		'falcon-heavy':  { s1: { ox:'lox', fuel:'rp1',  oxFrac:0.65 }, s2: { ox:'lox', fuel:'rp1',  oxFrac:0.65 } },
		'falcon-9':      { s1: { ox:'lox', fuel:'rp1',  oxFrac:0.65 }, s2: { ox:'lox', fuel:'rp1',  oxFrac:0.65 } },
		'sls':           { s1: { ox:'lox', fuel:'lh2',  oxFrac:0.27 }, s2: { ox:'lox', fuel:'lh2',  oxFrac:0.27 } },
		'new-glenn':     { s1: { ox:'lox', fuel:'lch4', oxFrac:0.57 }, s2: { ox:'lox', fuel:'lh2',  oxFrac:0.27 } },
		'vulcan':        { s1: { ox:'lox', fuel:'lch4', oxFrac:0.57 }, s2: { ox:'lox', fuel:'lh2',  oxFrac:0.27 } },
		'long-march-9':  { s1: { ox:'lox', fuel:'rp1',  oxFrac:0.65 }, s2: { ox:'lox', fuel:'lh2',  oxFrac:0.27 }, s3: { ox:'lox', fuel:'lh2', oxFrac:0.27 } },
		'ariane-6':      { s1: { ox:'lox', fuel:'lh2',  oxFrac:0.27 }, s2: { ox:'lox', fuel:'lh2',  oxFrac:0.27 } },
		'neutron':       { s1: { ox:'lox', fuel:'lch4', oxFrac:0.57 }, s2: { ox:'lox', fuel:'lch4', oxFrac:0.57 } },
		'terran-r':      { s1: { ox:'lox', fuel:'lch4', oxFrac:0.57 }, s2: { ox:'lox', fuel:'lch4', oxFrac:0.57 } },
	};

	function formatThrust(kN: number): string {
		const mn = kN / 1000;
		const lbf = kN * 224.809;
		const lbfStr = lbf >= 1e6 ? (lbf / 1e6).toFixed(1) + 'M' : Math.round(lbf).toLocaleString();
		return `${mn.toFixed(1)} MN (${lbfStr} lbf)`;
	}

	function fuelPct(oxFrac: number): string {
		return Math.round((1 - oxFrac) * 100) + '%';
	}

	function getUsedProps(rocketId: string, shape: string): string[] {
		const f = rocketFuel[rocketId];
		if (!f) return [];
		const types = new Set<string>();
		for (const s of [f.s1, f.s2, f.s3]) {
			if (s) { types.add(s.ox); types.add(s.fuel); }
		}
		if (shape === 'srb') types.add('solid');
		return [...types];
	}
</script>

<div class="rockets-tab">
	<div class="rockets-header">
		<h3 class="text-lg font-semibold">Launch Vehicles</h3>
		<div class="inventory-summary">
			<span class="inventory-total">{totalOwned}</span>
			<span class="inventory-label">owned</span>
			<span class="inventory-sep">·</span>
			<span class="inventory-cost">${(totalMaintenanceCostM / 1000).toFixed(2)}B/yr</span>
		</div>
		<div class="sort-controls">
			<span class="sort-label">Sort:</span>
			<button class="sort-btn" class:active={sortKey === 'payloadLEO'} onclick={() => handleSort('payloadLEO')}>
				Payload{#if sortKey === 'payloadLEO'}<span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>{/if}
			</button>
			<button class="sort-btn" class:active={sortKey === 'purchaseCostM'} onclick={() => handleSort('purchaseCostM')}>
				Cost{#if sortKey === 'purchaseCostM'}<span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>{/if}
			</button>
			<button class="sort-btn" class:active={sortKey === 'name'} onclick={() => handleSort('name')}>
				Name{#if sortKey === 'name'}<span class="sort-arrow">{sortAsc ? '▲' : '▼'}</span>{/if}
			</button>
		</div>
	</div>

	<div class="rocket-list">
		{#each sortedRockets as rocket}
			{@const owned = getOwned(rocket.id)}
			{@const available = getGlobalAvailable(rocket)}
			{@const reserved = getReserved(rocket.id)}
			{@const freeOwned = Math.max(0, owned - reserved)}
			{@const hasBase = $claimedComplexes.has(rocket.homeBase)}
			{@const fuel = rocketFuel[rocket.id]}
			<div class="rocket-card" style="border-color: {rocket.color}44; --rc: {rocket.color};">
				<!-- Colored top accent bar -->
				<div class="card-accent" style="background: linear-gradient(90deg, {rocket.color}, {rocket.color}44);"></div>

				<div class="card-body">
					<!-- LEFT: Rocket info -->
					<div class="card-info">
						<div class="rocket-header">
							<div>
								<span class="rocket-name" style="color: {rocket.color}">{rocket.name}</span>
								<span class="rocket-provider">{rocket.provider}</span>
							</div>
							<div class="header-right">
								{#if rocket.reusable}
									<span class="reusable-badge">♻️</span>
								{/if}
								<span class="rocket-status" style="color: {statusColor(rocket.status)}">
									{rocket.status.toUpperCase()}
								</span>
							</div>
						</div>

						<div class="rocket-visual">
							<div class="rocket-silhouette" style="width: {Math.max(30, (rocket.height / maxHeight) * 100)}%;">
								<svg viewBox="0 0 200 30" preserveAspectRatio="xMidYMid meet" style="filter: drop-shadow(0 0 3px {rocket.color}66);">
									{#if fuel}
										<defs>
											<linearGradient id="{rocket.id}-s1">
												<stop offset="0%" stop-color={propColors[fuel.s1.fuel]}/>
												<stop offset={fuelPct(fuel.s1.oxFrac)} stop-color={propColors[fuel.s1.fuel]}/>
												<stop offset={fuelPct(fuel.s1.oxFrac)} stop-color={propColors[fuel.s1.ox]}/>
												<stop offset="100%" stop-color={propColors[fuel.s1.ox]}/>
											</linearGradient>
											<linearGradient id="{rocket.id}-s2">
												<stop offset="0%" stop-color={propColors[fuel.s2.fuel]}/>
												<stop offset={fuelPct(fuel.s2.oxFrac)} stop-color={propColors[fuel.s2.fuel]}/>
												<stop offset={fuelPct(fuel.s2.oxFrac)} stop-color={propColors[fuel.s2.ox]}/>
												<stop offset="100%" stop-color={propColors[fuel.s2.ox]}/>
											</linearGradient>
											{#if fuel.s3}
												<linearGradient id="{rocket.id}-s3">
													<stop offset="0%" stop-color={propColors[fuel.s3.fuel]}/>
													<stop offset={fuelPct(fuel.s3.oxFrac)} stop-color={propColors[fuel.s3.fuel]}/>
													<stop offset={fuelPct(fuel.s3.oxFrac)} stop-color={propColors[fuel.s3.ox]}/>
													<stop offset="100%" stop-color={propColors[fuel.s3.ox]}/>
												</linearGradient>
											{/if}
										</defs>
									{/if}
									{#if rocket.shape === 'single'}
										<!-- S1 engine: nozzle triangle overlapping chamber circle -->
										<polygon points="0,8 0,22 8,11 8,19" fill={rocket.color} opacity="0.55"/>
										<circle cx="9" cy="15" r="3" fill={rocket.color} opacity="0.7"/>
										<!-- Rocket body -->
										<rect x="12" y="10" width="88" height="10" rx="2" fill={rocket.color} opacity="0.3"/>
										<!-- S1 tank -->
										<rect x="14" y="11.5" width="84" height="7" rx="3.5" fill={'url(#' + rocket.id + '-s1)'} opacity="0.8"/>
										<!-- Stage sep -->
										<line x1="100" y1="9" x2="100" y2="21" stroke="white" stroke-width="0.7" opacity="0.3"/>
										<!-- S2 engine at separator -->
										<polygon points="98,12 98,18 101,13 101,17" fill={rocket.color} opacity="0.45"/>
										<circle cx="102" cy="15" r="1.8" fill={rocket.color} opacity="0.6"/>
										<!-- S2 body + tank -->
										<rect x="104" y="10" width="56" height="10" rx="2" fill={rocket.color} opacity="0.3"/>
										<rect x="106" y="11.5" width="52" height="7" rx="3.5" fill={'url(#' + rocket.id + '-s2)'} opacity="0.8"/>
										<!-- Nose cone -->
										<polygon points="160,10 160,20 188,15" fill={rocket.color} opacity="0.8"/>
									{:else if rocket.shape === 'triple'}
										<!-- Core S1 engine -->
										<polygon points="2,10 2,20 8,12 8,18" fill={rocket.color} opacity="0.55"/>
										<circle cx="9" cy="15" r="2.2" fill={rocket.color} opacity="0.7"/>
										<!-- Top booster engine -->
										<polygon points="6,1.5 6,7.5 10,2.5 10,6.5" fill={rocket.color} opacity="0.45"/>
										<circle cx="11" cy="4.5" r="1.5" fill={rocket.color} opacity="0.6"/>
										<!-- Bottom booster engine -->
										<polygon points="6,22.5 6,28.5 10,23.5 10,27.5" fill={rocket.color} opacity="0.45"/>
										<circle cx="11" cy="25.5" r="1.5" fill={rocket.color} opacity="0.6"/>
										<!-- Booster top body + tank -->
										<rect x="12" y="2" width="132" height="7" rx="2" fill={rocket.color} opacity="0.2"/>
										<rect x="14" y="3" width="128" height="5" rx="2.5" fill={'url(#' + rocket.id + '-s1)'} opacity="0.55"/>
										<!-- Core body -->
										<rect x="12" y="11" width="88" height="8" rx="2" fill={rocket.color} opacity="0.3"/>
										<!-- S1 tank -->
										<rect x="14" y="12.5" width="84" height="5" rx="2.5" fill={'url(#' + rocket.id + '-s1)'} opacity="0.85"/>
										<!-- Stage sep -->
										<line x1="100" y1="10" x2="100" y2="20" stroke="white" stroke-width="0.7" opacity="0.3"/>
										<!-- S2 engine at separator -->
										<polygon points="98,13 98,17 101,13.5 101,16.5" fill={rocket.color} opacity="0.4"/>
										<circle cx="102" cy="15" r="1.3" fill={rocket.color} opacity="0.55"/>
										<!-- S2 body + tank -->
										<rect x="103" y="11" width="57" height="8" rx="2" fill={rocket.color} opacity="0.3"/>
										<rect x="105" y="12.5" width="53" height="5" rx="2.5" fill={'url(#' + rocket.id + '-s2)'} opacity="0.85"/>
										<!-- Booster bottom body + tank -->
										<rect x="12" y="21" width="132" height="7" rx="2" fill={rocket.color} opacity="0.2"/>
										<rect x="14" y="22" width="128" height="5" rx="2.5" fill={'url(#' + rocket.id + '-s1)'} opacity="0.55"/>
										<!-- Nose cone -->
										<polygon points="160,11 160,19 186,15" fill={rocket.color} opacity="0.8"/>
									{:else if rocket.shape === 'wide-dual'}
										<!-- S1 engine (large) -->
										<polygon points="0,2 0,28 10,7 10,23" fill={rocket.color} opacity="0.5"/>
										<circle cx="11" cy="11" r="2.5" fill={rocket.color} opacity="0.65"/>
										<circle cx="11" cy="19" r="2.5" fill={rocket.color} opacity="0.65"/>
										<!-- S1 body + tank -->
										<rect x="14" y="4" width="96" height="22" rx="3" fill={rocket.color} opacity="0.25"/>
										<rect x="16" y="6" width="92" height="18" rx="5" fill={'url(#' + rocket.id + '-s1)'} opacity="0.7"/>
										<!-- Stage sep -->
										<line x1="111" y1="4" x2="111" y2="26" stroke="white" stroke-width="0.7" opacity="0.35"/>
										<!-- S2 engine at separator -->
										<polygon points="109,10 109,20 113,12 113,18" fill={rocket.color} opacity="0.4"/>
										<circle cx="114" cy="15" r="2" fill={rocket.color} opacity="0.55"/>
										<!-- S2 body + tank -->
										<rect x="116" y="6.5" width="49" height="17" rx="2" fill={rocket.color} opacity="0.25"/>
										<rect x="118" y="8.5" width="45" height="13" rx="4" fill={'url(#' + rocket.id + '-s2)'} opacity="0.8"/>
										<!-- Nose cone -->
										<polygon points="165,6.5 165,23.5 192,15" fill={rocket.color} opacity="0.8"/>
									{:else if rocket.shape === 'srb'}
										<!-- Core engine -->
										<polygon points="0,8 0,22 8,10.5 8,19.5" fill={rocket.color} opacity="0.5"/>
										<circle cx="9" cy="15" r="3" fill={rocket.color} opacity="0.7"/>
										<!-- Top SRB engine -->
										<polygon points="8,1 8,7 12,2.5 12,5.5" fill="#fb923c" opacity="0.45"/>
										<circle cx="13" cy="4" r="1.2" fill="#fb923c" opacity="0.55"/>
										<!-- Bottom SRB engine -->
										<polygon points="8,23 8,29 12,24.5 12,27.5" fill="#fb923c" opacity="0.45"/>
										<circle cx="13" cy="26" r="1.2" fill="#fb923c" opacity="0.55"/>
										<!-- SRB top body + solid fill -->
										<rect x="14" y="1.5" width="120" height="6" rx="2" fill={rocket.color} opacity="0.15"/>
										<rect x="16" y="2.5" width="116" height="4" rx="2" fill="#fb923c" opacity="0.55"/>
										<!-- Core body -->
									<rect x="12" y="9" width="148" height="12" rx="2" fill={rocket.color} opacity="0.3"/>
										<!-- S1 tank -->
										{#if fuel?.s3}
											<rect x="14" y="10.5" width="51" height="9" rx="4" fill={'url(#' + rocket.id + '-s1)'} opacity="0.8"/>
											<line x1="67" y1="8" x2="67" y2="22" stroke="white" stroke-width="0.7" opacity="0.3"/>
											<!-- S2 engine -->
											<polygon points="65,12 65,18 68,13 68,17" fill={rocket.color} opacity="0.4"/>
											<circle cx="69" cy="15" r="1.3" fill={rocket.color} opacity="0.55"/>
											<rect x="71" y="10.5" width="39" height="9" rx="4" fill={'url(#' + rocket.id + '-s2)'} opacity="0.8"/>
											<line x1="113" y1="8" x2="113" y2="22" stroke="white" stroke-width="0.7" opacity="0.3"/>
											<!-- S3 engine -->
											<polygon points="111,12 111,18 114,13 114,17" fill={rocket.color} opacity="0.4"/>
											<circle cx="115" cy="15" r="1.3" fill={rocket.color} opacity="0.55"/>
											<rect x="117" y="10.5" width="41" height="9" rx="4" fill={'url(#' + rocket.id + '-s3)'} opacity="0.8"/>
										{:else}
											<rect x="14" y="10.5" width="83" height="9" rx="4" fill={'url(#' + rocket.id + '-s1)'} opacity="0.8"/>
											<line x1="100" y1="8" x2="100" y2="22" stroke="white" stroke-width="0.7" opacity="0.3"/>
											<!-- S2 engine -->
											<polygon points="98,12 98,18 101,13 101,17" fill={rocket.color} opacity="0.4"/>
											<circle cx="102" cy="15" r="1.5" fill={rocket.color} opacity="0.55"/>
											<rect x="104" y="10.5" width="54" height="9" rx="4" fill={'url(#' + rocket.id + '-s2)'} opacity="0.8"/>
										{/if}
										<!-- SRB bottom body + solid fill -->
										<rect x="14" y="22.5" width="120" height="6" rx="2" fill={rocket.color} opacity="0.15"/>
										<rect x="16" y="23.5" width="116" height="4" rx="2" fill="#fb923c" opacity="0.55"/>
										<!-- Nose cone -->
										<polygon points="160,9 160,21 188,15" fill={rocket.color} opacity="0.8"/>
									{/if}
								</svg>
							</div>

						</div>

						<!-- Specs area -->
						<div class="rocket-specs">
							<div class="payload-mode-table">
								<div class="pmt-header">
									<span class="pmt-cell pmt-label"></span>
									<span class="pmt-cell pmt-hdr">LEO</span>
									<span class="pmt-cell pmt-hdr">GTO</span>
									<span class="pmt-cell pmt-hdr">TLI</span>
								</div>
								{#each (['expendable', 'booster-reuse', 'full-reuse'] as const) as mode}
									{@const row = rocket.payloadByMode[mode]}
									{#if row}
										<div class="pmt-row">
											<span class="pmt-cell pmt-mode-label">{mode === 'expendable' ? '🗑️ Expend' : mode === 'booster-reuse' ? '♻️ Booster' : '♻️♻️ Full'}</span>
											<span class="pmt-cell pmt-val">{formatMass(row.LEO)}</span>
											<span class="pmt-cell pmt-val">{formatMass(row.GTO)}</span>
											<span class="pmt-cell pmt-val">{formatMass(row.TLI)}</span>
										</div>
									{/if}
								{/each}
							</div>

							<div class="spec-row-secondary">
								<div class="spec">
									<span class="spec-label">Volume</span>
									<span class="spec-value">{rocket.fairingVolume_m3} m³</span>
								</div>
								<div class="spec">
									<span class="spec-label">⌀ Fairing</span>
									<span class="spec-value">{rocket.fairingDiameter_m} m</span>
								</div>
								<div class="spec">
									<span class="spec-label">Launch</span>
									<span class="spec-value">${rocket.costPerLaunch}M</span>
								</div>
								<div class="spec">
									<span class="spec-label">Purchase</span>
									<span class="spec-value">${rocket.purchaseCostM}M</span>
								</div>
								<div class="spec">
									<span class="spec-label">Max ΔV</span>
									<span class="spec-value">{(rocket.maxDeltaV_ms / 1000).toFixed(1)} km/s</span>
								</div>
								<div class="spec">
									<span class="spec-label">Max G</span>
									<span class="spec-value">{rocket.maxGs.toFixed(1)} g</span>
								</div>
								<div class="spec">
									<span class="spec-label">Max Q</span>
									<span class="spec-value">{rocket.maxQ_kPa} kPa</span>
								</div>
							</div>
						</div>

						<div class="capacity-bar-bg">
							<div class="capacity-bar" style="width: {Math.min(100, (rocket.payloadLEO / 150000) * 100)}%; background: linear-gradient(90deg, {rocket.color}88, {rocket.color});"></div>
						</div>
					</div>

					<!-- CENTER: Operational column -->
					<div class="ops-col" style="border-color: {rocket.color}33;">
						<div class="ops-title" style="color: {rocket.color}">OPERATIONAL</div>

						<div class="ops-grid">
							<span class="ops-label">Diameter</span>
							<span class="ops-val">{rocket.diameter} m</span>

							<span class="ops-label">Length</span>
							<span class="ops-val">{rocket.height} m</span>

							<span class="ops-label">Stages</span>
							<span class="ops-val">{rocket.stages}</span>

							<span class="ops-label">Thrust</span>
							<span class="ops-val ops-thrust">{formatThrust(rocket.thrust)}</span>
						</div>

						<div class="ops-fuel-section">
							<span class="ops-fuel-title">Propellants</span>
							{#if fuel}
								{@const stages = [{ label: 'S1', data: fuel.s1 }, { label: 'S2', data: fuel.s2 }, ...(fuel.s3 ? [{ label: 'S3', data: fuel.s3 }] : [])]}
								{#each stages as st}
									<div class="ops-fuel-row">
										<span class="ops-fuel-stage">{st.label}</span>
										<div class="ops-fuel-bar">
											<div class="ops-fuel-seg" style="width: {100 - Math.round(st.data.oxFrac * 100)}%; background: {propColors[st.data.fuel]};" title="{propLabels[st.data.fuel]} {fuelPct(st.data.oxFrac)}"></div>
											<div class="ops-fuel-seg" style="width: {Math.round(st.data.oxFrac * 100)}%; background: {propColors[st.data.ox]};" title="{propLabels[st.data.ox]} {Math.round(st.data.oxFrac * 100)}%"></div>
										</div>
									</div>
								{/each}
								{#if rocket.shape === 'srb'}
									<div class="ops-fuel-row">
										<span class="ops-fuel-stage">SRB</span>
										<div class="ops-fuel-bar">
											<div class="ops-fuel-seg" style="width: 100%; background: {propColors['solid']};" title="Solid"></div>
										</div>
									</div>
								{/if}
							{/if}
							<div class="ops-prop-chips">
								{#each getUsedProps(rocket.id, rocket.shape) as p}
									<span class="prop-chip">
										<span class="prop-dot" style="background: {propColors[p]}"></span>
										{propLabels[p]}
									</span>
								{/each}
							</div>
						</div>
					</div>

					<!-- RIGHT: Inventory column -->
					<div class="inventory-col" style="border-color: {rocket.color}33;">
						<div class="inv-title" style="color: {rocket.color}">INVENTORY</div>

						<div class="inv-grid">
							<span class="inv-label">Global</span>
							<span class="inv-val">{rocket.globalInventory}</span>

							<span class="inv-label">Available</span>
							<span class="inv-val" class:none={available === 0} style="color: {available > 0 ? '#4ade80' : '#ef4444'}">{available}</span>

							<span class="inv-label">Owned</span>
							<span class="inv-val inv-owned" style="color: {owned > 0 ? rocket.color : 'var(--color-text-dim)'}">{owned}</span>

							{#if reserved > 0}
								<span class="inv-label">Reserved</span>
								<span class="inv-val" style="color: #f59e0b">{reserved}</span>

								<span class="inv-label">Free</span>
								<span class="inv-val" style="color: {freeOwned > 0 ? '#4ade80' : '#ef4444'}">{freeOwned}</span>
							{/if}
						</div>

						<div class="inv-actions">
							<button class="inv-btn sell" onclick={() => sell(rocket.id)} disabled={owned === 0}>
								<span class="inv-btn-icon">−</span>
								<span class="inv-btn-text">Sell</span>
							</button>
							<button class="inv-btn buy" onclick={() => purchase(rocket)} disabled={available === 0 || !hasBase} style="border-color: {rocket.color}66; {available > 0 && hasBase ? `color: ${rocket.color}` : ''}">
								<span class="inv-btn-icon">+</span>
								<span class="inv-btn-text">Buy</span>
							</button>
						</div>

						{#if owned > 0}
							<div class="inv-maint">
								<span class="inv-maint-label">Maintenance</span>
								<span class="inv-maint-val">${(owned * rocket.maintenanceCostM).toFixed(0)}M/yr</span>
							</div>
						{/if}

						{#if rocket.reusable && rocket.refurbishmentDays > 0}
							<div class="inv-refurb">
								<span class="inv-refurb-label">Refurb</span>
								<span class="inv-refurb-val">{rocket.refurbishmentDays}d · ${rocket.refurbishmentCostM}M</span>
							</div>
						{/if}

						<div class="inv-home">
							<span class="inv-home-icon">{hasBase ? '🏠' : '🔒'}</span>
							<span class="inv-home-name" class:locked={!hasBase}>{homeBaseName(rocket.homeBase)}</span>
						</div>
						{#if !hasBase}
							<span class="inv-home-hint">Claim complex to buy</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.rockets-tab {
		display: flex;
		flex-direction: column;
	}

	.rockets-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.sort-label {
		color: var(--color-text-dim);
	}

	.sort-btn {
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		cursor: pointer;
		transition: all 0.15s;
	}
	.sort-btn:hover { color: var(--color-text); }
	.sort-btn.active {
		background: var(--color-border);
		color: var(--color-text);
	}
	.sort-arrow {
		font-size: 0.65em;
		margin-left: 0.25rem;
		opacity: 0.8;
	}

	.rocket-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Card layout ── */
	.rocket-card {
		border-radius: 0.5rem;
		border: 1px solid;
		background: var(--color-bg-panel);
		overflow: hidden;
		transition: border-color 0.15s, box-shadow 0.2s;
		box-shadow: 0 0 8px color-mix(in srgb, var(--rc) 15%, transparent);
	}
	.rocket-card:hover {
		box-shadow: 0 0 14px color-mix(in srgb, var(--rc) 30%, transparent);
	}


	.card-accent {
		height: 3px;
	}

	.card-body {
		display: flex;
		gap: 0;
	}

	.card-info {
		flex: 1;
		min-width: 0;
		padding: 0.6rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.rocket-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}

	.rocket-name {
		font-weight: 700;
		font-size: 0.95rem;
		margin-right: 0.4rem;
	}

	.rocket-provider {
		font-size: 0.65rem;
		color: var(--color-text-dim);
	}

	.rocket-status {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.reusable-badge {
		font-size: 0.65rem;
	}

	/* ── Rocket visual row ── */
	.rocket-visual {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.15rem;
	}

	.rocket-silhouette {
		min-width: 80px;
	}

	.rocket-silhouette svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* ── Specs area ── */
	.rocket-specs {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.payload-mode-table {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		overflow: hidden;
	}
	.pmt-header, .pmt-row {
		display: grid;
		grid-template-columns: 5rem 1fr 1fr 1fr;
		gap: 0;
	}
	.pmt-header {
		background: rgba(99, 102, 241, 0.06);
		border-bottom: 1px solid var(--color-border);
	}
	.pmt-row:not(:last-child) {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}
	.pmt-cell {
		padding: 0.2rem 0.35rem;
		font-size: 0.6rem;
		text-align: center;
	}
	.pmt-hdr {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		font-size: 0.5rem;
	}
	.pmt-mode-label {
		text-align: left;
		font-weight: 600;
		font-size: 0.55rem;
		color: var(--color-text-dim);
		white-space: nowrap;
	}
	.pmt-val {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 600;
		font-size: 0.62rem;
	}
	.pmt-label { font-size: 0.5rem; }

	.spec-row-secondary {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.25rem;
	}

	.spec {
		text-align: center;
		padding: 0.25rem;
		background: var(--color-bg);
		border-radius: 0.3rem;
	}

	.spec-label {
		display: block;
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-dim);
		margin-bottom: 0.05rem;
	}

	.spec-value {
		display: block;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.capacity-bar-bg {
		height: 3px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
	}

	.capacity-bar {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s;
	}

	/* ── Inventory column ── */
	.inventory-col {
		flex-shrink: 0;
		width: 130px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem;
		border-left: 1px solid;
		background: rgba(0, 0, 0, 0.15);
	}

	/* ── Operational column ── */
	.ops-col {
		flex-shrink: 0;
		width: 140px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem;
		border-left: 1px solid;
		background: rgba(0, 0, 0, 0.08);
	}

	.ops-title {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-align: center;
	}

	.ops-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15rem 0.4rem;
		align-items: center;
	}

	.ops-label {
		font-size: 0.55rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.ops-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.68rem;
		font-weight: 700;
		text-align: right;
		color: var(--color-text);
	}

	.ops-thrust {
		font-size: 0.55rem;
		line-height: 1.3;
	}

	.ops-fuel-section {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding-top: 0.25rem;
		border-top: 1px solid var(--color-border);
	}

	.ops-fuel-title {
		font-size: 0.45rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-dim);
		text-align: center;
	}

	.ops-fuel-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.ops-fuel-stage {
		font-size: 0.45rem;
		font-weight: 700;
		color: var(--color-text-dim);
		width: 1.5rem;
		text-align: right;
		flex-shrink: 0;
	}

	.ops-fuel-bar {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
		display: flex;
		background: var(--color-bg);
	}

	.ops-fuel-seg {
		height: 100%;
		opacity: 0.8;
		transition: width 0.2s;
	}

	.ops-prop-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem;
		justify-content: center;
		margin-top: 0.1rem;
	}

	.inv-title {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-align: center;
	}

	.inv-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15rem 0.4rem;
		align-items: center;
	}

	.inv-label {
		font-size: 0.55rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.inv-val {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		font-weight: 700;
		text-align: right;
	}
	.inv-val.none { color: #ef4444; }

	.inv-owned {
		font-size: 0.85rem;
	}

	.inv-actions {
		display: flex;
		gap: 0.3rem;
	}

	.inv-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.25rem 0;
		border-radius: 0.3rem;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-dim);
		font-size: 0.6rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.inv-btn:hover:not(:disabled) {
		background: var(--color-border);
		color: var(--color-text);
	}
	.inv-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.inv-btn-icon {
		font-weight: 700;
		font-size: 0.75rem;
		line-height: 1;
	}

	.inv-btn-text {
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.inv-maint {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.2rem;
		border-top: 1px solid var(--color-border);
	}

	.inv-maint-label {
		font-size: 0.45rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
	}

	.inv-maint-val {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		color: #fbbf24;
		font-weight: 600;
	}

	.inv-refurb {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.inv-refurb-label {
		font-size: 0.45rem;
		color: var(--color-text-dim);
		text-transform: uppercase;
	}

	.inv-refurb-val {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		color: #60a5fa;
		font-weight: 600;
	}

	.inv-home {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		padding-top: 0.15rem;
		border-top: 1px solid var(--color-border);
	}

	.inv-home-icon { font-size: 0.55rem; }

	.inv-home-name {
		font-size: 0.5rem;
		color: var(--color-text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.inv-home-name.locked { color: #ef4444; }

	.inv-home-hint {
		font-size: 0.45rem;
		color: #ef4444;
		font-style: italic;
		text-align: center;
	}

	/* ── Header summary ── */
	.inventory-summary {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.inventory-total {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 1.1rem;
		font-weight: 700;
		color: #4ade80;
	}

	.inventory-label {
		font-size: 0.7rem;
		color: var(--color-text-dim);
	}

	.inventory-sep {
		color: var(--color-border);
	}

	.inventory-cost {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		color: #fbbf24;
	}

	/* ── Propellant legend ── */
	.prop-chip {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.45rem;
		color: var(--color-text-dim);
	}

	.prop-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		display: inline-block;
	}
</style>
