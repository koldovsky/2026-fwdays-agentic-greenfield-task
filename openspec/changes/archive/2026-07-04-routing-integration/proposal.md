## Why

Phases 3–4 capture rider configuration in the URL and can segment a polyline in pure TypeScript, but submit still validates only — no OSRM fetch runs and no itinerary reaches the UI. Without wiring geocoded start/end to a public routing API and feeding `segmentRoute`, the product cannot produce a plan on user action. Map and sidebar phases depend on this orchestration layer.

## What Changes

- Add browser-side OSRM client under `lib/routing/` — CORS-safe public endpoint, GeoJSON geometry decode to `LatLon[]` (TC-DATA-01 OSRM leg, TC-STACK-04)
- Add `planRoute` orchestrator: validated `RouteConfig` → OSRM polyline → `segmentRoute` → `Itinerary`
- Wire form submit to trigger planning on explicit user action only — not on page load (BC-PRIVACY-02)
- Add client itinerary state (context or store) consumed later by map and sidebar phases
- Show loading state on submit; calm Ukrainian error message on routing failure (NFR-OBS-01, BC-BRAND-01)
- Show minimal planning summary (total distance, travel days) when successful — no map or full sidebar yet
- Add Vitest unit tests for OSRM response decoding and orchestration error mapping (mocked fetch)
- No Leaflet map, no itinerary sidebar, no GPX export in this phase

## Capabilities

### New Capabilities

- `osrm-routing`: Client-side OSRM route fetch from a keyless public instance and decode of route geometry for the segmentation engine (TC-DATA-01, TC-STACK-04, NFR-COST-01)
- `route-planning`: Submit-triggered orchestration from route configuration to segmented itinerary, loading/error/summary UI, and client itinerary state (NFR-OBS-01)

### Modified Capabilities

- `app-shell`: Replace submit-stub behavior with active route planning on submit; allow minimal planned-route summary without map or sidebar

## Impact

- **Lib:** new `lib/routing/` (`osrm-client.ts`, `plan-route.ts`, types); tests with mocked fetch
- **Components:** extend `RouteConfigForm` or add route-planning wrapper; optional `RoutePlanSummary` compact card
- **State:** client itinerary provider (e.g. `RoutePlanProvider`) holding latest `Itinerary | null` and planning status
- **i18n:** planning strings — loading, routing error, summary labels in `lib/i18n/uk.ts`
- **App:** wrap page or config panel with itinerary provider
- **Cross-cutting:** BC-PRIVACY-02 (submit-only fetch), NFR-COST-01, NFR-OBS-01, BC-BRAND-01
- **Downstream:** `map-rendering` and `route-details` read shared itinerary state; no changes to `route-engine` API
