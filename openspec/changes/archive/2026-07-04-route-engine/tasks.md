## 1. Test infrastructure

- [x] 1.1 Add `vitest` dev dependency and `npm test` script (`vitest run`)
- [x] 1.2 Add `vitest.config.ts` with TypeScript path aliases aligned to `tsconfig.json`

## 2. Core types and geo helpers

- [x] 2.1 Create `lib/route-engine/types.ts` — `LatLon`, `StopKind`, `RouteStop`, `TravelDay`, `Itinerary`, `SegmentInput`, `SegmentResult`, error codes (TC-PURE-01)
- [x] 2.2 Create `lib/route-engine/geo.ts` — `haversineKm`, `cumulativeDistances`, `interpolateAtDistance`, `slicePolylineByDistance`
- [x] 2.3 Add `lib/route-engine/__tests__/geo.test.ts` — known-distance fixtures with `toBeCloseTo` assertions

## 3. Rest stop placement

- [x] 3.1 Create `lib/route-engine/place-rest-stops.ts` — forward pass emitting `start`, `rest`, and `end` stops at `restKm` intervals
- [x] 3.2 Add `lib/route-engine/__tests__/place-rest-stops.test.ts` — 450 km / 150 km rest fixture, short route with no rests (FR-VIEW-02)

## 4. Day splitting

- [x] 4.1 Create `lib/route-engine/split-days.ts` — partition stops into travel days by `dayKm`, emit `overnight` markers, assign `dayIndex`, build per-day polylines
- [x] 4.2 Add `lib/route-engine/__tests__/split-days.test.ts` — 900 km / 400 km day fixture (3 days), single-day route with no overnights

## 5. Public orchestrator

- [x] 5.1 Create `lib/route-engine/segment-route.ts` — validate input, compose geo → rest → days, return `SegmentResult`
- [x] 5.2 Create `lib/route-engine/index.ts` — export public API (`segmentRoute` and types)
- [x] 5.3 Add `lib/route-engine/__tests__/segment-route.test.ts` — invalid polyline/constraints, full itinerary contract (stop kinds, counts, ordering)
- [x] 5.4 Add `lib/route-engine/__tests__/fixtures/` — synthetic straight, curved, and ~2000-point dense polylines

## 6. Performance verification

- [x] 6.1 Add `lib/route-engine/__tests__/performance.test.ts` — assert `segmentRoute` on dense fixture completes in < 50 ms (NFR-PERF-02)

## 7. Verification

- [x] 7.1 Run `npm test` — all route-engine tests pass without network (TC-TEST-01)
- [x] 7.2 Run `npm run lint && npm run build` — must pass without errors
- [x] 7.3 Confirm no UI or submit behavior changes — form submit remains inert until `routing-integration`
