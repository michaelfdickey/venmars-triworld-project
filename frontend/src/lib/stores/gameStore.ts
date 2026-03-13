import { writable } from 'svelte/store';

export type GameScreen = 'title' | 'playing';

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
