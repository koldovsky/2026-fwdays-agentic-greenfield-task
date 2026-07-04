## Why

Phase 1 delivered a centered configuration card with placeholder copy only. The product cannot capture a trip until the rider can specify start/end locations, rest interval, and daily mileage limit — and share that configuration via URL. FR-SEARCH-01/02/03 and FR-INPUT-01 are the gateway to routing, map, and itinerary phases.

## What Changes

- Replace the empty-state placeholder with a functional route configuration form inside `ConfigPanel`
- Add debounced Start and End location fields with open geocoding autocomplete (name, region, country per row)
- Add numeric fields for rest interval (km) and maximum daily distance (km) with strict client-side validation
- Sync active configuration to URL query string `?start=&end=&rest=&day=` on change; parse and restore on load
- Add Ukrainian labels, helper text, and calm validation messages via local i18n (NFR-I18N-01, BC-BRAND-01)
- Ensure keyboard navigation and visible focus rings on all controls (NFR-A11Y-01)
- Use CORS-safe public geocoding endpoints only — no API keys (TC-STACK-04, TC-DATA-01, NFR-COST-01)
- No route computation, map, or OSRM calls in this phase — submit action is wired but inert until `routing-integration`

## Capabilities

### New Capabilities

- `location-search`: Debounced geocoding autocomplete for Start and End fields with structured suggestion rows (FR-SEARCH-01, FR-SEARCH-02)
- `route-url-state`: Bidirectional sync between route configuration and shareable URL query parameters (FR-SEARCH-03)
- `rider-constraints`: Validated numeric inputs for rest interval and max daily distance (FR-INPUT-01)

### Modified Capabilities

- `app-shell`: Empty-state configuration panel requirement extended from placeholder copy to functional route input form

## Impact

- **Components:** expand `components/empty-state/config-panel.tsx`; new `components/route-input/` modules (location field, constraints, form shell)
- **Lib:** `lib/geocoding/` (Nominatim client), `lib/route-config/` (types, URL codec, validation)
- **i18n:** form labels, placeholders, validation errors, autocomplete aria strings in `lib/i18n/uk.ts`
- **App:** client wrapper or `"use client"` form island in `app/page.tsx`; `useSearchParams` / `router.replace` for URL sync
- **Dependencies:** none (native `fetch` to public Nominatim; existing shadcn Input, Label, Button)
- **Cross-cutting:** BC-PRIVACY-01/02 (no tracking, URL-only persistence), NFR-OBS-01 (silent console), NFR-A11Y-01, NFR-COST-01
- **Downstream:** `route-engine` and `routing-integration` consume typed config from URL/state; map and sidebar phases assume shareable query shape
