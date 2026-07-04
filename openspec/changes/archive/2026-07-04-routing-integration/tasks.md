## 1. Routing library

- [x] 1.1 Create `lib/routing/types.ts` — `RoutingError`, `PlanRouteResult`, OSRM response types
- [x] 1.2 Create `lib/routing/decode-geometry.ts` — OSRM GeoJSON `[lon, lat]` → `LatLon[]` (TC-DATA-01)
- [x] 1.3 Create `lib/routing/osrm-client.ts` — public OSRM fetch with AbortSignal, structured errors, no console output (TC-STACK-04, NFR-COST-01, NFR-OBS-01)
- [x] 1.4 Create `lib/routing/plan-route.ts` — orchestrate config → OSRM → `segmentRoute`
- [x] 1.5 Create `lib/routing/index.ts` — export public API

## 2. Routing library tests

- [x] 2.1 Add `lib/routing/__tests__/fixtures/osrm-route.json` — sample GeoJSON geometry response
- [x] 2.2 Add `lib/routing/__tests__/decode-geometry.test.ts` — coordinate order and minimum point count
- [x] 2.3 Add `lib/routing/__tests__/plan-route.test.ts` — mocked fetch success and failure paths (TC-TEST-01)

## 3. i18n

- [x] 3.1 Add planning strings to `lib/i18n/uk.ts` — `planning`, `errorRoutingFailed`, `summaryHeading`, `summaryDistance`, `summaryDays` (BC-BRAND-01)

## 4. Client planning UI

- [x] 4.1 Implement `components/route-planning/route-plan-provider.tsx` — itinerary state, status, `planFromConfig`, abort handling (BC-PRIVACY-02)
- [x] 4.2 Implement `components/route-planning/route-plan-summary.tsx` — compact distance + day count when itinerary present
- [x] 4.3 Wire `RouteConfigForm` submit to `planFromConfig`; loading label and disabled state while planning
- [x] 4.4 Show calm Ukrainian routing error below submit on failure

## 5. App composition

- [x] 5.1 Update `components/empty-state/config-panel.tsx` — wrap form with `RoutePlanProvider` and render `RoutePlanSummary`
- [x] 5.2 Verify no OSRM call on page load with URL params only

## 6. Verification

- [x] 6.1 Run `npm test` — all tests pass including new routing tests
- [x] 6.2 Run `npm run lint && npm run build` — must pass without errors
- [x] 6.3 Manual: submit valid start/end → summary appears; block network → error message; console silent on happy path
