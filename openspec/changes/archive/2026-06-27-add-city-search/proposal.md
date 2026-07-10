# Add City Search

## Why

The shell currently shows a non-functional search placeholder. The next UI slice
needs to let users explicitly choose a city so later forecast and map slices can
render data for an active location.

## What Changes

- Add a debounced city search combobox backed by the keyless Open-Meteo
  geocoding API.
- Normalize geocoding results into a framework-free location model under
  `lib/city-search/`.
- Replace the shell placeholder input with an interactive client component.
- Sync selected locations into the URL as `?lat=&lon=&name=`.
- Show zero-results feedback inline without toasts.

## Impact

- Affected specs: `city-search`
- Affected code: `app/page.tsx`, `components/city-search/`, `lib/city-search/`,
  `lib/i18n/`
- Dependencies: none expected
- Explicit non-goals: forecast fetching, map click-to-set, persisted pinned cities
