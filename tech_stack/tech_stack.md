# Technology Stack

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         SvelteKit + TypeScript                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  D3.js   │ │  Pixi.js │ │ Observable Plot  │ │
│  │ (orbits, │ │ (canvas  │ │ (charts, stats)  │ │
│  │  maps)   │ │  render) │ │                  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│              Tailwind CSS                        │
└────────────┬──────────────────┬──────────────────┘
             │ REST (CRUD)      │ WebSocket (sim state)
             ▼                  ▼
┌─────────────────────────────────────────────────┐
│                   Backend                        │
│               FastAPI (Python)                   │
│  ┌──────────────────────────────────────────┐   │
│  │         Simulation Engine                 │   │
│  │  NumPy · SciPy · Numba · Polars          │   │
│  │  (orbital, atmospheric, climate models)   │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │  Persistence  │  │  Scheduling / Events   │   │
│  │  SQLite/JSON  │  │  SimPy patterns        │   │
│  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Backend — Python 3.12+

### API Framework

| Package | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥0.110 | REST + WebSocket API server |
| **Uvicorn** | ≥0.29 | ASGI server for FastAPI |
| **Pydantic** | ≥2.6 | Request/response validation, simulation config schemas |

- REST endpoints for CRUD: save/load simulations, player configuration, scenario definitions.
- WebSocket endpoints for real-time simulation state streaming to the frontend.
- Auto-generated OpenAPI docs at `/docs`.

### Core Math & Science

| Package | Version | Purpose |
|---|---|---|
| **NumPy** | ≥1.26 | Array math, linear algebra, core numerical ops |
| **SciPy** | ≥1.12 | ODE solvers (atmospheric evolution), Lambert problem solvers (orbital transfers), optimization (delta-v minimization), interpolation |
| **Numba** | ≥0.59 | JIT compilation for hot-path simulation loops — atmospheric column integration, batch trajectory computation, n-body stepping |
| **Polars** | ≥0.20 | Fast DataFrames for mass accounting ledgers, time-series atmospheric data, launch manifests, statistical analysis |

### Simulation Engine

| Component | Approach |
|---|---|
| **Tick loop** | Fixed-timestep physics loop running server-side; configurable dt from hours to days depending on phase |
| **Event scheduling** | SimPy-style discrete events for launch windows, construction milestones, orbital encounters |
| **State management** | Immutable snapshot per tick; frontend subscribes to latest snapshot via WebSocket |
| **Headless mode** | Engine runs without frontend for batch optimization, Monte Carlo analysis, automated testing |

### Persistence

| Package | Purpose |
|---|---|
| **SQLite** (via `aiosqlite`) | Save/load game state, scenario definitions, player progress |
| **JSON** / **MessagePack** | Snapshot serialization for WebSocket transport and file export |

### Development & Testing

| Package | Purpose |
|---|---|
| **pytest** | Unit and integration testing |
| **pytest-asyncio** | Async test support for FastAPI endpoints |
| **hypothesis** | Property-based testing for physics models (conservation laws, bounds checking) |
| **ruff** | Linting and formatting |
| **mypy** | Static type checking |

---

## Frontend — TypeScript + SvelteKit

### Framework

| Package | Version | Purpose |
|---|---|---|
| **SvelteKit** | ≥2.0 | App framework — routing, SSR/CSR, reactive state |
| **TypeScript** | ≥5.4 | Type safety across the frontend |
| **Vite** | (bundled with SvelteKit) | Build tooling, HMR |

### 2D Graphics & Visualization

| Package | Purpose | Use Cases |
|---|---|---|
| **D3.js** | SVG-based data visualization | Orbital diagrams, trajectory arcs, synodic timing charts, planetary surface maps (with built-in map projections), pressure/temperature profile plots |
| **Pixi.js** | Hardware-accelerated WebGL 2D canvas rendering | Container stream particle visualization, atmospheric cross-section renders, dense real-time displays that would choke SVG |
| **Observable Plot** | High-level statistical charts | Energy budget over time, atmospheric composition evolution, mass transfer rates, delta-v expenditure tracking |

### Rendering Strategy

- **D3.js** for interactive, zoomable diagrams where individual elements need hover/click (orbit paths, map features).
- **Pixi.js** for scenes with thousands of moving objects (container streams in transit, atmospheric particle distributions).
- **Observable Plot** for dashboard-style charts and statistical readouts.
- Layer selection is per-component — some views composite D3 overlays on Pixi canvases.

### Styling

| Package | Purpose |
|---|---|
| **Tailwind CSS** | Utility-first styling, responsive layout, dark-mode support |

### State & Communication

| Concern | Approach |
|---|---|
| **Client state** | Svelte stores — reactive, minimal boilerplate |
| **REST calls** | Native `fetch` with typed wrappers generated from OpenAPI schema |
| **WebSocket** | Native `WebSocket` API; reconnection logic; binary (MessagePack) or JSON frames |
| **Serialization** | `@msgpack/msgpack` for binary WebSocket frames; JSON fallback |

---

## Communication Protocol

### REST API (FastAPI)

```
POST   /api/simulation          Create new simulation
GET    /api/simulation/{id}     Load simulation state
PUT    /api/simulation/{id}     Update simulation config
DELETE /api/simulation/{id}     Delete simulation

GET    /api/scenarios           List available scenarios
POST   /api/simulation/{id}/run Start/resume simulation
POST   /api/simulation/{id}/pause  Pause simulation
```

### WebSocket (real-time sim state)

```
WS /ws/simulation/{id}

Server → Client:
  { type: "tick",    data: <SimulationSnapshot> }
  { type: "event",   data: <GameEvent> }
  { type: "alert",   data: <Warning/Failure> }

Client → Server:
  { type: "command", data: { action: "set_speed", value: 10 } }
  { type: "command", data: { action: "build", target: "mass_driver", params: {...} } }
```

---

## Project Structure (planned)

```
venmars-triworld-project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── api/
│   │   │   ├── routes/          # REST + WS endpoints
│   │   │   └── schemas/         # Pydantic models
│   │   ├── simulation/
│   │   │   ├── engine.py        # Core tick loop
│   │   │   ├── orbital.py       # Orbital mechanics
│   │   │   ├── atmosphere.py    # Atmospheric physics
│   │   │   ├── climate.py       # Climate evolution
│   │   │   ├── isru.py          # In-situ resource utilization
│   │   │   ├── structures.py    # Mass drivers, platforms, containers
│   │   │   ├── energy.py        # Energy budget & solar flux
│   │   │   └── events.py        # Discrete event scheduling
│   │   ├── models/
│   │   │   ├── state.py         # Simulation state dataclasses
│   │   │   └── config.py        # Scenario/player config
│   │   └── persistence/
│   │       └── database.py      # SQLite save/load
│   ├── tests/
│   │   ├── test_orbital.py
│   │   ├── test_atmosphere.py
│   │   └── ...
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── routes/              # SvelteKit pages
│   │   ├── lib/
│   │   │   ├── components/      # Svelte components
│   │   │   ├── graphics/        # D3, Pixi rendering modules
│   │   │   ├── stores/          # Svelte stores (sim state, UI)
│   │   │   ├── api/             # REST + WebSocket clients
│   │   │   └── types/           # TypeScript type definitions
│   │   └── app.html
│   ├── static/
│   ├── svelte.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── tech_stack/
│   └── tech_stack.md
└── README.md
```

---

## Key Architectural Decisions

1. **Simulation is server-authoritative.** The backend owns all physics. The frontend is a view layer — it never computes orbital mechanics or atmospheric state.

2. **Fixed-timestep tick loop.** The engine advances in deterministic fixed-dt steps. Variable speed is achieved by running multiple ticks per wall-clock second, not by changing dt.

3. **Snapshot-based state sync.** Each tick produces an immutable state snapshot. The WebSocket streams diffs or full snapshots to the frontend. This enables replay, undo, and headless batch runs.

4. **Numba for hot paths only.** The default is readable NumPy/SciPy code. Numba `@njit` is applied selectively to profiled bottlenecks — atmospheric column solvers, trajectory batch evaluators, n-body integrators.

5. **D3 + Pixi hybrid rendering.** SVG (D3) for interactive diagrams with few elements; WebGL canvas (Pixi) for dense particle/trajectory scenes. Components choose the appropriate renderer.

6. **Typed end-to-end.** Pydantic schemas on the backend auto-generate OpenAPI specs. Frontend TypeScript types are generated from the OpenAPI spec, ensuring contract consistency.

---

## Minimum Versions & Runtime

| Requirement | Version |
|---|---|
| Python | ≥3.12 |
| Node.js | ≥20 LTS |
| npm | ≥10 |
| OS | Windows 10+, macOS 12+, Linux (glibc 2.31+) |
| Browser | Chrome/Edge 120+, Firefox 121+, Safari 17+ (WebGL2 required) |
