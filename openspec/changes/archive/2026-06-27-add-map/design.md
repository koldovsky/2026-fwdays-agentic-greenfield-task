# Design — add-map

## Goals / Non-goals

**Goals**

- Replace the shell map placeholder with a Leaflet OSM panel.
- Keep map logic split: pure helpers in `lib/map/`, Leaflet UI in `components/map/`.
- Reuse the existing `CityLocation` model and URL sync helpers from city-search.
- Load Leaflet dynamically so the initial bundle stays within perf budget.

**Non-goals**

- Server-side map rendering or tile proxying.
- Drawing tools, compare pins, or animated overlays.
- Geolocation on page load.

## Key Decisions

| Decision | Alternatives | Trade-off |
|----------|--------------|-----------|
| `next/dynamic` with `ssr: false` | Static Leaflet import | Avoids SSR window/DOM errors and defers heavy map bundle |
| Open-Meteo reverse geocoding | Nominatim direct | Matches existing keyless geocoding stack and normalization helpers |
| Shared `onSelectLocation` callback | Separate map-only state | Keeps forecast/search/map in sync with one active location |
| OSM raster tiles over HTTPS | Self-hosted tiles | Satisfies tile usage policy with minimal setup |

## Open-Meteo API Contract

Endpoint: `https://nominatim.openstreetmap.org/reverse`

Open-Meteo geocoding has no reverse endpoint yet, so map clicks use Nominatim
(same OSM ecosystem as map tiles) with coordinate fallback when lookup fails.

Parameters:

- `lat`, `lon`
- `format=json`
- `addressdetails=1`
- `accept-language=uk`
- `zoom=10`

Request header: `User-Agent: WeatherExplorer/1.0 (education; contact: local-dev)`

## Error Handling

- No active location: show calm placeholder inside the map panel.
- Reverse geocode failure on click: inline calm message; keep prior location.
- Tile/network errors: Leaflet fallback background; no console noise on healthy path.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Leaflet bundle size | Dynamic import; map loads only in map panel |
| SSR hydration mismatch | Skeleton placeholder with fixed min-height |
| Reverse geocode misses rural clicks | Fall back to coordinate label and synthetic location id |
