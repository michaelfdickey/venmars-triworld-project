import { writable } from 'svelte/store';

export type GameScreen = 'title' | 'playing';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const difficulty = writable<Difficulty>('medium');

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
export interface RocketDef {
	id: string;
	name: string;
	provider: string;
	status: 'operational' | 'development';
	payloadLEO: number;          // kg to LEO
	payloadGTO: number;
	payloadTLI: number;
	fairingVolume_m3: number;
	costPerLaunch: number;       // $M per launch
	purchaseCostM: number;       // $M to buy one vehicle
	reusable: boolean;
	stages: number;
	height: number;
	diameter: number;
	propellant: string;
	thrust: number;              // kN total at liftoff
	color: string;
	shape: 'single' | 'triple' | 'wide-dual' | 'srb';
	homeBase: string;            // launch complex id (manufacturing location)
	globalInventory: number;     // how many exist in the world
	// Annual maintenance per owned vehicle
	maintenanceCostM: number;    // $M/yr per vehicle
	maintenanceMaterials: { material: string; amountMt: number }[];
}

export const rocketDefs: RocketDef[] = [
	{
		id: 'starship', name: 'Starship / Super Heavy', provider: 'SpaceX',
		status: 'operational', payloadLEO: 150000, payloadGTO: 21000, payloadTLI: 50000,
		fairingVolume_m3: 1000, costPerLaunch: 10, purchaseCostM: 250, reusable: true,
		stages: 2, height: 121, diameter: 9, propellant: 'LCH₄ / LOX', thrust: 74500,
		color: '#3b82f6', shape: 'wide-dual', homeBase: 'starbase', globalInventory: 8,
		maintenanceCostM: 15, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0005 }, { material: 'Inconel / Superalloys', amountMt: 0.00008 },
			{ material: 'Electricity', amountMt: 0.12 },
		],
	},
	{
		id: 'falcon-heavy', name: 'Falcon Heavy', provider: 'SpaceX',
		status: 'operational', payloadLEO: 63800, payloadGTO: 26700, payloadTLI: 16000,
		fairingVolume_m3: 145, costPerLaunch: 97, purchaseCostM: 180, reusable: true,
		stages: 2, height: 70, diameter: 3.66, propellant: 'RP-1 / LOX', thrust: 22819,
		color: '#60a5fa', shape: 'triple', homeBase: 'ksc-39a', globalInventory: 5,
		maintenanceCostM: 12, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0003 }, { material: 'Aluminum', amountMt: 0.00015 },
			{ material: 'Electricity', amountMt: 0.06 },
		],
	},
	{
		id: 'falcon-9', name: 'Falcon 9 Block 5', provider: 'SpaceX',
		status: 'operational', payloadLEO: 22800, payloadGTO: 8300, payloadTLI: 4020,
		fairingVolume_m3: 145, costPerLaunch: 67, purchaseCostM: 120, reusable: true,
		stages: 2, height: 70, diameter: 3.66, propellant: 'RP-1 / LOX', thrust: 7607,
		color: '#93c5fd', shape: 'single', homeBase: 'ccafs-40', globalInventory: 18,
		maintenanceCostM: 8, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0002 }, { material: 'Aluminum', amountMt: 0.0001 },
			{ material: 'Electricity', amountMt: 0.04 },
		],
	},
	{
		id: 'sls', name: 'SLS Block 2', provider: 'NASA / Boeing',
		status: 'operational', payloadLEO: 130000, payloadGTO: 42000, payloadTLI: 46000,
		fairingVolume_m3: 830, costPerLaunch: 2200, purchaseCostM: 2500, reusable: false,
		stages: 2, height: 111, diameter: 8.4, propellant: 'LH₂ / LOX + SRBs', thrust: 39144,
		color: '#f97316', shape: 'srb', homeBase: 'ksc-39a', globalInventory: 3,
		maintenanceCostM: 85, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.001 }, { material: 'Concrete / Cement', amountMt: 0.002 },
			{ material: 'Electricity', amountMt: 0.25 },
		],
	},
	{
		id: 'new-glenn', name: 'New Glenn', provider: 'Blue Origin',
		status: 'operational', payloadLEO: 45000, payloadGTO: 13000, payloadTLI: 8000,
		fairingVolume_m3: 400, costPerLaunch: 68, purchaseCostM: 200, reusable: true,
		stages: 2, height: 98, diameter: 7, propellant: 'LCH₄ / LOX (S1) + LH₂ / LOX (S2)', thrust: 17100,
		color: '#06b6d4', shape: 'wide-dual', homeBase: 'ccafs-40', globalInventory: 4,
		maintenanceCostM: 14, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0004 }, { material: 'Aluminum', amountMt: 0.0002 },
			{ material: 'Electricity', amountMt: 0.08 },
		],
	},
	{
		id: 'vulcan', name: 'Vulcan Centaur', provider: 'ULA',
		status: 'operational', payloadLEO: 27200, payloadGTO: 14400, payloadTLI: 7700,
		fairingVolume_m3: 172, costPerLaunch: 110, purchaseCostM: 160, reusable: false,
		stages: 2, height: 62, diameter: 5.4, propellant: 'LCH₄ / LOX + SRBs', thrust: 11060,
		color: '#fbbf24', shape: 'srb', homeBase: 'ccafs-40', globalInventory: 6,
		maintenanceCostM: 10, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0002 }, { material: 'Aluminum', amountMt: 0.0001 },
			{ material: 'Electricity', amountMt: 0.05 },
		],
	},
	{
		id: 'long-march-9', name: 'Long March 9', provider: 'CASC (China)',
		status: 'operational', payloadLEO: 150000, payloadGTO: 50000, payloadTLI: 53000,
		fairingVolume_m3: 900, costPerLaunch: 500, purchaseCostM: 800, reusable: false,
		stages: 3, height: 114, diameter: 10.6, propellant: 'Kerolox (S1) + LH₂ / LOX (S2/S3)', thrust: 57840,
		color: '#ef4444', shape: 'srb', homeBase: 'wenchang', globalInventory: 2,
		maintenanceCostM: 45, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0008 }, { material: 'Concrete / Cement', amountMt: 0.001 },
			{ material: 'Electricity', amountMt: 0.18 },
		],
	},
	{
		id: 'ariane-6', name: 'Ariane 6 (A64)', provider: 'ArianeGroup (ESA)',
		status: 'operational', payloadLEO: 21650, payloadGTO: 11500, payloadTLI: 4500,
		fairingVolume_m3: 180, costPerLaunch: 115, purchaseCostM: 150, reusable: false,
		stages: 2, height: 63, diameter: 5.4, propellant: 'LH₂ / LOX + SRBs', thrust: 8000,
		color: '#8b5cf6', shape: 'srb', homeBase: 'kourou', globalInventory: 5,
		maintenanceCostM: 9, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.00015 }, { material: 'Aluminum', amountMt: 0.0001 },
			{ material: 'Electricity', amountMt: 0.04 },
		],
	},
	{
		id: 'neutron', name: 'Neutron', provider: 'Rocket Lab',
		status: 'operational', payloadLEO: 13000, payloadGTO: 3000, payloadTLI: 1500,
		fairingVolume_m3: 100, costPerLaunch: 50, purchaseCostM: 80, reusable: true,
		stages: 2, height: 43, diameter: 4.6, propellant: 'LCH₄ / LOX', thrust: 6900,
		color: '#10b981', shape: 'single', homeBase: 'vandenberg', globalInventory: 7,
		maintenanceCostM: 5, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.0001 }, { material: 'Carbon Fiber', amountMt: 0.00005 },
			{ material: 'Electricity', amountMt: 0.02 },
		],
	},
	{
		id: 'terran-r', name: 'Terran R', provider: 'Relativity Space',
		status: 'development', payloadLEO: 33500, payloadGTO: 12000, payloadTLI: 5500,
		fairingVolume_m3: 160, costPerLaunch: 55, purchaseCostM: 100, reusable: true,
		stages: 2, height: 66, diameter: 5, propellant: 'LCH₄ / LOX', thrust: 11000,
		color: '#a78bfa', shape: 'single', homeBase: 'ccafs-40', globalInventory: 1,
		maintenanceCostM: 6, maintenanceMaterials: [
			{ material: 'Steel', amountMt: 0.00012 }, { material: 'Inconel / Superalloys', amountMt: 0.00004 },
			{ material: 'Electricity', amountMt: 0.03 },
		],
	},
];

// VenMars program rocket inventory: rocket id → count owned
export const rocketInventory = writable<Record<string, number>>({});
