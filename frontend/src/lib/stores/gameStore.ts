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
export const spendingAllocations = writable<number[]>([85, 210, 45, 120, 65, 55, 95, 40, 30, 75]);
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
];

// Persistent material allocations (% of global production) — survives tab switches
export const materialAllocations = writable<number[]>(
	materialDefs.map((_, i) => {
		const defaults = [0.02, 0.15, 0.03, 8.0, 0.08, 0.5, 1.2, 12.0, 22.0, 0.001, 0.01, 0.005, 0.002, 60.0, 35.0, 25.0];
		return defaults[i] ?? 0;
	})
);

// Helper: compute cost in $B for a material at a given allocation %
export function materialCostB(matIndex: number, pct: number): number {
	const m = materialDefs[matIndex];
	return (m.globalMt * (pct / 100) * m.costPerMt) / 1000;
}
