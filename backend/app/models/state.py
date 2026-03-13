"""Game state models — the authoritative representation of the simulation."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Atmospheric composition (mol fractions, pressure, temperature)
# ---------------------------------------------------------------------------

class AtmosphereLayer(BaseModel):
    altitude_km: float = 0.0
    pressure_atm: float = 0.0
    temperature_c: float = 0.0
    co2_fraction: float = 0.0
    n2_fraction: float = 0.0
    o2_fraction: float = 0.0
    so2_fraction: float = 0.0
    h2o_fraction: float = 0.0
    ar_fraction: float = 0.0


class Atmosphere(BaseModel):
    total_mass_kg: float = 0.0
    surface_pressure_atm: float = 0.0
    surface_temp_c: float = 0.0
    layers: list[AtmosphereLayer] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Production & infrastructure
# ---------------------------------------------------------------------------

class ProductionCapacity(BaseModel):
    """Factorio-style production summary for a body."""
    mass_driver_count: int = 0
    mass_driver_throughput_kg_per_day: float = 0.0
    container_factory_count: int = 0
    containers_per_day: float = 0.0
    solar_collector_area_m2: float = 0.0
    power_output_mw: float = 0.0
    refinery_count: int = 0
    refined_material_kg_per_day: float = 0.0


class LaunchCapacity(BaseModel):
    """Payload-to-orbit capability."""
    launch_sites: int = 0
    max_payload_kg: float = 0.0
    launches_per_year: float = 0.0
    total_mass_to_orbit_kg_per_year: float = 0.0


# ---------------------------------------------------------------------------
# Per-body state
# ---------------------------------------------------------------------------

class CelestialBodyState(BaseModel):
    name: str
    atmosphere: Atmosphere = Field(default_factory=Atmosphere)
    production: ProductionCapacity = Field(default_factory=ProductionCapacity)
    launch_capacity: LaunchCapacity = Field(default_factory=LaunchCapacity)
    rocket_inventory: dict[str, int] = Field(default_factory=dict)
    population: int = 0
    unlocked: bool = False


# ---------------------------------------------------------------------------
# Top-level game state
# ---------------------------------------------------------------------------

class MilestoneStatus(BaseModel):
    lunar_mass_driver: bool = False
    venus_mass_driver: bool = False
    asteroid_harvesting: bool = False


class GameState(BaseModel):
    year: float = 2040.0
    tick: int = 0
    speed_multiplier: int = 1
    milestones: MilestoneStatus = Field(default_factory=MilestoneStatus)
    earth: CelestialBodyState = Field(default_factory=lambda: CelestialBodyState(
        name="Earth",
        unlocked=True,
        population=8_000_000_000,
        atmosphere=Atmosphere(
            total_mass_kg=5.15e18,
            surface_pressure_atm=1.0,
            surface_temp_c=15.0,
            layers=[AtmosphereLayer(
                altitude_km=0, pressure_atm=1.0, temperature_c=15.0,
                n2_fraction=0.7808, o2_fraction=0.2095, ar_fraction=0.0093,
                co2_fraction=0.0004, h2o_fraction=0.01,
            )],
        ),
        launch_capacity=LaunchCapacity(
            launch_sites=5, max_payload_kg=150_000,
            launches_per_year=50, total_mass_to_orbit_kg_per_year=5_000_000,
        ),
        rocket_inventory={
            "Starship / Super Heavy": 1,
            "Falcon Heavy": 1,
            "Falcon 9 Block 5": 1,
            "SLS Block 2": 1,
            "New Glenn": 1,
            "Vulcan Centaur": 1,
            "Long March 9": 1,
            "Ariane 6 (A64)": 1,
            "Neutron": 1,
            "Terran R": 1,
        },
    ))
    moon: CelestialBodyState = Field(default_factory=lambda: CelestialBodyState(
        name="Moon",
        unlocked=True,
        atmosphere=Atmosphere(
            total_mass_kg=0.0,
            surface_pressure_atm=0.0,
            surface_temp_c=-20.0,
        ),
    ))
    venus: CelestialBodyState = Field(default_factory=lambda: CelestialBodyState(
        name="Venus",
        unlocked=False,
        atmosphere=Atmosphere(
            total_mass_kg=4.8e20,
            surface_pressure_atm=92.0,
            surface_temp_c=464.0,
            layers=[
                AtmosphereLayer(altitude_km=0, pressure_atm=92.0, temperature_c=464.0,
                                co2_fraction=0.965, n2_fraction=0.035, so2_fraction=0.00015),
                AtmosphereLayer(altitude_km=50, pressure_atm=1.0, temperature_c=75.0,
                                co2_fraction=0.965, n2_fraction=0.035, so2_fraction=0.00015),
                AtmosphereLayer(altitude_km=60, pressure_atm=0.23, temperature_c=-10.0,
                                co2_fraction=0.965, n2_fraction=0.035, so2_fraction=0.00015),
                AtmosphereLayer(altitude_km=70, pressure_atm=0.04, temperature_c=-43.0,
                                co2_fraction=0.965, n2_fraction=0.035, so2_fraction=0.00015),
            ],
        ),
    ))
    mars: CelestialBodyState = Field(default_factory=lambda: CelestialBodyState(
        name="Mars",
        unlocked=False,
        atmosphere=Atmosphere(
            total_mass_kg=2.5e16,
            surface_pressure_atm=0.006,
            surface_temp_c=-63.0,
            layers=[AtmosphereLayer(
                altitude_km=0, pressure_atm=0.006, temperature_c=-63.0,
                co2_fraction=0.953, n2_fraction=0.027, ar_fraction=0.016,
                o2_fraction=0.0013,
            )],
        ),
    ))
    asteroids: CelestialBodyState = Field(default_factory=lambda: CelestialBodyState(
        name="Asteroid Belt",
        unlocked=False,
    ))
