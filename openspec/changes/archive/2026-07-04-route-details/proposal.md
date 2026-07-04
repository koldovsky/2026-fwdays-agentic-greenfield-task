## Why

Phase 5 stores a full itinerary and shows only a two-line summary. FR-VIEW-01 and FR-VIEW-02 require a chronological sidebar with total and per-day metrics so riders can review the plan without relying on the map alone. DESIGN.md specifies sidebar layout beside the map and duplicated data for accessibility.

## What Changes

- Add itinerary sidebar component reading `useRoutePlan().itinerary` (FR-VIEW-01, FR-VIEW-02 presentation)
- Display totals: distance, travel days, and client-computed duration estimate from deterministic rules
- Group content by travel day with per-day distance and stop list
- Replace the minimal `RoutePlanSummary` card with the full sidebar when itinerary is present
- Add pure helper(s) under `lib/` for duration formatting from distance (no DOM)
- Switch main layout to results view with sidebar column when itinerary exists
- Responsive: sidebar below map on mobile, beside map from 768 px (inherits FR-SHELL-02)
- No Leaflet or map changes in this change — `map-rendering` handles map in parallel

## Capabilities

### New Capabilities

- `itinerary-sidebar`: Chronological sidebar presenting total and per-day itinerary breakdown from client state (FR-VIEW-01, FR-VIEW-02 presentation)

### Modified Capabilities

- `app-shell`: Results-state main layout with sidebar region when itinerary is present
- `route-planning`: Replace minimal planning summary with full sidebar presentation once itinerary sidebar exists

## Impact

- **Lib:** `lib/itinerary-metrics/` (duration estimate, formatting helpers)
- **Components:** `components/route-details/itinerary-sidebar.tsx`; remove or supersede `RoutePlanSummary`
- **Layout:** results layout wrapper shared conceptually with map phase
- **i18n:** sidebar labels — day headings, stop kinds, totals in `lib/i18n/uk.ts`
- **Cross-cutting:** BC-BRAND-01, NFR-I18N-01, NFR-A11Y-01 (text-first itinerary access)
- **Downstream:** `quality-gate` verifies FR-VIEW-* traceability
