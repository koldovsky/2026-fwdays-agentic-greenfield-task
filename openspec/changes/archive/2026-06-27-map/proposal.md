## Why

The weather app's core data path (search → forecast → comfort) is complete, but users can only set a location by typing. Adding an interactive OSM map gives users a spatial, click-to-set-location experience — a natural complement to text search and the last major MVP input method.

## What Changes

- Add a client-only Leaflet/react-leaflet map component that renders an OSM-tiled map bounded to the active location.
- Show a marker with a city-name popup at the active location.
- Wire map click → Open-Meteo reverse-geocoding → update active location + URL state + re-fetch forecast (same pipeline as city-search).
- Render OSM attribution ("© OpenStreetMap contributors") at bottom-right as required by the Tile Usage Policy.
- Load map via `dynamic({ ssr: false })` with a skeleton placeholder matching the map footprint, to avoid SSR/hydration issues with Leaflet DOM globals.

## Capabilities

### New Capabilities

- `map`: Interactive OSM map bounded to the active location; click sets a new location via reverse-geocoding; includes marker, popup, attribution, and SSR-safe dynamic import with skeleton.

### Modified Capabilities

<!-- No existing spec-level behavior changes required. city-search already owns the active-location + URL-state contract; map reuses it without modifying its spec. -->

## Impact

- **New files:** `components/Map/` (client component), `app/api/reverse-geocode/route.ts` (server route handler for reverse-geocoding), skeleton component.
- **Modified files:** main layout/page to mount the Map component; possibly `lib/i18n/uk.ts` / `en.ts` for any new UI strings.
- **New dependency:** `leaflet`, `react-leaflet` (TC-STACK-04 — already an accepted constraint).
- **Bundle impact:** Leaflet is the heaviest client bundle in the project (NFR-PERF-03: ≤ 200 KB gz); dynamic import isolates it from the initial bundle.
- **APIs used:** Open-Meteo reverse-geocoding (keyless, server-side via route handler per TC-DATA-01); OSM raster tiles (HTTPS, valid Referer per TC-MAP-01).
