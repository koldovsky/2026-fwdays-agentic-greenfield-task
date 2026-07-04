## Context

Phases 1–3 delivered the Ukrainian SPA shell, route configuration form, URL state sync, and validated rider constraints (`restKm` 50–300, `dayKm` 100–1000). Submit validates but performs no routing. The product core — deterministic segmentation of a route polyline into rest stops and multi-day groups — must exist as pure `lib/` modules before OSRM integration or UI presentation.

Constraints: pure functions only, no DOM, no network, no `console.*` (TC-PURE-01, NFR-OBS-01); Vitest verification (TC-TEST-01); segmentation under 50 ms on representative polylines (NFR-PERF-02). Downstream phases consume a stable itinerary model; changing field names after `routing-integration` would be costly.

## Goals / Non-Goals

**Goals:**

- Pure TypeScript modules under `lib/route-engine/` with typed inputs and outputs
- Haversine-based distance along a coordinate polyline
- Rest stops placed at every `restKm` of riding distance after the start (not at start/end unless coincident)
- Travel days split when cumulative riding distance in the current day reaches `dayKm`; overnight marker at each day boundary except the final destination
- Flat ordered stop list plus per-day groupings with distance metrics
- Single public orchestrator: `segmentRoute(input) → Itinerary | SegmentationError`
- Vitest suite with fixture polylines and a performance assertion (< 50 ms)
- `npm test` script wired for CI readiness

**Non-Goals:**

- OSRM fetch or geometry decoding (`routing-integration`)
- Map markers, sidebar UI, or Ukrainian copy for itinerary (`map-rendering`, `route-details`)
- GPX export, hotel/infrastructure scoring, elevation, or speed/time estimates
- Submit button side effects or React hooks
- Server-side computation or persistence

## Decisions

### 1. Module layout

```
lib/route-engine/
  types.ts              # LatLon, RouteStop, TravelDay, Itinerary, SegmentInput, errors
  geo.ts                # haversineKm, cumulativeDistances, interpolateAtDistance
  place-rest-stops.ts   # walk polyline, emit rest stops every restKm
  split-days.ts         # partition stops + geometry into travel days by dayKm
  segment-route.ts      # public orchestrator — compose geo → rest → days
  index.ts              # re-export public API
lib/route-engine/__tests__/
  fixtures/             # small synthetic polylines + expected snapshots
  geo.test.ts
  place-rest-stops.test.ts
  split-days.test.ts
  segment-route.test.ts
  performance.test.ts   # NFR-PERF-02
```

**Rationale:** Mirrors `lib/route-config/` and `lib/geocoding/` separation. Each unit is independently testable. Orchestrator stays thin.

**Alternative considered:** Single `engine.ts` file — rejected; rest placement and day splitting have distinct edge cases worth isolated tests.

### 2. Input model

```typescript
type SegmentInput = {
  polyline: LatLon[];   // ordered coordinates, length ≥ 2
  restKm: number;       // integer, validated upstream (50–300)
  dayKm: number;        // integer, validated upstream (100–1000)
};
```

Polyline comes from OSRM geometry in a later phase. Engine does not decode encoded polylines — caller decodes first.

**Validation inside engine:** reject empty or single-point polylines, non-finite coordinates, non-positive constraints with typed `SegmentationError` codes (`INVALID_POLYLINE`, `INVALID_CONSTRAINTS`). Do not throw for expected invalid input — return `Result` style `{ ok: true, itinerary } | { ok: false, error }`.

### 3. Output model (itinerary contract for downstream)

```typescript
type StopKind = "start" | "rest" | "overnight" | "end";

type RouteStop = {
  kind: StopKind;
  lat: number;
  lon: number;
  distanceFromStartKm: number;
  dayIndex: number;           // 0-based travel day
};

type TravelDay = {
  dayIndex: number;
  distanceKm: number;         // sum of legs within the day
  stops: RouteStop[];         // ordered stops belonging to this day
  polyline: LatLon[];         // coordinate slice for map bounds (phase 6)
};

type Itinerary = {
  totalDistanceKm: number;
  totalDays: number;
  restStopCount: number;
  stops: RouteStop[];         // flat chronological list including start/end
  days: TravelDay[];
  polyline: LatLon[];         // echo input for map rendering convenience
};
```

**Rationale:** Single model shared by `routing-integration`, `map-rendering`, and `route-details`. `polyline` slices per day enable map fit-bounds without re-segmenting.

### 4. Distance and interpolation

- **Haversine** between consecutive polyline vertices; sum for cumulative distance array (length `n`, first entry `0`).
- **Interpolation** at target km: binary search cumulative array, linear interpolate lat/lon along the segment. Sufficient for dense OSRM geometries; avoids map projection dependencies.
- **Total distance** rounded to one decimal in output metrics; internal math uses full precision.

**Alternative considered:** Turf.js — rejected (extra dependency, NFR-COST-01 simplicity).

### 5. Rest stop placement algorithm

Single forward pass along the polyline:

1. Emit `start` at first coordinate (`distanceFromStartKm = 0`, `dayIndex = 0`).
2. Track `distanceSinceLastRest` and `nextRestTarget = restKm`.
3. Walk segments; when cumulative distance crosses each multiple of `restKm` before the end, interpolate a `rest` stop at that exact distance.
4. Do not emit a rest stop coincident with `end` (if remainder < half rest interval, skip final partial rest — document in tests).
5. Emit `end` at last coordinate.

Rest stops inherit provisional `dayIndex = 0`; day splitter reassigns indices.

**Alternative considered:** Precompute all rest targets then merge — equivalent; single pass is simpler and O(n).

### 6. Day splitting algorithm

Input: ordered stops (start, rests…, end) with `distanceFromStartKm`, full polyline, `dayKm`.

1. Initialize `dayIndex = 0`, `dayStartDistance = 0`, empty current day.
2. Iterate stops in order. Leg distance = `stop.distanceFromStartKm - previousStopDistance`.
3. If adding the leg to the current day would exceed `dayKm` **and** the stop is not `start`:
   - Insert an `overnight` stop interpolated at `dayStartDistance + dayKm` (may fall between two rests).
   - Close current day; increment `dayIndex`; reset `dayStartDistance` to overnight distance.
4. Assign stop to current day with updated `dayIndex`.
5. After loop, close final day. `totalDays = days.length`.

Overnight stops are synthetic (interpolated); they are not rest stops. Final day ends with `end` — no overnight after destination.

**Edge case:** Entire route shorter than `dayKm` → one day, zero overnight stops.

### 7. Day polyline slices

For each day, slice the original polyline between cumulative distances `[dayStartKm, dayEndKm]` using the same interpolation helper. Ensures map phase can draw per-day geometry without recomputing.

### 8. Testing strategy (TC-TEST-01)

- **Vitest** as dev dependency; `npm test` runs `vitest run`.
- Fixtures: straight-line 3-point route, 100-point synthetic curve, OSRM-like dense polyline (~2000 points) for performance.
- Snapshot-style assertions on stop counts, kinds, day boundaries, and total distance — not brittle float equality (use `toBeCloseTo`).
- Performance test: `segmentRoute` on 2000-point fixture completes in < 50 ms (single-threaded Node, generous CI headroom).
- Reference requirement IDs in test file describe blocks (`FR-VIEW-02`, `NFR-PERF-02`).

**Alternative considered:** Jest — rejected; Vitest aligns with Vite/TS ecosystem and faster cold start.

### 9. Public API surface

Export from `lib/route-engine/index.ts`:

- `segmentRoute(input): SegmentResult`
- Types: `SegmentInput`, `Itinerary`, `RouteStop`, `TravelDay`, `SegmentationError`
- Keep geo helpers internal unless tests need them (export for test only via direct module imports)

No React, no `fetch`, no `window`.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Linear lat/lon interpolation skews on very long segments | OSRM geometries are dense; add fixture with short 2-point line and document limitation |
| Rest and overnight markers coincide visually | Distinct `kind` values; map phase uses separate colors (FR-MAP-02, later) |
| `dayKm` < `restKm` produces multiple rests per day | Allowed by validation ranges; covered by unit test |
| Itinerary model churn blocks downstream | Freeze types in spec; breaking changes require new OpenSpec change |
| Vitest not yet in project | Add in this change; `npm test` initially runs only engine tests |

## Migration Plan

1. Add Vitest dev dependency and config
2. Implement `types`, `geo`, `place-rest-stops`, `split-days`, `segment-route`
3. Add fixtures and tests; verify `npm test` passes
4. Run `npm run lint && npm run build` — no app wiring yet
5. Manual: import `segmentRoute` in a one-off script or test REPL — no UI change expected

Rollback: remove `lib/route-engine/` and Vitest config; no UI impact.

## Open Questions

- None blocking. Time/duration metrics deferred to `route-details` (speed assumptions not in MVP engine).
