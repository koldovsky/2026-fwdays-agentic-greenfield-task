## Why

Phase 5 produces a segmented itinerary in client state, but the rider still cannot see the route geographically. FR-MAP-01 through FR-MAP-04 require an interactive OSM map with route polyline, stop markers, client-only rendering, and tile attribution. This is the primary visual review surface before the full sidebar breakdown ships in parallel.

## What Changes

- Add Leaflet map via `next/dynamic` with `ssr: false` and a structured skeleton placeholder (FR-MAP-03, TC-STACK-03)
- Render route polyline and fit map bounds to the active itinerary from `useRoutePlan()` (FR-MAP-01)
- Plot color-coded markers for start, end, rest, and overnight stops per DESIGN.md (FR-MAP-02)
- Display OSM tile attribution bottom-right on the map canvas (FR-MAP-04)
- Switch main layout to a results view with map when an itinerary exists; keep centered config-only empty state otherwise
- Add `leaflet` and `react-leaflet` dependencies; import Leaflet CSS client-side only
- No itinerary sidebar changes in this change — `route-details` handles breakdown UI in parallel

## Capabilities

### New Capabilities

- `interactive-map`: Client-only Leaflet map rendering itinerary geometry, stop markers, bounds fitting, and OSM attribution (FR-MAP-01, FR-MAP-02, FR-MAP-03, FR-MAP-04, TC-STACK-03)

### Modified Capabilities

- `app-shell`: Results-state main layout with map region when itinerary is present; responsive map sizing at 768 px and 1280 px breakpoints

## Impact

- **Dependencies:** `leaflet`, `react-leaflet`, `@types/leaflet`
- **Components:** `components/map/` (dynamic map shell, markers, attribution overlay)
- **Layout:** `app/page.tsx` or results layout wrapper reading `useRoutePlan().itinerary`
- **CSS:** Leaflet stylesheet loaded in map client bundle only
- **Cross-cutting:** NFR-COST-01 (OSM tiles, no keys), BC-BRAND-02 (attribution), NFR-A11Y-01 (map supplementary to text data)
- **Downstream:** `route-details` sidebar sits beside this map in combined results layout
