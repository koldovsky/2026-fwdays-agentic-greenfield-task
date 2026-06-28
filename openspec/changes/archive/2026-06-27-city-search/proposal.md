## Why

The app has no way to select a location, so no weather data can be fetched. City search is the entry point of the entire data path — every downstream capability (forecast, comfort score, map, animated background) depends on an active location being set. Without it, the app cannot function.

## What Changes

- Add a debounced text input that queries the Open-Meteo geocoding API for city suggestions
- Render suggestion rows showing city name, admin region, country, and flag emoji
- On selection, set the active location and write `?lat=&lon=&name=` to the URL
- Auto-select the single suggestion when the user presses Enter
- Show an inline "Nothing found" message when geocoding returns zero results
- Wire the geocoding fetch through a Next.js Route Handler (never expose the call in the client bundle)

## Capabilities

### New Capabilities

- `city-search`: Debounced city name input with Open-Meteo geocoding suggestions, URL-based location state, keyboard auto-select, and empty state

### Modified Capabilities

<!-- No existing specs are changing — this is a net-new capability. -->

## Impact

- **New files:** `app/api/geocode/route.ts` (Route Handler), `components/CitySearch.tsx` (client component), `lib/i18n/uk.ts` and `lib/i18n/en.ts` search-related strings
- **App shell integration:** search slot in hero/empty state and header wired to the new component
- **URL state:** introduces `?lat`, `?lon`, `?name` query params consumed by forecast and map later
- **Dependencies:** none new — Open-Meteo geocoding is keyless (TC-STACK-03); no additional packages required
- **Requirements satisfied:** FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03, FR-SEARCH-04, FR-SEARCH-05
- **Cross-cutting:** TC-DATA-01 (server-side fetch), NFR-I18N-01 (strings in lib/i18n/), NFR-A11Y-01 (focus, labels), BC-PRIVACY-01 (no trackers)
