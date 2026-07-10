# Add Map

## Why

Forecast and city search now share an active location, but the map panel is still
a placeholder. The MVP needs an interactive OpenStreetMap view so visitors can see
where the forecast applies and click to choose a nearby place.

## What Changes

- Add a client-only Leaflet map with OSM tiles and attribution.
- Center the map on the active location and show a marker popup with the city name.
- Reverse-geocode map clicks via Open-Meteo and sync the active location + URL.
- Show an SSR skeleton with the same footprint until the map hydrates.

## Impact

- Affected specs: `map`
- Affected code: `components/map/`, `components/weather-explorer/`, `lib/map/`,
  `lib/i18n/`
- New dependencies: `leaflet`, `react-leaflet`
- Explicit non-goals: compare columns, animated background, geolocation on load
