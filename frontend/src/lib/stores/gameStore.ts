import { writable, derived } from 'svelte/store';

export type GameScreen = 'title' | 'playing';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const difficulty = writable<Difficulty>('medium');

// ── Simulation clock ─────────────────────────────────────────────
// Game epoch: Jan 1 2030 00:00 UTC.  gameTime = hours elapsed since epoch.
export const GAME_EPOCH = new Date(Date.UTC(2030, 0, 1, 0, 0, 0));

export const gameTime = writable<number>(0); // hours since epoch

export interface SpeedPreset {
	id: string;
	label: string;
	hoursPerSecond: number; // 0 = paused
}

export const speedPresets: SpeedPreset[] = [
	{ id: 'paused',    label: '⏸ Paused',    hoursPerSecond: 0 },
	{ id: 'realtime',  label: '▶ Real Time', hoursPerSecond: 1 / 3600 },  // 1 real-second = 1 game-second
	{ id: '1min',      label: '⏩ 1 min/f',   hoursPerSecond: 1 / 60 * 60 },  // 1 minute per frame @ 60fps → 60 min/s = 1 hr/s
];

export const simSpeedIndex = writable<number>(0); // index into speedPresets, default paused
export const simSpeed = derived(simSpeedIndex, idx => speedPresets[idx]?.hoursPerSecond ?? 0);

// Derive a calendar date from gameTime
export function gameTimeToDate(hours: number): Date {
	return new Date(GAME_EPOCH.getTime() + hours * 3600_000);
}

// Format: "2030.01.01 00:00:00"  →  YYYY.MM.DD HH:MM:SS
export function formatGameTimestamp(hours: number): string {
	const d = gameTimeToDate(hours);
	const yyyy = d.getUTCFullYear();
	const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(d.getUTCDate()).padStart(2, '0');
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const min = String(d.getUTCMinutes()).padStart(2, '0');
	const ss = String(d.getUTCSeconds()).padStart(2, '0');
	return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}`;
}

export const difficultyConfig: Record<Difficulty, {
	label: string;
	gdpPercent: number;
	annualBudgetB: number;
	description: string;
}> = {
	easy:   { label: 'Easy',   gdpPercent: 2.0, annualBudgetB: 2120, description: '2% of global GDP (~$2.1T/yr)' },
	medium: { label: 'Medium', gdpPercent: 1.0, annualBudgetB: 1060, description: '1% of global GDP (~$1.06T/yr)' },
	hard:   { label: 'Hard',   gdpPercent: 0.5, annualBudgetB: 530,  description: '0.5% of global GDP (~$530B/yr)' },
};

export const gameScreen = writable<GameScreen>('title');

export interface GameState {
	year: number;
	tick: number;
	speed_multiplier: number;
	milestones: {
		lunar_mass_driver: boolean;
		venus_mass_driver: boolean;
		asteroid_harvesting: boolean;
	};
	earth: BodyState;
	moon: BodyState;
	venus: BodyState;
	mars: BodyState;
	asteroids: BodyState;
}

export interface BodyState {
	name: string;
	unlocked: boolean;
	population: number;
	atmosphere: {
		total_mass_kg: number;
		surface_pressure_atm: number;
		surface_temp_c: number;
		layers: AtmosphereLayer[];
	};
	production: {
		mass_driver_count: number;
		mass_driver_throughput_kg_per_day: number;
		container_factory_count: number;
		containers_per_day: number;
		solar_collector_area_m2: number;
		power_output_mw: number;
		refinery_count: number;
		refined_material_kg_per_day: number;
	};
	launch_capacity: {
		launch_sites: number;
		max_payload_kg: number;
		launches_per_year: number;
		total_mass_to_orbit_kg_per_year: number;
	};
}

export interface AtmosphereLayer {
	altitude_km: number;
	pressure_atm: number;
	temperature_c: number;
	co2_fraction: number;
	n2_fraction: number;
	o2_fraction: number;
	so2_fraction: number;
	h2o_fraction: number;
	ar_fraction: number;
}

export const gameState = writable<GameState | null>(null);
export const activeTab = writable<string>('earth');

// Persistent spending allocations (survive tab switches)
export const spendingAllocations = writable<number[]>([85, 210, 45, 120, 65, 55, 95, 40, 30, 75, 35]);
export const spendingReserves = writable<number>(320);

// Claimed launch complexes (by site id)
export const claimedComplexes = writable<Set<string>>(new Set());

// Launch complex cost registry (id → annualOpCostM in $M)
// Used by SpendingTab to compute cost demand on Launch Infrastructure
export const launchComplexCosts: Record<string, { name: string; costM: number }> = {
	'ksc-39a':      { name: 'Kennedy SC (LC-39A)',    costM: 450 },
	'ccafs-40':     { name: 'Cape Canaveral (SLC-40)', costM: 320 },
	'baikonur':     { name: 'Baikonur Cosmodrome',    costM: 280 },
	'vandenberg':   { name: 'Vandenberg SFB',         costM: 310 },
	'xichang':      { name: 'Xichang SLC',            costM: 180 },
	'wenchang':     { name: 'Wenchang SLS',           costM: 220 },
	'jiuquan':      { name: 'Jiuquan SLC',            costM: 160 },
	'sriharikota':  { name: 'Satish Dhawan SC',       costM: 120 },
	'kourou':       { name: 'Guiana Space Centre',    costM: 350 },
	'starbase':     { name: 'Starbase Boca Chica',    costM: 380 },
};

// ── Launch complex detailed profiles ───────────────────────────────
// Construction materials, plus costs/materials for each operational state
export interface ComplexMaterialItem { material: string; amountMt: number }
export interface ComplexStateProfile {
	costM: number;                  // $M/yr
	electricityTWh: number;         // TWh/yr
	materials: ComplexMaterialItem[];
}
export interface ComplexRecycleProfile {
	recoveryM: number;              // $M recovered
	materials: ComplexMaterialItem[]; // materials recovered
}
export interface LaunchComplexProfile {
	name: string;
	construction: ComplexMaterialItem[];   // one-time build materials
	active: ComplexStateProfile;           // regularly scheduled launches
	idle: ComplexStateProfile;             // claimed, waiting for schedules
	decommissioned: ComplexStateProfile;   // closed up, can reopen
	recycled: ComplexRecycleProfile;       // dismantled, resources recovered
}

export const launchComplexProfiles: Record<string, LaunchComplexProfile> = {
	'ksc-39a': {
		name: 'Kennedy SC (LC-39A)',
		construction: [
			{ material: 'Steel', amountMt: 0.025 }, { material: 'Concrete / Cement', amountMt: 0.080 },
			{ material: 'Copper', amountMt: 0.003 }, { material: 'Aluminum', amountMt: 0.008 },
			{ material: 'Carbon Fiber', amountMt: 0.0004 },
		],
		active: {
			costM: 450, electricityTWh: 2.1,
			materials: [
				{ material: 'Steel', amountMt: 0.012 }, { material: 'Concrete / Cement', amountMt: 0.05 },
				{ material: 'Copper', amountMt: 0.0008 }, { material: 'Aluminum', amountMt: 0.003 },
			],
		},
		idle: {
			costM: 180, electricityTWh: 0.6,
			materials: [
				{ material: 'Steel', amountMt: 0.003 }, { material: 'Concrete / Cement', amountMt: 0.008 },
			],
		},
		decommissioned: {
			costM: 35, electricityTWh: 0.05,
			materials: [],
		},
		recycled: {
			recoveryM: 280,
			materials: [
				{ material: 'Steel', amountMt: 0.018 }, { material: 'Copper', amountMt: 0.002 },
				{ material: 'Aluminum', amountMt: 0.005 },
			],
		},
	},
	'ccafs-40': {
		name: 'Cape Canaveral (SLC-40)',
		construction: [
			{ material: 'Steel', amountMt: 0.018 }, { material: 'Concrete / Cement', amountMt: 0.055 },
			{ material: 'Copper', amountMt: 0.002 }, { material: 'Aluminum', amountMt: 0.005 },
		],
		active: {
			costM: 320, electricityTWh: 1.8,
			materials: [
				{ material: 'Steel', amountMt: 0.008 }, { material: 'Concrete / Cement', amountMt: 0.03 },
				{ material: 'Copper', amountMt: 0.0005 }, { material: 'Aluminum', amountMt: 0.002 },
			],
		},
		idle: {
			costM: 130, electricityTWh: 0.5,
			materials: [
				{ material: 'Steel', amountMt: 0.002 }, { material: 'Concrete / Cement', amountMt: 0.006 },
			],
		},
		decommissioned: {
			costM: 28, electricityTWh: 0.04,
			materials: [],
		},
		recycled: {
			recoveryM: 200,
			materials: [
				{ material: 'Steel', amountMt: 0.013 }, { material: 'Copper', amountMt: 0.0015 },
				{ material: 'Aluminum', amountMt: 0.003 },
			],
		},
	},
	'baikonur': {
		name: 'Baikonur Cosmodrome',
		construction: [
			{ material: 'Steel', amountMt: 0.030 }, { material: 'Concrete / Cement', amountMt: 0.120 },
			{ material: 'Copper', amountMt: 0.002 },
		],
		active: {
			costM: 280, electricityTWh: 1.5,
			materials: [
				{ material: 'Steel', amountMt: 0.015 }, { material: 'Concrete / Cement', amountMt: 0.08 },
				{ material: 'Copper', amountMt: 0.0006 },
			],
		},
		idle: {
			costM: 110, electricityTWh: 0.4,
			materials: [
				{ material: 'Steel', amountMt: 0.004 }, { material: 'Concrete / Cement', amountMt: 0.015 },
			],
		},
		decommissioned: {
			costM: 25, electricityTWh: 0.03,
			materials: [],
		},
		recycled: {
			recoveryM: 160,
			materials: [
				{ material: 'Steel', amountMt: 0.022 }, { material: 'Copper', amountMt: 0.0015 },
			],
		},
	},
	'vandenberg': {
		name: 'Vandenberg SFB',
		construction: [
			{ material: 'Steel', amountMt: 0.016 }, { material: 'Concrete / Cement', amountMt: 0.050 },
			{ material: 'Copper', amountMt: 0.002 }, { material: 'Aluminum', amountMt: 0.004 },
		],
		active: {
			costM: 310, electricityTWh: 1.6,
			materials: [
				{ material: 'Steel', amountMt: 0.007 }, { material: 'Concrete / Cement', amountMt: 0.025 },
				{ material: 'Copper', amountMt: 0.0004 },
			],
		},
		idle: {
			costM: 125, electricityTWh: 0.45,
			materials: [
				{ material: 'Steel', amountMt: 0.002 }, { material: 'Concrete / Cement', amountMt: 0.005 },
			],
		},
		decommissioned: {
			costM: 25, electricityTWh: 0.03,
			materials: [],
		},
		recycled: {
			recoveryM: 190,
			materials: [
				{ material: 'Steel', amountMt: 0.012 }, { material: 'Copper', amountMt: 0.0015 },
				{ material: 'Aluminum', amountMt: 0.003 },
			],
		},
	},
	'xichang': {
		name: 'Xichang SLC',
		construction: [
			{ material: 'Steel', amountMt: 0.012 }, { material: 'Concrete / Cement', amountMt: 0.065 },
			{ material: 'Copper', amountMt: 0.001 },
		],
		active: {
			costM: 180, electricityTWh: 1.2,
			materials: [
				{ material: 'Steel', amountMt: 0.006 }, { material: 'Concrete / Cement', amountMt: 0.04 },
			],
		},
		idle: {
			costM: 70, electricityTWh: 0.3,
			materials: [
				{ material: 'Steel', amountMt: 0.0015 }, { material: 'Concrete / Cement', amountMt: 0.008 },
			],
		},
		decommissioned: {
			costM: 15, electricityTWh: 0.02,
			materials: [],
		},
		recycled: {
			recoveryM: 90,
			materials: [
				{ material: 'Steel', amountMt: 0.009 }, { material: 'Copper', amountMt: 0.0008 },
			],
		},
	},
	'wenchang': {
		name: 'Wenchang SLS',
		construction: [
			{ material: 'Steel', amountMt: 0.020 }, { material: 'Concrete / Cement', amountMt: 0.060 },
			{ material: 'Copper', amountMt: 0.002 }, { material: 'Aluminum', amountMt: 0.005 },
		],
		active: {
			costM: 220, electricityTWh: 1.4,
			materials: [
				{ material: 'Steel', amountMt: 0.009 }, { material: 'Concrete / Cement', amountMt: 0.035 },
				{ material: 'Aluminum', amountMt: 0.002 },
			],
		},
		idle: {
			costM: 90, electricityTWh: 0.35,
			materials: [
				{ material: 'Steel', amountMt: 0.002 }, { material: 'Concrete / Cement', amountMt: 0.007 },
			],
		},
		decommissioned: {
			costM: 20, electricityTWh: 0.03,
			materials: [],
		},
		recycled: {
			recoveryM: 130,
			materials: [
				{ material: 'Steel', amountMt: 0.015 }, { material: 'Copper', amountMt: 0.0015 },
				{ material: 'Aluminum', amountMt: 0.003 },
			],
		},
	},
	'jiuquan': {
		name: 'Jiuquan SLC',
		construction: [
			{ material: 'Steel', amountMt: 0.010 }, { material: 'Concrete / Cement', amountMt: 0.055 },
			{ material: 'Copper', amountMt: 0.001 },
		],
		active: {
			costM: 160, electricityTWh: 1.0,
			materials: [
				{ material: 'Steel', amountMt: 0.005 }, { material: 'Concrete / Cement', amountMt: 0.03 },
			],
		},
		idle: {
			costM: 65, electricityTWh: 0.25,
			materials: [
				{ material: 'Steel', amountMt: 0.0012 }, { material: 'Concrete / Cement', amountMt: 0.006 },
			],
		},
		decommissioned: {
			costM: 12, electricityTWh: 0.02,
			materials: [],
		},
		recycled: {
			recoveryM: 80,
			materials: [
				{ material: 'Steel', amountMt: 0.007 }, { material: 'Copper', amountMt: 0.0008 },
			],
		},
	},
	'sriharikota': {
		name: 'Satish Dhawan SC',
		construction: [
			{ material: 'Steel', amountMt: 0.008 }, { material: 'Concrete / Cement', amountMt: 0.040 },
			{ material: 'Copper', amountMt: 0.001 },
		],
		active: {
			costM: 120, electricityTWh: 0.8,
			materials: [
				{ material: 'Steel', amountMt: 0.004 }, { material: 'Concrete / Cement', amountMt: 0.02 },
			],
		},
		idle: {
			costM: 50, electricityTWh: 0.2,
			materials: [
				{ material: 'Steel', amountMt: 0.001 }, { material: 'Concrete / Cement', amountMt: 0.004 },
			],
		},
		decommissioned: {
			costM: 10, electricityTWh: 0.015,
			materials: [],
		},
		recycled: {
			recoveryM: 60,
			materials: [
				{ material: 'Steel', amountMt: 0.006 }, { material: 'Copper', amountMt: 0.0007 },
			],
		},
	},
	'kourou': {
		name: 'Guiana Space Centre',
		construction: [
			{ material: 'Steel', amountMt: 0.022 }, { material: 'Concrete / Cement', amountMt: 0.070 },
			{ material: 'Copper', amountMt: 0.003 }, { material: 'Aluminum', amountMt: 0.007 },
			{ material: 'Carbon Fiber', amountMt: 0.0003 },
		],
		active: {
			costM: 350, electricityTWh: 1.7,
			materials: [
				{ material: 'Steel', amountMt: 0.01 }, { material: 'Concrete / Cement', amountMt: 0.04 },
				{ material: 'Aluminum', amountMt: 0.003 },
			],
		},
		idle: {
			costM: 140, electricityTWh: 0.5,
			materials: [
				{ material: 'Steel', amountMt: 0.003 }, { material: 'Concrete / Cement', amountMt: 0.008 },
			],
		},
		decommissioned: {
			costM: 30, electricityTWh: 0.04,
			materials: [],
		},
		recycled: {
			recoveryM: 220,
			materials: [
				{ material: 'Steel', amountMt: 0.016 }, { material: 'Copper', amountMt: 0.002 },
				{ material: 'Aluminum', amountMt: 0.005 },
			],
		},
	},
	'starbase': {
		name: 'Starbase Boca Chica',
		construction: [
			{ material: 'Steel', amountMt: 0.035 }, { material: 'Concrete / Cement', amountMt: 0.095 },
			{ material: 'Copper', amountMt: 0.004 }, { material: 'Aluminum', amountMt: 0.010 },
			{ material: 'Carbon Fiber', amountMt: 0.0006 },
		],
		active: {
			costM: 380, electricityTWh: 2.5,
			materials: [
				{ material: 'Steel', amountMt: 0.02 }, { material: 'Concrete / Cement', amountMt: 0.06 },
				{ material: 'Copper', amountMt: 0.001 }, { material: 'Aluminum', amountMt: 0.005 },
			],
		},
		idle: {
			costM: 155, electricityTWh: 0.7,
			materials: [
				{ material: 'Steel', amountMt: 0.005 }, { material: 'Concrete / Cement', amountMt: 0.012 },
			],
		},
		decommissioned: {
			costM: 32, electricityTWh: 0.05,
			materials: [],
		},
		recycled: {
			recoveryM: 310,
			materials: [
				{ material: 'Steel', amountMt: 0.025 }, { material: 'Copper', amountMt: 0.003 },
				{ material: 'Aluminum', amountMt: 0.007 },
			],
		},
	},
};

// ── Material allocation store ──────────────────────────────────────
// Spending category indices:
//   0: Launch Infrastructure, 1: Rocket Manufacturing, 2: Propellant Production,
//   3: Payload Production, 4: R&D, 5: Mining & Extraction,
//   6: Refining & Materials, 7: Skilled Labor, 8: Mission Ops, 9: Spaceport Construction

export interface MaterialDef {
	name: string;
	globalMt: number;
	costPerMt: number;  // $M per Mt
	color: string;
	spendingCategoryIndex: number;  // which spending category this cost falls under
}

// Material definitions with spending category mapping
export const materialDefs: MaterialDef[] = [
	{ name: 'Steel',                 globalMt: 1950,    costPerMt: 800,     color: '#a78bfa', spendingCategoryIndex: 5 },
	{ name: 'Aluminum',              globalMt: 70,      costPerMt: 2400,    color: '#38bdf8', spendingCategoryIndex: 5 },
	{ name: 'Copper',                globalMt: 25,      costPerMt: 8500,    color: '#f97316', spendingCategoryIndex: 5 },
	{ name: 'Titanium',              globalMt: 0.24,    costPerMt: 35000,   color: '#818cf8', spendingCategoryIndex: 5 },
	{ name: 'Nickel',                globalMt: 3.3,     costPerMt: 18000,   color: '#a3a3a3', spendingCategoryIndex: 5 },
	{ name: 'Silicon (Electronic)',   globalMt: 0.6,     costPerMt: 50000,   color: '#22d3ee', spendingCategoryIndex: 6 },
	{ name: 'Rare Earth Elements',   globalMt: 0.35,    costPerMt: 120000,  color: '#e879f9', spendingCategoryIndex: 5 },
	{ name: 'Carbon Fiber',          globalMt: 0.18,    costPerMt: 25000,   color: '#4ade80', spendingCategoryIndex: 6 },
	{ name: 'Inconel / Superalloys', globalMt: 0.08,    costPerMt: 80000,   color: '#fb923c', spendingCategoryIndex: 6 },
	{ name: 'Concrete / Cement',     globalMt: 4100,    costPerMt: 120,     color: '#78716c', spendingCategoryIndex: 6 },
	{ name: 'LOX',                   globalMt: 450,     costPerMt: 150,     color: '#67e8f9', spendingCategoryIndex: 2 },
	{ name: 'LH₂',                  globalMt: 94,      costPerMt: 3000,    color: '#fca5a5', spendingCategoryIndex: 2 },
	{ name: 'LCH₄',                 globalMt: 180,     costPerMt: 600,     color: '#86efac', spendingCategoryIndex: 2 },
	{ name: 'RP-1 Kerosene',         globalMt: 0.05,    costPerMt: 1200,    color: '#fde047', spendingCategoryIndex: 2 },
	{ name: 'Hydrazine',             globalMt: 0.03,    costPerMt: 45000,   color: '#f87171', spendingCategoryIndex: 2 },
	{ name: 'Xenon',                 globalMt: 0.00004, costPerMt: 3500000, color: '#c4b5fd', spendingCategoryIndex: 2 },
	{ name: 'Electricity',           globalMt: 29000,   costPerMt: 50,      color: '#facc15', spendingCategoryIndex: 10 },  // globalMt = TWh/yr, costPerMt = $M/TWh
];

// Persistent material allocations (% of global production) — survives tab switches
export const materialAllocations = writable<number[]>(
	materialDefs.map((_, i) => {
		const defaults = [0.02, 0.15, 0.03, 8.0, 0.08, 0.5, 1.2, 12.0, 22.0, 0.001, 0.01, 0.005, 0.002, 60.0, 35.0, 25.0, 0.05];
		return defaults[i] ?? 0;
	})
);

// Helper: compute cost in $B for a material at a given allocation %
export function materialCostB(matIndex: number, pct: number): number {
	const m = materialDefs[matIndex];
	return (m.globalMt * (pct / 100) * m.costPerMt) / 1000;
}

// ── Consumption data ──────────────────────────────────────────────
// Consumption category indices mirror spending categories (0-10)
// Each consumption demand item is { name, material, amountMt, color }

export interface ConsumptionDemandItem {
	name: string;        // source label e.g. "Kennedy SC (LC-39A)"
	material: string;    // material name e.g. "Steel"
	amountMt: number;    // annual consumption in Mt (or TWh for electricity)
	color: string;
}

// Material consumption profiles per launch complex (annual, in tonnes unless TWh)
// Only ongoing maintenance materials — propellant demands are driven by scheduled launches
export interface LaunchComplexConsumption {
	name: string;
	maintenance: { material: string; amountMt: number }[];  // ongoing facility upkeep
	perLaunch: { material: string; amountMt: number }[];    // consumed per launch (future use)
}

export const launchComplexConsumption: Record<string, LaunchComplexConsumption> = {
	'ksc-39a':      { name: 'Kennedy SC (LC-39A)',    maintenance: [
		{ material: 'Steel', amountMt: 0.012 }, { material: 'Concrete / Cement', amountMt: 0.05 },
		{ material: 'Electricity', amountMt: 2.1 },
		{ material: 'Copper', amountMt: 0.0008 }, { material: 'Aluminum', amountMt: 0.003 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.019 }, { material: 'LCH₄', amountMt: 0.0075 },
		{ material: 'RP-1 Kerosene', amountMt: 0.00033 },
	] },
	'ccafs-40':     { name: 'Cape Canaveral (SLC-40)', maintenance: [
		{ material: 'Steel', amountMt: 0.008 }, { material: 'Concrete / Cement', amountMt: 0.03 },
		{ material: 'Electricity', amountMt: 1.8 },
		{ material: 'Copper', amountMt: 0.0005 }, { material: 'Aluminum', amountMt: 0.002 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.00875 }, { material: 'RP-1 Kerosene', amountMt: 0.0003 },
		{ material: 'LCH₄', amountMt: 0.0025 },
	] },
	'baikonur':     { name: 'Baikonur Cosmodrome',    maintenance: [
		{ material: 'Steel', amountMt: 0.015 }, { material: 'Concrete / Cement', amountMt: 0.08 },
		{ material: 'Electricity', amountMt: 1.5 },
		{ material: 'Copper', amountMt: 0.0006 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.0139 }, { material: 'RP-1 Kerosene', amountMt: 0.00056 },
		{ material: 'Hydrazine', amountMt: 0.000022 },
	] },
	'vandenberg':   { name: 'Vandenberg SFB',         maintenance: [
		{ material: 'Steel', amountMt: 0.007 }, { material: 'Concrete / Cement', amountMt: 0.025 },
		{ material: 'Electricity', amountMt: 1.6 },
		{ material: 'Copper', amountMt: 0.0004 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.01 }, { material: 'RP-1 Kerosene', amountMt: 0.000367 },
		{ material: 'LCH₄', amountMt: 0.00267 },
	] },
	'xichang':      { name: 'Xichang SLC',            maintenance: [
		{ material: 'Steel', amountMt: 0.006 }, { material: 'Concrete / Cement', amountMt: 0.04 },
		{ material: 'Electricity', amountMt: 1.2 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.01 }, { material: 'LH₂', amountMt: 0.002 },
		{ material: 'Hydrazine', amountMt: 0.00002 },
	] },
	'wenchang':     { name: 'Wenchang SLS',           maintenance: [
		{ material: 'Steel', amountMt: 0.009 }, { material: 'Concrete / Cement', amountMt: 0.035 },
		{ material: 'Electricity', amountMt: 1.4 },
		{ material: 'Aluminum', amountMt: 0.002 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.0133 }, { material: 'LH₂', amountMt: 0.00333 },
		{ material: 'LCH₄', amountMt: 0.004 },
	] },
	'jiuquan':      { name: 'Jiuquan SLC',            maintenance: [
		{ material: 'Steel', amountMt: 0.005 }, { material: 'Concrete / Cement', amountMt: 0.03 },
		{ material: 'Electricity', amountMt: 1.0 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.008 }, { material: 'RP-1 Kerosene', amountMt: 0.000333 },
		{ material: 'Hydrazine', amountMt: 0.0000133 },
	] },
	'sriharikota':  { name: 'Satish Dhawan SC',       maintenance: [
		{ material: 'Steel', amountMt: 0.004 }, { material: 'Concrete / Cement', amountMt: 0.02 },
		{ material: 'Electricity', amountMt: 0.8 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.0067 }, { material: 'LH₂', amountMt: 0.00133 },
		{ material: 'Hydrazine', amountMt: 0.0000333 },
	] },
	'kourou':       { name: 'Guiana Space Centre',    maintenance: [
		{ material: 'Steel', amountMt: 0.01 }, { material: 'Concrete / Cement', amountMt: 0.04 },
		{ material: 'Electricity', amountMt: 1.7 },
		{ material: 'Aluminum', amountMt: 0.003 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.0187 }, { material: 'LH₂', amountMt: 0.004 },
		{ material: 'Hydrazine', amountMt: 0.00004 },
	] },
	'starbase':     { name: 'Starbase Boca Chica',    maintenance: [
		{ material: 'Steel', amountMt: 0.02 }, { material: 'Concrete / Cement', amountMt: 0.06 },
		{ material: 'Electricity', amountMt: 2.5 },
		{ material: 'Copper', amountMt: 0.001 }, { material: 'Aluminum', amountMt: 0.005 },
	], perLaunch: [
		{ material: 'LOX', amountMt: 0.025 }, { material: 'LCH₄', amountMt: 0.0125 },
	] },
};

// ── Rocket definitions & inventory ────────────────────────────────
export type ReuseMode = 'expendable' | 'booster-reuse' | 'full-reuse';

export interface PayloadByOrbit {
	LEO: number;   // kg to Low Earth Orbit
	GTO: number;   // kg to Geostationary Transfer Orbit
	TLI: number;   // kg to Trans-Lunar Injection
}

export interface RocketDef {
	id: string;
	name: string;
	provider: string;
	status: 'operational' | 'development';
	payloadLEO: number;          // kg to LEO (default / best-mode shorthand)
	payloadGTO: number;
	payloadTLI: number;
	payloadByMode: Record<ReuseMode, PayloadByOrbit | null>;
	fairingVolume_m3: number;
	fairingDiameter_m: number;   // inner usable diameter of payload fairing
	costPerLaunch: number;       // $M per launch
	purchaseCostM: number;       // $M to buy one vehicle
	reusable: boolean;
	stages: number;
	height: number;
	diameter: number;
	propellant: string;
	thrust: number;              // kN total at liftoff
	maxDeltaV_ms: number;        // m/s max ΔV with zero payload (structural limit)
	dryMass_kg: number;          // effective structural mass (all stages) for Tsiolkovsky model
	propellantMass_kg: number;   // effective total propellant mass for Tsiolkovsky model
	maxGs: number;               // max structural G-load (acceleration limit)
	maxQ_kPa: number;            // max dynamic pressure during ascent (kPa)
	color: string;
	shape: 'single' | 'triple' | 'wide-dual' | 'srb';
	homeBase: string;            // launch complex id (manufacturing location)
	globalInventory: number;     // how many exist in the world
	// Annual maintenance per owned vehicle
	maintenanceCostM: number;    // $M/yr per vehicle
	maintenanceMaterials: { material: string; amountMt: number }[];
	// Refurbishment (reusable rockets only)
	refurbishmentDays: number;   // days to refurbish after landing (0 = expendable)
	refurbishmentCostM: number;  // $M per refurbishment cycle
}

export const reuseModeLabels: Record<ReuseMode, string> = {
	'expendable': 'Expendable',
	'booster-reuse': 'Booster Reuse',
	'full-reuse': 'Fully Reusable',
};

export const rocketDefs: RocketDef[] = [
	{
		id: 'starship', name: 'Starship / Super Heavy', provider: 'SpaceX',
		status: 'operational', payloadLEO: 150000, payloadGTO: 21000, payloadTLI: 50000,
		payloadByMode: {
			'expendable':    { LEO: 250000, GTO: 60000,  TLI: 100000 },
			'booster-reuse': { LEO: 150000, GTO: 35000,  TLI: 50000 },
			'full-reuse':    { LEO: 100000, GTO: 21000,  TLI: 30000 },
		},
		fairingVolume_m3: 1000, fairingDiameter_m: 8.0, costPerLaunch: 10, purchaseCostM: 250, reusable: true,
		stages: 2, height: 121, diameter: 9, propellant: 'LCH₄ / LOX', thrust: 74500,
		maxDeltaV_ms: 11800, dryMass_kg: 230500, propellantMass_kg: 5882200, maxGs: 3.5, maxQ_kPa: 35,
		color: '#3b82f6', shape: 'wide-dual', homeBase: 'starbase', globalInventory: 8,
		maintenanceCostM: 15, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0005 }, { material: 'Inconel / Superalloys', amountMt: 0.00008 },
			{ material: 'Electricity', amountMt: 0.12 },
		],
		refurbishmentDays: 30, refurbishmentCostM: 2,
	},
	{
		id: 'falcon-heavy', name: 'Falcon Heavy', provider: 'SpaceX',
		status: 'operational', payloadLEO: 63800, payloadGTO: 26700, payloadTLI: 16000,
		payloadByMode: {
			'expendable':    { LEO: 63800,  GTO: 26700, TLI: 16800 },
			'booster-reuse': { LEO: 50000,  GTO: 20000, TLI: 12000 },
			'full-reuse':    null,
		},
		fairingVolume_m3: 145, fairingDiameter_m: 5.2, costPerLaunch: 97, purchaseCostM: 180, reusable: true,
		stages: 2, height: 70, diameter: 3.66, propellant: 'RP-1 / LOX', thrust: 22819,
		maxDeltaV_ms: 12500, dryMass_kg: 36600, propellantMass_kg: 1581600, maxGs: 5.0, maxQ_kPa: 40,
		color: '#60a5fa', shape: 'triple', homeBase: 'ksc-39a', globalInventory: 5,
		maintenanceCostM: 12, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0003 }, { material: 'Aluminum', amountMt: 0.00015 },
			{ material: 'Electricity', amountMt: 0.06 },
		],
		refurbishmentDays: 45, refurbishmentCostM: 8,
	},
	{
		id: 'falcon-9', name: 'Falcon 9 Block 5', provider: 'SpaceX',
		status: 'operational', payloadLEO: 22800, payloadGTO: 8300, payloadTLI: 4020,
		payloadByMode: {
			'expendable':    { LEO: 22800, GTO: 8300, TLI: 4020 },
			'booster-reuse': { LEO: 15600, GTO: 5500, TLI: 2700 },
			'full-reuse':    null,
		},
		fairingVolume_m3: 145, fairingDiameter_m: 5.2, costPerLaunch: 67, purchaseCostM: 120, reusable: true,
		stages: 2, height: 70, diameter: 3.66, propellant: 'RP-1 / LOX', thrust: 7607,
		maxDeltaV_ms: 11200, dryMass_kg: 27500, propellantMass_kg: 792700, maxGs: 6.0, maxQ_kPa: 40,
		color: '#93c5fd', shape: 'single', homeBase: 'ccafs-40', globalInventory: 18,
		maintenanceCostM: 8, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0002 }, { material: 'Aluminum', amountMt: 0.0001 },
			{ material: 'Electricity', amountMt: 0.04 },
		],
		refurbishmentDays: 30, refurbishmentCostM: 5,
	},
	{
		id: 'sls', name: 'SLS Block 2', provider: 'NASA / Boeing',
		status: 'operational', payloadLEO: 130000, payloadGTO: 42000, payloadTLI: 46000,
		payloadByMode: {
			'expendable':    { LEO: 130000, GTO: 42000, TLI: 46000 },
			'booster-reuse': null,
			'full-reuse':    null,
		},
		fairingVolume_m3: 830, fairingDiameter_m: 8.4, costPerLaunch: 2200, purchaseCostM: 2500, reusable: false,
		stages: 2, height: 111, diameter: 8.4, propellant: 'LH₂ / LOX + SRBs', thrust: 39144,
		maxDeltaV_ms: 13200, dryMass_kg: 75600, propellantMass_kg: 1677000, maxGs: 3.0, maxQ_kPa: 33,
		color: '#f97316', shape: 'srb', homeBase: 'ksc-39a', globalInventory: 3,
		maintenanceCostM: 85, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.001 }, { material: 'Concrete / Cement', amountMt: 0.002 },
			{ material: 'Electricity', amountMt: 0.25 },
		],
		refurbishmentDays: 0, refurbishmentCostM: 0,
	},
	{
		id: 'new-glenn', name: 'New Glenn', provider: 'Blue Origin',
		status: 'operational', payloadLEO: 45000, payloadGTO: 13000, payloadTLI: 8000,
		payloadByMode: {
			'expendable':    { LEO: 45000, GTO: 13000, TLI: 8000 },
			'booster-reuse': { LEO: 38000, GTO: 11000, TLI: 6500 },
			'full-reuse':    null,
		},
		fairingVolume_m3: 400, fairingDiameter_m: 7.0, costPerLaunch: 68, purchaseCostM: 200, reusable: true,
		stages: 2, height: 98, diameter: 7, propellant: 'LCH₄ / LOX (S1) + LH₂ / LOX (S2)', thrust: 17100,
		maxDeltaV_ms: 12000, dryMass_kg: 38500, propellantMass_kg: 947400, maxGs: 4.0, maxQ_kPa: 38,
		color: '#06b6d4', shape: 'wide-dual', homeBase: 'ccafs-40', globalInventory: 4,
		maintenanceCostM: 14, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0004 }, { material: 'Aluminum', amountMt: 0.0002 },
			{ material: 'Electricity', amountMt: 0.08 },
		],
		refurbishmentDays: 60, refurbishmentCostM: 10,
	},
	{
		id: 'vulcan', name: 'Vulcan Centaur', provider: 'ULA',
		status: 'operational', payloadLEO: 27200, payloadGTO: 14400, payloadTLI: 7700,
		payloadByMode: {
			'expendable':    { LEO: 27200, GTO: 14400, TLI: 7700 },
			'booster-reuse': null,
			'full-reuse':    null,
		},
		fairingVolume_m3: 172, fairingDiameter_m: 5.4, costPerLaunch: 110, purchaseCostM: 160, reusable: false,
		stages: 2, height: 62, diameter: 5.4, propellant: 'LCH₄ / LOX + SRBs', thrust: 11060,
		maxDeltaV_ms: 11800, dryMass_kg: 27500, propellantMass_kg: 538900, maxGs: 5.5, maxQ_kPa: 38,
		color: '#fbbf24', shape: 'srb', homeBase: 'ccafs-40', globalInventory: 6,
		maintenanceCostM: 10, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0002 }, { material: 'Aluminum', amountMt: 0.0001 },
			{ material: 'Electricity', amountMt: 0.05 },
		],
		refurbishmentDays: 0, refurbishmentCostM: 0,
	},
	{
		id: 'long-march-9', name: 'Long March 9', provider: 'CASC (China)',
		status: 'operational', payloadLEO: 150000, payloadGTO: 50000, payloadTLI: 53000,
		payloadByMode: {
			'expendable':    { LEO: 150000, GTO: 50000, TLI: 53000 },
			'booster-reuse': null,
			'full-reuse':    null,
		},
		fairingVolume_m3: 900, fairingDiameter_m: 9.5, costPerLaunch: 500, purchaseCostM: 800, reusable: false,
		stages: 3, height: 114, diameter: 10.6, propellant: 'Kerolox (S1) + LH₂ / LOX (S2/S3)', thrust: 57840,
		maxDeltaV_ms: 14000, dryMass_kg: 56000, propellantMass_kg: 2175400, maxGs: 4.5, maxQ_kPa: 36,
		color: '#ef4444', shape: 'srb', homeBase: 'wenchang', globalInventory: 2,
		maintenanceCostM: 45, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0008 }, { material: 'Concrete / Cement', amountMt: 0.001 },
			{ material: 'Electricity', amountMt: 0.18 },
		],
		refurbishmentDays: 0, refurbishmentCostM: 0,
	},
	{
		id: 'ariane-6', name: 'Ariane 6 (A64)', provider: 'ArianeGroup (ESA)',
		status: 'operational', payloadLEO: 21650, payloadGTO: 11500, payloadTLI: 4500,
		payloadByMode: {
			'expendable':    { LEO: 21650, GTO: 11500, TLI: 4500 },
			'booster-reuse': null,
			'full-reuse':    null,
		},
		fairingVolume_m3: 180, fairingDiameter_m: 5.4, costPerLaunch: 115, purchaseCostM: 150, reusable: false,
		stages: 2, height: 63, diameter: 5.4, propellant: 'LH₂ / LOX + SRBs', thrust: 8000,
		maxDeltaV_ms: 11500, dryMass_kg: 26600, propellantMass_kg: 445500, maxGs: 4.5, maxQ_kPa: 35,
		color: '#8b5cf6', shape: 'srb', homeBase: 'kourou', globalInventory: 5,
		maintenanceCostM: 9, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.00015 }, { material: 'Aluminum', amountMt: 0.0001 },
			{ material: 'Electricity', amountMt: 0.04 },
		],
		refurbishmentDays: 0, refurbishmentCostM: 0,
	},
	{
		id: 'neutron', name: 'Neutron', provider: 'Rocket Lab',
		status: 'operational', payloadLEO: 13000, payloadGTO: 3000, payloadTLI: 1500,
		payloadByMode: {
			'expendable':    { LEO: 15000, GTO: 4000, TLI: 2000  },
			'booster-reuse': { LEO: 13000, GTO: 3000, TLI: 1500  },
			'full-reuse':    null,
		},
		fairingVolume_m3: 100, fairingDiameter_m: 4.5, costPerLaunch: 50, purchaseCostM: 80, reusable: true,
		stages: 2, height: 43, diameter: 4.6, propellant: 'LCH₄ / LOX', thrust: 6900,
		maxDeltaV_ms: 10800, dryMass_kg: 26100, propellantMass_kg: 544400, maxGs: 6.0, maxQ_kPa: 42,
		color: '#10b981', shape: 'single', homeBase: 'vandenberg', globalInventory: 7,
		maintenanceCostM: 5, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0001 }, { material: 'Carbon Fiber', amountMt: 0.00005 },
			{ material: 'Electricity', amountMt: 0.02 },
		],
		refurbishmentDays: 21, refurbishmentCostM: 3,
	},
	{
		id: 'terran-r', name: 'Terran R', provider: 'Relativity Space',
		status: 'development', payloadLEO: 33500, payloadGTO: 12000, payloadTLI: 5500,
		payloadByMode: {
			'expendable':    { LEO: 33500, GTO: 12000, TLI: 5500 },
			'booster-reuse': { LEO: 25000, GTO: 9000,  TLI: 4000 },
			'full-reuse':    { LEO: 18000, GTO: 6000,  TLI: 2500 },
		},
		fairingVolume_m3: 160, fairingDiameter_m: 5.0, costPerLaunch: 55, purchaseCostM: 100, reusable: true,
		stages: 2, height: 66, diameter: 5, propellant: 'LCH₄ / LOX', thrust: 11000,
		maxDeltaV_ms: 11500, dryMass_kg: 35600, propellantMass_kg: 916000, maxGs: 5.0, maxQ_kPa: 40,
		color: '#a78bfa', shape: 'single', homeBase: 'ccafs-40', globalInventory: 1,
		maintenanceCostM: 6, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.00012 }, { material: 'Inconel / Superalloys', amountMt: 0.00004 },
			{ material: 'Electricity', amountMt: 0.03 },
		],
		refurbishmentDays: 45, refurbishmentCostM: 6,
	},
];

// VenMars program rocket inventory: rocket id → count owned
export const rocketInventory = writable<Record<string, number>>({});

// ── Scheduled missions (shared for map visualization) ─────────────
export interface MissionMapActivity {
	type: string;
	notes: string;
	targetAlt?: number;
	targetInc?: number;
	payloadName?: string;
}

export interface ScheduledMissionMapData {
	name: string;
	site: string;        // launch site name
	inclination: number; // degrees
	altitude: number;    // km (circular) or average for elliptical
	apoapsis: number;    // km
	periapsis: number;   // km
	circular: boolean;
	activities: MissionMapActivity[];
	reuseMode: ReuseMode;
}
export const scheduledMissionsStore = writable<ScheduledMissionMapData[]>([]);

// ── Earth material stockpiles ─────────────────────────────────────
// Index matches materialDefs.  Values in tonnes (except Electricity index 16 = MWh).
export const earthMaterialStockpiles = writable<number[]>(materialDefs.map(() => 0));

// Advance material stockpiles by deltaHours based on current allocations.
// Procurement rate = globalMt * (pct/100) Mt/year → tonnes/hour.
export function tickMaterials(deltaHours: number, allocations: number[]): void {
	const HOURS_PER_YEAR = 8766; // 365.25 * 24
	earthMaterialStockpiles.update(stockpiles => {
		for (let i = 0; i < materialDefs.length; i++) {
			const m = materialDefs[i];
			const pct = allocations[i] ?? 0;
			if (pct <= 0) continue;
			const mtPerYear = m.globalMt * (pct / 100);
			const mtPerHour = mtPerYear / HOURS_PER_YEAR;
			const tonnesPerHour = mtPerHour * 1_000_000; // 1 Mt = 1,000,000 t
			stockpiles[i] += tonnesPerHour * deltaHours;
		}
		return stockpiles;
	});
}

// ── Payload & Satellite definitions ────────────────────────────────
export type PayloadCategory = 'comms' | 'weather' | 'nav' | 'science' | 'imaging' | 'relay'
	| 'infrastructure' | 'habitat' | 'vehicle' | 'supply' | 'fuel'
	| 'terraforming' | 'mining' | 'factory' | 'transport' | 'probe';

export type DeployMethod = 'spin-stabilized' | 'propulsive' | 'docking' | 'electromagnetic' | 'cold-gas' | 'gravity-release';

export interface PayloadDef {
	id: string;
	name: string;
	icon: string;
	category: PayloadCategory;
	mass: number;            // kg
	volume: string;          // physical dimensions
	volume_m3: number;       // usable volume in m³
	diameter_m: number;      // widest cross-section in metres (must fit inside fairing)
	cost: number;            // $M per unit
	deltaV: number;          // m/s of onboard propulsion (0 = none)
	commRange: string;       // communication range descriptor
	lifespan: number;        // operational lifespan in years (0 = single-use)
	maxGs: number;           // max acceleration tolerance in g's (0 = no limit / bulk cargo)
	deployMethod: DeployMethod; // default deployment mechanism
	description: string;
	destinations: string[];
	density_kg_m3?: number;  // fuel only
}

export const payloadCategoryLabels: Record<PayloadCategory, string> = {
	comms: 'Communications',
	weather: 'Weather & Climate',
	nav: 'Navigation',
	science: 'Science & Survey',
	imaging: 'Imaging & Recon',
	relay: 'Deep-Space Relay',
	infrastructure: 'Orbital Infrastructure',
	habitat: 'Habitat Modules',
	vehicle: 'Vehicles & Landers',
	supply: 'Supply & Logistics',
	fuel: 'Fuel (Depot Fill)',
	terraforming: 'Terraforming Systems',
	mining: 'Mining & ISRU',
	factory: 'Orbital Manufacturing',
	transport: 'Cargo Transfer',
	probe: 'Probes & Drones',
};

export const payloadCategoryIcons: Record<PayloadCategory, string> = {
	comms: '📡',
	weather: '🌤️',
	nav: '🛰️',
	science: '🔭',
	imaging: '📸',
	relay: '📡',
	infrastructure: '🏗️',
	habitat: '🏠',
	vehicle: '🚀',
	supply: '📦',
	fuel: '⛽',
	terraforming: '🌍',
	mining: '⛏️',
	factory: '🏭',
	transport: '🚛',
	probe: '🎈',
};

// ── Market satellites (off-the-shelf) ────────────────────────────
export const marketSatellites: PayloadDef[] = [
	// Communications
	{
		id: 'geo-comms-heavy', name: 'GEO Comms Satellite (Heavy)', icon: '📡', category: 'comms',
		mass: 6500, volume: '4m × 2.5m × 2.5m', volume_m3: 25, diameter_m: 2.5, cost: 250,
		deltaV: 1800, commRange: '36,000 km (GEO coverage)', lifespan: 15, maxGs: 8, deployMethod: 'spin-stabilized',
		description: 'High-throughput Ka/V-band GEO satellite. 150 Gbps capacity. Industry standard for broadband.',
		destinations: ['GTO', 'GEO'],
	},
	{
		id: 'leo-comms-constellation', name: 'LEO Broadband Sat', icon: '📡', category: 'comms',
		mass: 260, volume: '1.1m × 0.7m × 0.3m', volume_m3: 0.23, diameter_m: 0.7, cost: 0.5,
		deltaV: 350, commRange: '550 km (LEO mesh)', lifespan: 5, maxGs: 15, deployMethod: 'cold-gas',
		description: 'Flat-pack LEO constellation satellite. Laser crosslinks, phased-array antennas. Bulk-buy discounts.',
		destinations: ['LEO'],
	},
	{
		id: 'meo-comms', name: 'MEO Comms Satellite', icon: '📡', category: 'comms',
		mass: 4200, volume: '3m × 2m × 2m', volume_m3: 12, diameter_m: 2.0, cost: 180,
		deltaV: 1200, commRange: '20,000 km (MEO)', lifespan: 12, maxGs: 10, deployMethod: 'spin-stabilized',
		description: 'Medium-orbit comms satellite for reduced latency. Military/commercial dual-use.',
		destinations: ['MEO'],
	},

	// Weather & Climate
	{
		id: 'geo-weather', name: 'GEO Weather Monitor', icon: '🌤️', category: 'weather',
		mass: 3500, volume: '3.5m × 2m × 2m', volume_m3: 14, diameter_m: 2.0, cost: 320,
		deltaV: 1600, commRange: '36,000 km (GEO)', lifespan: 10, maxGs: 8, deployMethod: 'spin-stabilized',
		description: 'Geostationary weather platform with multi-spectral imager and lightning mapper. GOES-class.',
		destinations: ['GTO', 'GEO'],
	},
	{
		id: 'leo-weather', name: 'Polar Weather Satellite', icon: '🌤️', category: 'weather',
		mass: 2200, volume: '2.5m × 1.5m × 1.5m', volume_m3: 5.6, diameter_m: 1.5, cost: 185,
		deltaV: 200, commRange: '850 km (LEO polar)', lifespan: 7, maxGs: 10, deployMethod: 'spin-stabilized',
		description: 'Sun-synchronous polar orbiter. Microwave sounder, IR radiometer, ozone mapper.',
		destinations: ['SSO'],
	},

	// Navigation
	{
		id: 'nav-constellation', name: 'Navigation Constellation Sat', icon: '🛰️', category: 'nav',
		mass: 1200, volume: '2m × 1m × 1m', volume_m3: 2, diameter_m: 1.0, cost: 45,
		deltaV: 400, commRange: '20,200 km (MEO)', lifespan: 12, maxGs: 12, deployMethod: 'spin-stabilized',
		description: 'Precision PNT satellite (GPS/Galileo-class). Atomic clocks, L-band broadcast.',
		destinations: ['MEO'],
	},
	{
		id: 'nav-augmentation', name: 'SBAS Augmentation Sat', icon: '🛰️', category: 'nav',
		mass: 2800, volume: '2.5m × 2m × 2m', volume_m3: 10, diameter_m: 2.0, cost: 120,
		deltaV: 1400, commRange: '36,000 km (GEO)', lifespan: 15, maxGs: 10, deployMethod: 'spin-stabilized',
		description: 'GEO-based augmentation satellite. Improves GPS accuracy to sub-meter for aviation & maritime.',
		destinations: ['GTO', 'GEO'],
	},

	// Science & Survey
	{
		id: 'earth-science', name: 'Earth Observation Platform', icon: '🔭', category: 'science',
		mass: 3800, volume: '3m × 2.5m × 2.5m', volume_m3: 18.75, diameter_m: 2.5, cost: 350,
		deltaV: 150, commRange: '700 km (LEO)', lifespan: 8, maxGs: 6, deployMethod: 'spin-stabilized',
		description: 'Multi-instrument EO satellite: SAR, hyperspectral, thermal. Climate monitoring & land survey.',
		destinations: ['LEO', 'SSO'],
	},
	{
		id: 'space-telescope', name: 'Optical Survey Telescope', icon: '🔭', category: 'science',
		mass: 5200, volume: '4m × 2m (folded)', volume_m3: 12.5, diameter_m: 2.0, cost: 800,
		deltaV: 100, commRange: '1.5M km (L2 deep-space)', lifespan: 20, maxGs: 4, deployMethod: 'propulsive',
		description: 'Space-based optical/IR telescope for planetary survey and asteroid tracking.',
		destinations: ['Earth-Sun L2', 'LEO'],
	},

	// Imaging
	{
		id: 'hr-imaging', name: 'High-Res Imaging Sat', icon: '📸', category: 'imaging',
		mass: 1500, volume: '2m × 1m × 1m', volume_m3: 2, diameter_m: 1.0, cost: 95,
		deltaV: 200, commRange: '600 km (LEO)', lifespan: 7, maxGs: 8, deployMethod: 'cold-gas',
		description: '30cm resolution optical + SAR imaging. Commercial Earth observation.',
		destinations: ['SSO', 'LEO'],
	},
	{
		id: 'radar-sat', name: 'SAR Radar Satellite', icon: '📸', category: 'imaging',
		mass: 2100, volume: '2.5m × 1.5m × 1.5m', volume_m3: 5.6, diameter_m: 1.5, cost: 160,
		deltaV: 180, commRange: '700 km (LEO)', lifespan: 7, maxGs: 10, deployMethod: 'spin-stabilized',
		description: 'Synthetic aperture radar. All-weather, day/night imaging capability.',
		destinations: ['SSO', 'LEO'],
	},

	// Deep-Space Relay
	{
		id: 'cislunar-relay', name: 'Cislunar Relay Satellite', icon: '📡', category: 'relay',
		mass: 800, volume: '1.5m × 1m × 1m', volume_m3: 1.5, diameter_m: 1.0, cost: 85,
		deltaV: 600, commRange: '400,000 km (Earth–Moon)', lifespan: 10, maxGs: 12, deployMethod: 'spin-stabilized',
		description: 'Lunar relay for far-side comms. Ka-band + optical crosslink to Earth ground stations.',
		destinations: ['Lunar Orbit', 'EML-2'],
	},
];

// ── VenMars project-specific payloads ────────────────────────────
export const venMarsPayloads: PayloadDef[] = [
	// Terraforming
	{
		id: 'venus-atmosphere-probe', name: 'Venus Atmosphere Probe', icon: '🎈', category: 'probe',
		mass: 800, volume: '1.5m sphere', volume_m3: 1.8, diameter_m: 1.5, cost: 95,
		deltaV: 0, commRange: '260M km (Venus relay)', lifespan: 0, maxGs: 40, deployMethod: 'gravity-release',
		description: 'Descent probe with spectrometers and pressure/temp sensors for Venus atmospheric profiling.',
		destinations: ['Venus Atmo'],
	},
	{
		id: 'mars-atmosphere-probe', name: 'Mars Atmosphere Probe', icon: '🎈', category: 'probe',
		mass: 650, volume: '1.2m capsule', volume_m3: 0.9, diameter_m: 1.2, cost: 75,
		deltaV: 0, commRange: '400M km (Mars relay)', lifespan: 0, maxGs: 30, deployMethod: 'gravity-release',
		description: 'Entry probe for Mars atmospheric density, composition, and dust profiling.',
		destinations: ['Mars Atmo'],
	},
	{
		id: 'venus-weather-monitor', name: 'Venus Weather Monitor', icon: '🌤️', category: 'weather',
		mass: 2800, volume: '3m × 2m × 2m', volume_m3: 12, diameter_m: 2.0, cost: 150,
		deltaV: 800, commRange: '260M km (Venus orbit)', lifespan: 8, maxGs: 8, deployMethod: 'spin-stabilized',
		description: 'Orbital weather platform tracking Venus atmospheric changes during terraforming operations.',
		destinations: ['Venus Orbit'],
	},
	{
		id: 'mars-weather-monitor', name: 'Mars Weather Monitor', icon: '🌤️', category: 'weather',
		mass: 2400, volume: '2.5m × 2m × 2m', volume_m3: 10, diameter_m: 2.0, cost: 140,
		deltaV: 600, commRange: '400M km (Mars orbit)', lifespan: 10, maxGs: 8, deployMethod: 'spin-stabilized',
		description: 'Monitors Mars pressure buildup, dust storms, and temperature evolution during terraforming.',
		destinations: ['Mars Orbit'],
	},
	{
		id: 'venus-comms-relay', name: 'Venus Comms Relay', icon: '📡', category: 'relay',
		mass: 4200, volume: '3.5m × 2m × 2m', volume_m3: 14, diameter_m: 2.0, cost: 280,
		deltaV: 1200, commRange: '260M km (Venus–Earth)', lifespan: 12, maxGs: 8, deployMethod: 'propulsive',
		description: 'Deep-space relay for Venus operations. Ka-band + optical laser link to Earth.',
		destinations: ['Venus Orbit'],
	},
	{
		id: 'mars-comms-relay', name: 'Mars Comms Relay', icon: '📡', category: 'relay',
		mass: 4500, volume: '3.5m × 2m × 2m', volume_m3: 14, diameter_m: 2.0, cost: 300,
		deltaV: 1000, commRange: '400M km (Mars–Earth)', lifespan: 15, maxGs: 8, deployMethod: 'propulsive',
		description: 'High-bandwidth Mars relay. Supports colony communications and science data return.',
		destinations: ['Mars Orbit'],
	},
	{
		id: 'mars-nav-sat', name: 'Mars Navigation Satellite', icon: '🛰️', category: 'nav',
		mass: 900, volume: '1.5m × 1m × 1m', volume_m3: 1.5, diameter_m: 1.0, cost: 55,
		deltaV: 300, commRange: '3,400 km (Mars areosynchronous)', lifespan: 10, maxGs: 12, deployMethod: 'spin-stabilized',
		description: 'Mars GPS-equivalent. 24-satellite constellation provides global positioning on Mars.',
		destinations: ['Mars Orbit'],
	},
	{
		id: 'venus-floating-drone', name: 'Venus Atmospheric Drone', icon: '🎈', category: 'probe',
		mass: 400, volume: '3m wingspan', volume_m3: 2, diameter_m: 1.5, cost: 65,
		deltaV: 0, commRange: '260M km (via relay)', lifespan: 2, maxGs: 6, deployMethod: 'gravity-release',
		description: 'Solar-powered VTOL drone for Venus cloud-layer surveys and atmospheric sampling at 50-55 km.',
		destinations: ['Venus Atmo'],
	},

	// Infrastructure
	{
		id: 'venus-floating-platform', name: 'Venus Floating Platform', icon: '🎈', category: 'infrastructure',
		mass: 15000, volume: '20m envelope', volume_m3: 200, diameter_m: 5.0, cost: 800,
		deltaV: 0, commRange: '1,000 km (local mesh)', lifespan: 20, maxGs: 4, deployMethod: 'gravity-release',
		description: 'Buoyant aerostat platform for Venus cloud layer. Foundation for habitats and ISRU equipment.',
		destinations: ['Venus Atmo'],
	},
	{
		id: 'fuel-depot', name: 'Fuel Depot Module', icon: '⛽', category: 'infrastructure',
		mass: 12000, volume: '8m × 4.5m (cylinder)', volume_m3: 127, diameter_m: 4.5, cost: 350,
		deltaV: 50, commRange: '2,000 km (local)', lifespan: 25, maxGs: 6, deployMethod: 'docking',
		description: 'Cryogenic propellant storage with solar cryo-coolers. Stores LOX, LH₂, or LCH₄.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Earth-Sun L2'],
	},
	{
		id: 'solar-power-array', name: 'Solar Power Array (Deployable)', icon: '☀️', category: 'infrastructure',
		mass: 8000, volume: '4m packed → 50m span', volume_m3: 18, diameter_m: 4.0, cost: 180,
		deltaV: 0, commRange: 'N/A', lifespan: 25, maxGs: 5, deployMethod: 'docking',
		description: '500 kW roll-out solar array. Powers stations, fuel depots, or mass drivers.',
		destinations: ['LEO', 'Lunar Orbit', 'Venus Orbit', 'Mars Orbit'],
	},
	{
		id: 'orbital-drydock', name: 'Orbital Drydock Truss', icon: '🏗️', category: 'infrastructure',
		mass: 25000, volume: '20m × 8m × 8m', volume_m3: 1280, diameter_m: 8.0, cost: 600,
		deltaV: 30, commRange: '2,000 km (local)', lifespan: 30, maxGs: 4, deployMethod: 'docking',
		description: 'Structural truss for on-orbit assembly of large spacecraft. Robotic arms included.',
		destinations: ['LEO', 'Lunar Orbit'],
	},
	{
		id: 'mass-driver-segment', name: 'Mass Driver Segment', icon: '⚡', category: 'infrastructure',
		mass: 18000, volume: '15m × 3m × 3m', volume_m3: 135, diameter_m: 3.0, cost: 420,
		deltaV: 0, commRange: 'N/A', lifespan: 30, maxGs: 6, deployMethod: 'docking',
		description: 'Electromagnetic accelerator section. 8 segments make one operational mass driver.',
		destinations: ['Lunar Surface', 'Venus Platform'],
	},
	{
		id: 'radiation-shield', name: 'Radiation Shield Array', icon: '🛡️', category: 'infrastructure',
		mass: 6000, volume: '5m × 5m panels', volume_m3: 25, diameter_m: 5.0, cost: 90,
		deltaV: 0, commRange: 'N/A', lifespan: 20, maxGs: 8, deployMethod: 'docking',
		description: 'Water-filled or polyethylene panels for crew radiation protection in deep space.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Transit'],
	},

	// Habitats
	{
		id: 'leo-habitat', name: 'LEO Habitat Module', icon: '🏠', category: 'habitat',
		mass: 20000, volume: '10m × 4.5m (pressurized)', volume_m3: 160, diameter_m: 4.5, cost: 450,
		deltaV: 0, commRange: '2,000 km (local)', lifespan: 30, maxGs: 4, deployMethod: 'docking',
		description: 'Standard pressurized crew module for 6. Life support, sleeping quarters, galley.',
		destinations: ['LEO'],
	},
	{
		id: 'lunar-habitat', name: 'Lunar Surface Habitat', icon: '🌑', category: 'habitat',
		mass: 15000, volume: '8m × 5m (deployable)', volume_m3: 157, diameter_m: 5.0, cost: 520,
		deltaV: 0, commRange: '400,000 km (via relay)', lifespan: 20, maxGs: 4, deployMethod: 'propulsive',
		description: 'Inflatable habitat with regolith radiation shielding anchors. Supports 4 crew for 180 days.',
		destinations: ['Lunar Surface'],
	},
	{
		id: 'venus-habitat', name: 'Venus Floating Habitat', icon: '🎈', category: 'habitat',
		mass: 9000, volume: '12m envelope + 4m gondola', volume_m3: 50, diameter_m: 4.0, cost: 680,
		deltaV: 0, commRange: '260M km (via relay)', lifespan: 10, maxGs: 3, deployMethod: 'gravity-release',
		description: 'Buoyant aerostat habitat for Venus cloud layer (50-55 km). Acid-resistant envelope. 4 crew.',
		destinations: ['Venus Atmo'],
	},
	{
		id: 'mars-habitat', name: 'Mars Surface Habitat', icon: '🔴', category: 'habitat',
		mass: 22000, volume: '10m × 6m (pressurized)', volume_m3: 283, diameter_m: 6.0, cost: 580,
		deltaV: 0, commRange: '400M km (via relay)', lifespan: 25, maxGs: 4, deployMethod: 'propulsive',
		description: 'Insulated & pressurized for Mars surface ops. ISRU water extraction, CO₂ filtration, 6 crew.',
		destinations: ['Mars Surface'],
	},
	{
		id: 'transit-habitat', name: 'Deep-Space Transit Hab', icon: '🚀', category: 'habitat',
		mass: 35000, volume: '12m × 5m (with centrifuge)', volume_m3: 236, diameter_m: 5.0, cost: 900,
		deltaV: 0, commRange: '400M km (deep-space)', lifespan: 20, maxGs: 3, deployMethod: 'docking',
		description: 'Long-duration crew module with partial-gravity centrifuge. For Earth–Mars or Earth–Venus transits.',
		destinations: ['Mars Transit', 'Venus Transit'],
	},

	// Vehicles & Landers
	{
		id: 'crew-capsule', name: 'Crew Reentry Vehicle', icon: '🛡️', category: 'vehicle',
		mass: 9000, volume: '5m × 3.5m (capsule)', volume_m3: 48, diameter_m: 3.5, cost: 210,
		deltaV: 50, commRange: '40,000 km (Earth vicinity)', lifespan: 1, maxGs: 6, deployMethod: 'propulsive',
		description: 'PICA-X heat shield capsule for Earth or Mars atmospheric reentry. 4–6 crew.',
		destinations: ['Earth Return', 'Mars Entry'],
	},
	{
		id: 'lunar-lander', name: 'Lunar Lander (Cargo)', icon: '🌑', category: 'vehicle',
		mass: 11000, volume: '7m × 4m', volume_m3: 88, diameter_m: 4.0, cost: 320,
		deltaV: 2500, commRange: '400,000 km (via relay)', lifespan: 0, maxGs: 8, deployMethod: 'propulsive',
		description: 'Autonomous cargo lander for lunar surface. 15t payload to surface from LLO.',
		destinations: ['Lunar Surface'],
	},
	{
		id: 'mars-lander', name: 'Mars Cargo Lander', icon: '🔴', category: 'vehicle',
		mass: 14000, volume: '8m × 5m', volume_m3: 157, diameter_m: 5.0, cost: 380,
		deltaV: 800, commRange: '400M km (via relay)', lifespan: 0, maxGs: 10, deployMethod: 'propulsive',
		description: 'Supersonic retro-propulsion lander for Mars. Delivers 20t to surface from Mars orbit.',
		destinations: ['Mars Surface'],
	},
	{
		id: 'ion-tug', name: 'Orbital Tug (Ion)', icon: '🔧', category: 'vehicle',
		mass: 3500, volume: '4m × 2m', volume_m3: 12.5, diameter_m: 2.0, cost: 140,
		deltaV: 8000, commRange: '2,000 km (local)', lifespan: 15, maxGs: 0.5, deployMethod: 'propulsive',
		description: 'Solar-electric propulsion tug for slow but efficient cargo transfers between orbits.',
		destinations: ['Cislunar', 'Earth–Mars Transfer'],
	},

	// Supply & Logistics
	{
		id: 'consumables-pod', name: 'Crew Consumables Pod', icon: '🍱', category: 'supply',
		mass: 6000, volume: '3m × 2.5m', volume_m3: 14.7, diameter_m: 2.5, cost: 35,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 10, deployMethod: 'cold-gas',
		description: 'Food, water, O₂, medical supplies for 6 crew × 90 days.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit'],
	},
	{
		id: 'isru-pack', name: 'ISRU Equipment Pack', icon: '⚙️', category: 'mining',
		mass: 8500, volume: '4m × 3m × 2m', volume_m3: 24, diameter_m: 3.0, cost: 200,
		deltaV: 0, commRange: 'N/A', lifespan: 10, maxGs: 8, deployMethod: 'cold-gas',
		description: 'In-situ resource processing: Sabatier reactor, electrolyzer, regolith oven, controls.',
		destinations: ['Lunar Surface', 'Mars Surface'],
	},
	{
		id: 'construction-pallet', name: 'Construction Material Pallet', icon: '🧱', category: 'supply',
		mass: 20000, volume: '4m × 4m × 3m (pallet)', volume_m3: 48, diameter_m: 4.0, cost: 25,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'gravity-release',
		description: 'Bulk structural materials: aluminum beams, fasteners, wiring, piping, insulation.',
		destinations: ['LEO', 'Lunar Surface', 'Mars Surface'],
	},
	{
		id: 'spare-parts', name: 'Spare Parts & Tools Kit', icon: '🔧', category: 'supply',
		mass: 3000, volume: '2m × 1.5m × 1m', volume_m3: 3, diameter_m: 1.5, cost: 40,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'cold-gas',
		description: 'Replacement pumps, valves, seals, electronics, and EVA tooling.',
		destinations: ['LEO', 'Lunar Surface', 'Mars Surface'],
	},
	{
		id: 'fission-reactor', name: 'Nuclear Fission Power Unit', icon: '☢️', category: 'supply',
		mass: 7500, volume: '3m × 2m (shielded)', volume_m3: 9.4, diameter_m: 2.0, cost: 500,
		deltaV: 0, commRange: 'N/A', lifespan: 30, maxGs: 6, deployMethod: 'propulsive',
		description: '40 kW fission reactor for surface ops where solar is limited (Mars night, polar, dust storms).',
		destinations: ['Lunar Surface', 'Mars Surface'],
	},

	// Fuel types
	{
		id: 'fuel-lox', name: 'LOX (Liquid Oxygen)', icon: '🧊', category: 'fuel',
		mass: 0, volume: 'Fills remaining fairing', volume_m3: 0, diameter_m: 0, cost: 0.2,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'gravity-release',
		description: 'Cryogenic oxidizer. High density. Used with LH₂, LCH₄, or RP-1.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
		density_kg_m3: 1141,
	},
	{
		id: 'fuel-lh2', name: 'LH₂ (Liquid Hydrogen)', icon: '💨', category: 'fuel',
		mass: 0, volume: 'Fills remaining fairing', volume_m3: 0, diameter_m: 0, cost: 0.8,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'gravity-release',
		description: 'Ultra-low density cryogenic fuel. Best Isp but volume-hungry.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
		density_kg_m3: 71,
	},
	{
		id: 'fuel-lch4', name: 'LCH₄ (Liquid Methane)', icon: '🔥', category: 'fuel',
		mass: 0, volume: 'Fills remaining fairing', volume_m3: 0, diameter_m: 0, cost: 0.5,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'gravity-release',
		description: 'Mid-density cryogenic fuel. ISRU-producible on Mars.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
		density_kg_m3: 423,
	},
	{
		id: 'fuel-rp1', name: 'RP-1 (Rocket-Grade Kerosene)', icon: '🛢️', category: 'fuel',
		mass: 0, volume: 'Fills remaining fairing', volume_m3: 0, diameter_m: 0, cost: 0.3,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'gravity-release',
		description: 'Dense storable hydrocarbon fuel. Easiest to handle but lower Isp.',
		destinations: ['LEO', 'Fuel Depot'],
		density_kg_m3: 820,
	},
	{
		id: 'fuel-hydrazine', name: 'Hydrazine (N₂H₄)', icon: '⚗️', category: 'fuel',
		mass: 0, volume: 'Fills remaining fairing', volume_m3: 0, diameter_m: 0, cost: 1.5,
		deltaV: 0, commRange: 'N/A', lifespan: 0, maxGs: 0, deployMethod: 'gravity-release',
		description: 'Storable hypergolic monopropellant. Dense but toxic.',
		destinations: ['LEO', 'Lunar Orbit', 'Mars Orbit', 'Fuel Depot'],
		density_kg_m3: 1021,
	},

	// Terraforming-specific
	{
		id: 'venus-atmosphere-processor', name: 'Venus Atmosphere Processor', icon: '🌍', category: 'terraforming',
		mass: 12000, volume: '6m × 4m × 4m', volume_m3: 96, diameter_m: 4.0, cost: 450,
		deltaV: 0, commRange: '1,000 km (local mesh)', lifespan: 15, maxGs: 5, deployMethod: 'propulsive',
		description: 'CO₂ cracker & sulfur scrubber for Venus cloud-top operations. Processes 500 t/day of atmosphere.',
		destinations: ['Venus Platform'],
	},
	{
		id: 'mars-greenhouse', name: 'Mars Greenhouse Module', icon: '🌱', category: 'terraforming',
		mass: 8000, volume: '10m × 5m × 3m', volume_m3: 150, diameter_m: 5.0, cost: 280,
		deltaV: 0, commRange: 'N/A', lifespan: 20, maxGs: 4, deployMethod: 'propulsive',
		description: 'Pressurized greenhouse for Mars food production. Supplements ISRU oxygen generation.',
		destinations: ['Mars Surface'],
	},
	{
		id: 'solar-mirror', name: 'Orbital Solar Mirror', icon: '☀️', category: 'terraforming',
		mass: 2000, volume: '2m packed → 100m span', volume_m3: 6, diameter_m: 2.0, cost: 150,
		deltaV: 200, commRange: '50,000 km (formation)', lifespan: 25, maxGs: 5, deployMethod: 'spin-stabilized',
		description: 'Deployable reflective film mirror for redirecting sunlight to Mars polar caps.',
		destinations: ['Mars Orbit'],
	},
];

// ── Custom (designed) payloads ────────────────────────────────────
export const customPayloads = writable<PayloadDef[]>([]);

// Payload inventory: payload id → count owned/ordered
export const payloadInventory = writable<Record<string, number>>({});

// Reserved payloads: payload id → count allocated to scheduled missions
export const reservedPayloads = writable<Record<string, number>>({});

// Reserved rockets: rocket id → count allocated to scheduled missions
export const reservedRockets = writable<Record<string, number>>({});
