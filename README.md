# VenMars: Tri-World Project

**A hardcore planetary engineering simulator — strip Venus' atmosphere, thicken Mars', create two new habitable worlds.**

---

## Premise

Earth is one habitable world. Venus has a crushing 92-atmosphere CO₂ envelope and 460°C surface. Mars has a wisp of atmosphere at 0.6% of Earth's sea-level pressure. The solution: move part of Venus' atmosphere to Mars — reducing Venus to a livable pressure while giving Mars the mass it needs for a thick, warm atmosphere, and precipiate out the rest. The player orchestrates this megaproject across decades, optimizing mass transfer, energy budgets, orbital mechanics, atmospheric chemistry, and climate evolution to terraform two planets simultaneously at the lowest possible delta-v and energy cost in the shortest time.

---

## Simulation Scope

### Phase 1 — Earth Launch & Lunar Infrastructure
- Design and operate Earth-based launch systems (chemical, electromagnetic) to deliver payloads to the Moon.
- Construct a **lunar electromagnetic mass driver** on the surface using lunar regolith-derived materials.
- Use the mass driver to launch bulk construction material to cislunar space at negligible propellant cost.

### Phase 2 — Orbital & Interplanetary Platforms
- Assemble large **orbital construction platforms** in cislunar space from mass-driver payloads.
- Build interplanetary transfer vessels, solar-thermal tugs, and autonomous construction drones.
- Establish Venus-orbit and Mars-orbit staging infrastructure.

### Phase 3 — Venus Atmospheric Harvesting
- Deploy **floating mass drivers** into Venus' upper atmosphere (~50–60 km altitude, ~1 atm, ~30°C).
- Harvest atmospheric gas (primarily CO₂, with N₂, SO₂, H₂O traces) via ram-scoop intakes.
- Compress harvested gas into high-pressure **carbon-composite containers** manufactured in situ from atmospheric carbon.
- Power all operations with concentrated **solar energy** — Venus receives ~2,600 W/m² at cloud-top, roughly twice Earth's irradiance.

### Phase 4 — Ballistic Transfer to Mars
- Launch sealed containers from Venus floating mass drivers on **ballistic trajectories** calculated to intersect Mars' atmosphere.
- Containers are designed to **disintegrate on atmospheric entry**, releasing:
  - Compressed gases (CO₂, N₂, SO₂, trace volatiles) directly into the Martian atmosphere.
  - Particulate rain of carbon composites and calciumite fragments that settle to the surface.
- Each launch window exploits Venus–Mars synodic geometry to minimize delta-v.
- Manage container stream density to avoid catastrophic Martian surface bombardment.

### Phase 5 — Atmospheric & Climate Management
- Model the evolving atmospheres of both planets in real time:
  - **Venus:** Pressure drop, temperature decrease, cloud-layer changes, eventual surface habitability window.
  - **Mars:** Pressure rise, greenhouse warming, polar cap sublimation feedback, dust storm dynamics, water-cycle emergence.
- Handle side effects and failure modes:
  - Sulfuric acid rain on Mars from transferred SO₂.
  - Atmospheric escape from Mars' low gravity and weak magnetosphere.
  - Thermal runaway or stall on either world.
  - Orbital perturbation of container streams by Jupiter/Sun.
  - Political, funding, and supply-chain constraints from Earth.

---

## Core Simulation Systems

| System | Description |
|---|---|
| **Orbital Mechanics** | Patched-conic and n-body trajectory planning for container streams; launch window optimization; synodic period scheduling. |
| **Atmospheric Physics** | Real-gas equations of state; radiative transfer; convective modeling; photochemistry for CO₂/N₂/SO₂/H₂O atmospheres. |
| **Structural Engineering** | Mass driver design parameters; floating platform buoyancy in Venus atmosphere; container pressure vessel engineering. |
| **Energy Budget** | Solar flux modeling at Venus and Mars distances; mass driver power draw; ISRU energy costs; waste heat management. |
| **ISRU (In-Situ Resource Utilization)** | Carbon extraction from CO₂; composite fabrication; container manufacturing rates; feedstock logistics. |
| **Climate Evolution** | Long-term greenhouse modeling; albedo feedback; volatile outgassing; polar cap dynamics; ocean formation thresholds. |
| **Delta-V & Mass Accounting** | Rigorous tracking of every kg launched, transferred, and delivered; propellant-free mass driver economics vs. chemical alternatives. |
| **Timeline & Scheduling** | Multi-decade project phasing; parallel construction streams; critical-path analysis. |

---

## Player Objectives

1. **Minimize total energy expenditure** across all phases.
2. **Minimize total delta-v budget** by exploiting mass drivers, gravity assists, and optimal transfer windows.
3. **Minimize calendar time** from first Earth launch to dual-habitability threshold.
4. **Maximize atmospheric delivery efficiency** — ratio of gas delivered to Mars vs. gas harvested at Venus.
5. **Manage side effects** — keep sulfur contamination, surface bombardment damage, and atmospheric escape within acceptable bounds on both worlds.
6. **Achieve habitability targets** (comfortable human range):
   - Venus surface pressure 0.8–1.2 atm, surface temperature 0–40°C.
   - Mars surface pressure 0.8–1.2 atm, mean surface temperature 0–25°C.

---

## Key Design Principles

- **Hard science.** All physics, chemistry, and orbital mechanics use real models and published data. No handwaving, no fictional materials.
- **Systems engineering.** The player is an engineer-optimizer, not a god-mode terraformer. Every kilogram and joule is tracked.
- **Emergent complexity.** Simple subsystem models interact to produce complex, realistic macro-scale behavior — atmospheric feedback loops, supply chain bottlenecks, cascade failures.
- **No single right answer.** Multiple viable strategies exist (e.g., higher launch cadence vs. larger containers; direct Venus–Mars Hohmann vs. gravity-assist trajectories; early nitrogen separation vs. bulk transfer).

---

## Technical Reference Data

| Parameter | Venus | Mars |
|---|---|---|
| Surface pressure | 92 atm (9.2 MPa) | 0.006 atm (610 Pa) |
| Surface temperature | 464°C | −63°C (mean) |
| Atmosphere composition | 96.5% CO₂, 3.5% N₂ | 95.3% CO₂, 2.7% N₂ |
| Atmospheric mass | 4.8 × 10²⁰ kg | 2.5 × 10¹⁶ kg |
| Surface gravity | 8.87 m/s² | 3.72 m/s² |
| Solar irradiance (top of atm) | 2,601 W/m² | 589 W/m² |
| Escape velocity | 10.36 km/s | 5.03 km/s |
| Orbital period | 224.7 days | 687.0 days |
| Synodic period (Venus–Mars) | ~334 days | — |

---

## Project Status

Early design phase — defining simulation architecture, physics models, and core game loop.

---

## License

TBD
