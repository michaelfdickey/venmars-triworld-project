# VenMars Spending Engine — Architecture & LLM Implementation Plan

## Overview

The spending engine lives in `frontend/src/lib/stores/gameStore.ts` and is ticked
every frame from `frontend/src/lib/components/GameView.svelte`.

All monetary values are in **$M** (millions USD). The game clock runs in
**hours since epoch** (Jan 1, 2030 00:00 UTC).

---

## What's Implemented (current state)

### Core Stores
| Store | Type | Purpose |
|---|---|---|
| `cashBalanceM` | `writable<number>` | Real-time cash balance in $M |
| `recurringExpenditures` | `writable<RecurringExpenditure[]>` | All registered cost commitments |
| `spendingLog` | `writable<SpendingLogEntry[]>` | Recent deduction history (last 200) |

### `tickSpending()` — called every frame
1. **Monthly budget income**: Annual budget ÷ 12, deposited when game clock crosses a month boundary
2. **Continuous operational burn**: Sum of all 11 spending category allocations, prorated per hour
3. **Triggered recurring expenditures**: Fires when `gameHour >= nextDueHour`, then advances to next due date

### Recurring Expenditure Types
| `sourceType` | Trigger | Example |
|---|---|---|
| `complex` | Annual, on claim anniversary | Kennedy SC annual maintenance $450M |
| `rocket` | Annual, on purchase anniversary | Starship annual maintenance $15M |
| `mission-launch` | One-time at launch hour | VM-001 launch cost $10M |
| `mission-repeat` | Every N days (via `repeatIntervalHours`) | Weekly Starlink deploy, $10M every 7 days |
| `annual-maint` | Annual, on commitment anniversary | Any asset's annual upkeep |
| `custom` | Any frequency | Future custom expenditures |

### Integration Points
- **StatusBar.svelte**: Shows real-time cash balance (💰 $X.XXB) with green/red coloring
- **MissionsTab.svelte**: `scheduleMission()` now calls `registerMissionLaunch()` to register the cost
- **GameView.svelte**: Game loop calls `tickSpending()` alongside `tickMaterials()`

### Convenience Registration Functions
```typescript
registerComplexMaintenance(complexId, claimHour)   // annual maintenance for a launch complex
registerRocketMaintenance(rocketId, purchaseHour)   // annual maintenance per rocket
registerMissionLaunch(name, costM, launchHour, repeating, repeatDays)  // mission costs
registerAnnualMaintenance(label, category, costM, commitHour, sourceId)  // generic annual cost
addExpenditure(exp)   // raw expenditure registration
removeExpenditure(id) // remove by ID
```

---

## What Needs To Be Built Next

### Priority 1: Wire Up Existing Asset Purchases

**Problem**: When the player claims a launch complex or buys a rocket, no expenditure
is registered. The spending engine exists but isn't triggered from the purchase UI.

**Tasks**:
1. **Launch complex claiming** — In the UI where a player claims/unclaims a complex,
   call `registerComplexMaintenance(complexId, currentGameHour)` after claiming.
   When unclaiming, call `removeExpenditure()` to find and remove the matching expenditure
   (match on `sourceType === 'complex'` && `sourceId === complexId`).

2. **Rocket purchasing** — In the UI where a player buys rockets, call
   `registerRocketMaintenance(rocketId, currentGameHour)` after purchase.
   Also deduct the `purchaseCostM` as a one-time cost from `cashBalanceM`.

3. **Payload purchasing** — When buying payloads from MarketSatellitesTab or
   VenMarsPayloadsTab, deduct `payload.cost` (in $M) from `cashBalanceM`.

**Where to find the UI**:
- Complex claiming: `ConsumptionTab.svelte` or wherever `claimedComplexes` is toggled
- Rocket buying: Look for `rocketInventory.update()` calls
- Payload buying: Look for `payloadInventory.update()` calls

### Priority 2: Material Cost Deductions

**Problem**: Materials accumulate via `tickMaterials()` but their procurement cost
isn't deducted from cash in real time. The SpendingTab shows allocation budgets
but doesn't actually subtract from `cashBalanceM`.

**Tasks**:
1. Inside `tickSpending()`, add material procurement costs as a continuous drain:
   ```typescript
   // After the continuous operational burn section:
   // Material procurement: materialCostB(i, alloc[i]) is $B/year
   // Sum all material costs and prorate per hour
   let materialCostMPerHour = 0;
   for (let i = 0; i < materialDefs.length; i++) {
       const pct = materialAllocations[i] ?? 0;
       if (pct <= 0) continue;
       materialCostMPerHour += (materialCostB(i, pct) * 1000) / HOURS_PER_YEAR;
   }
   currentBalance -= materialCostMPerHour * deltaHours;
   ```
2. Pass `materialAllocations` into `tickSpending()` (update the function signature
   and the call in GameView.svelte).

### Priority 3: Spending Tab Cash Flow Visualization

**Problem**: SpendingTab shows allocation pie charts but doesn't show real-time
cash flow, deduction history, or projected burn rate.

**Tasks**:
1. Add a "Cash Flow" section to SpendingTab showing:
   - Current cash balance (from `cashBalanceM`)
   - Monthly income rate
   - Monthly burn rate (allocations + maintenance + missions)
   - Net monthly cash flow
   - Months of runway remaining
2. Add a "Recent Transactions" section showing `spendingLog` entries
3. Add a "Recurring Commitments" section showing `recurringExpenditures` with
   next due dates and amounts

### Priority 4: Mission Cancellation Refund

**Problem**: When `cancelScheduledMission()` is called, it releases reserved
inventory but doesn't remove the associated expenditure from the spending engine.

**Tasks**:
1. In `cancelScheduledMission()` in MissionsTab.svelte, call `removeExpenditure()`
   to find and remove the expenditure matching the mission name:
   ```typescript
   // After the existing release logic:
   recurringExpenditures.update(list =>
       list.filter(e => e.sourceId !== m.name)
   );
   ```

### Priority 5: Deficit Handling

**Problem**: Cash can go negative with no consequences.

**Tasks**:
1. Add a `fundingCrisis` writable boolean store
2. In `tickSpending()`, if `cashBalanceM < 0`:
   - Set `fundingCrisis = true`
   - Auto-pause the game
   - Show a warning overlay: "FUNDING CRISIS: Budget deficit of $X.XB"
3. Player must reduce spending allocations or cancel missions to resume
4. Optional: Charge interest on negative balance (e.g., 5% annual)

### Priority 6: GDP Growth & Dynamic Budget

**Problem**: Annual budget is fixed. Real economies grow.

**Tasks**:
1. Add `gdpGrowthRate` (e.g., 2.5% annual) to difficulty config
2. In `tickSpending()`, when depositing monthly income, compute the budget
   based on the current year's GDP:
   ```typescript
   const yearsElapsed = newHour / HOURS_PER_YEAR;
   const currentGDP = baseGDP * Math.pow(1 + gdpGrowthRate, yearsElapsed);
   const currentBudget = currentGDP * gdpPercent;
   ```
3. Update SpendingTab to show current vs. base budget

### Priority 7: Facility Construction Costs

**Problem**: Building new facilities (mass drivers, habitats, factories) should
have construction costs spread over time, not instant.

**Tasks**:
1. Add a `ConstructionProject` interface:
   ```typescript
   interface ConstructionProject {
       id: string;
       name: string;
       totalCostM: number;
       monthlyInstallmentM: number;
       monthsRemaining: number;
       materialRequirements: { material: string; totalMt: number; deliveredMt: number }[];
   }
   ```
2. Register construction as a monthly expenditure via `addExpenditure()`
3. Deduct materials from stockpiles as they're consumed
4. Show construction progress in relevant tabs

### Priority 8: Cross-Body Spending

**Problem**: Currently all spending is Earth-centric. Moon/Mars/Venus operations
will have their own local economies.

**Tasks**:
1. Add `cashBalanceM` per body (or keep single global balance)
2. Add transfer costs between bodies (communication delay, logistics overhead)
3. Factor in launch window timing for when costs actually apply

---

## Architecture Notes for LLM Implementors

### Key Constants
```
HOURS_PER_YEAR = 8766      (365.25 × 24)
HOURS_PER_MONTH = 730.5    (8766 / 12)
HOURS_PER_DAY = 24
GAME_EPOCH = Jan 1, 2030 00:00 UTC
```

### How Time Works
- `gameTime` store = hours since GAME_EPOCH
- `gameTimeToDate(hours)` converts to JS Date
- Game loop in GameView.svelte: `requestAnimationFrame` → measure real elapsed ms →
  multiply by `simSpeed` (hours/second) → advance `gameTime`
- All tick functions receive `(prevHour, newHour)` or `(deltaHours)`

### How to Add a New Cost Type
1. Define the cost parameters
2. Call `addExpenditure()` with appropriate `frequency`, `amountM`, `nextDueHour`
3. For custom intervals, set `repeatIntervalHours > 0` and `sourceType = 'mission-repeat'`
4. The tick loop will automatically fire it at the right time

### Example: Weekly Launch at $200M with $1B Annual Maintenance

```typescript
import { gameTime, registerMissionLaunch, registerAnnualMaintenance } from '$lib/stores/gameStore';

// Get current game hour
let currentHour = 0;
gameTime.subscribe(h => currentHour = h)();

// Register the weekly launch ($200M every 7 days)
registerMissionLaunch(
    'Starlink Deploy',
    200,           // $200M per launch
    currentHour,   // first launch now
    true,          // repeating
    7              // every 7 days
);

// Register annual maintenance ($1B = $1000M, annually on this date)
registerAnnualMaintenance(
    'Starlink constellation maintenance',
    'Mission Operations',
    1000,          // $1000M = $1B
    currentHour,   // commitment date
    'starlink-maint'
);
```

This mission would cost:
- Launch: $200M × 52 weeks = **$10.4B/year**
- Maintenance: **$1B/year**
- Total: **$11.4B/year**
- First maintenance deduction: exactly 1 year after commitment date

### File Map
| File | Role |
|---|---|
| `frontend/src/lib/stores/gameStore.ts` | All stores, types, tick functions, registration helpers |
| `frontend/src/lib/components/GameView.svelte` | Game loop (requestAnimationFrame), calls tick functions |
| `frontend/src/lib/components/StatusBar.svelte` | Cash balance display in top bar |
| `frontend/src/lib/components/bodies/subtabs/SpendingTab.svelte` | Spending allocation UI, pie charts |
| `frontend/src/lib/components/bodies/subtabs/MissionsTab.svelte` | Mission designer, scheduling, cost registration |
| `frontend/src/lib/components/bodies/subtabs/ConsumptionTab.svelte` | Material consumption display |
| `frontend/src/lib/components/bodies/subtabs/payloads/*.svelte` | Payload purchase UI |
| `frontend/src/lib/components/bodies/subtabs/production/AllocationTab.svelte` | Material allocation sliders |
