# Demo Script — Weather Explorer

Used by `npm run qa:record-demos` (headless Playwright). Each clip maps to
`docs/qa/demo-recordings/<id>.{webm,png,md}`.

## Preconditions

- App running at `http://localhost:3000`
- Network access to Open-Meteo geocoding/forecast, Nominatim, OSM tiles

## Clips

### 01-shell-empty — empty hero (FR-SHELL-01, FR-SHELL-02, FR-SHELL-03)

1. Open `/` without query params.
2. Assert hero heading and city search are visible.
3. Assert forecast placeholder invites city selection.

### 02-header-clock — live clock (FR-CLOCK-01)

1. Open `/`.
2. Assert header shows a time matching `HH:MM` pattern with aria label.

### 03-search-forecast — search + forecast + comfort (FR-SEARCH-*, FR-FORECAST-*, FR-COMFORT-*)

1. Type `Львів` in search; pick first suggestion.
2. Wait for forecast panel.
3. Assert day cards, comfort text, weekend strip, chart region, sun note.

### 04-map-panel — OSM map (FR-MAP-01..05)

1. With Lviv active, wait for Leaflet map.
2. Click map away from the marker; assert URL updates (reverse geocode).
3. Assert OpenStreetMap attribution remains visible.

### 05-animated-background — sky layer (FR-ANIM-01, FR-ANIM-02, FR-ANIM-04)

1. With city active, assert decorative background layer does not block search click.

### 06-reduced-motion — static gradient (FR-ANIM-03)

1. Emulate `prefers-reduced-motion: reduce`.
2. Reload with city selected; assert page still usable (gradient fallback).

### 07-weekend-compare — pins + table (FR-COMPARE-01, FR-COMPARE-02, FR-COMPARE-03)

1. With active city, pin city; enable compare toggle.
2. Assert compare table headers and make-active control.

### 08-footer-jokes — joke + credits (FR-JOKES-01, BC-BRAND-02)

1. Scroll to footer.
2. Assert Ukrainian joke line and links to Open-Meteo / OpenStreetMap.

### 09-mobile-layout — responsive shell (FR-SHELL-02)

1. Viewport 360×740; open home with city selected.
2. Assert main landmark and search remain visible without horizontal scroll.
