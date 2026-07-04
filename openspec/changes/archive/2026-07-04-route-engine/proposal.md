## Why

Phase 3 captures start/end locations and rider constraints in the URL, but the product core — turning a route geometry into rest stops and multi-day segments — does not exist yet. Without a pure, testable segmentation engine, `routing-integration` cannot produce an itinerary, and map/sidebar phases have nothing to render. FR-VIEW-02 computation semantics, TC-PURE-01, TC-TEST-01, and NFR-PERF-02 all depend on this layer.

## What Changes

- Add pure TypeScript modules under `lib/route-engine/` for polyline distance, rest-stop placement, and day-boundary splitting
- Define typed inputs (coordinate polyline + `restKm` + `dayKm`) and outputs (itinerary with rest stops, overnight points, per-day metrics)
- Add Vitest infrastructure and fixture-based unit tests — no network, no DOM (TC-TEST-01)
- Add performance test or benchmark asserting segmentation completes in under 50 ms on representative datasets (NFR-PERF-02)
- Expose a single public orchestration entry point consumed later by `routing-integration`
- No OSRM fetch, no map, no sidebar UI, and no submit side effects in this phase

## Capabilities

### New Capabilities

- `route-segmentation`: Deterministic client-side segmentation of a route polyline into rest stops, overnight points, and travel-day groups with per-day distance metrics (FR-VIEW-02 computation, TC-PURE-01, NFR-PERF-02)

### Modified Capabilities

<!-- None — route-input types are consumed but their requirements are unchanged -->

## Impact

- **Lib:** new `lib/route-engine/` (types, geo helpers, segmentation algorithms, orchestrator)
- **Tests:** Vitest config, fixture polylines, unit + performance tests referencing requirement IDs
- **Package:** add `vitest` dev dependency and `npm test` script (NFR-DX-01 prep)
- **Components:** none in this phase — form submit remains inert until `routing-integration`
- **Cross-cutting:** TC-PURE-01 (pure boundaries), TC-TEST-01, NFR-PERF-02, NFR-OBS-01 (no console in lib)
- **Downstream:** `routing-integration` calls engine after OSRM fetch; `route-details` and `map-rendering` consume the same itinerary model
