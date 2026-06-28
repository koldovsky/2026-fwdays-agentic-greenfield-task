## Why

Four UX regressions exist on the active-location page (when the user has selected a city and the `RegionGrid` is visible):

1. **Search bar pre-fills with the city name** — `CitySearch` initialises `query` from `searchParams.get("name")`, so on page load the input already shows the selected city and the geocoding effect fires immediately, producing a visible suggestion dropdown. The bar should open empty and clean.
2. **Search bar wastes vertical space inside the grid** — it occupies a full grid column (up to half-width on md, one third on xl). When empty, the column below has no content, leaving a large blank gap. Moving it to a dedicated full-width row above the content grid removes the gap and gives the search bar a natural position.
3. **Forecast panel has no city heading** — a user who has pinned multiple cities and switches between them has no in-panel indicator of which city's forecast is currently visible. The city name must appear at the top of the forecast section.
4. **Hourly chart tooltip is laggy and poorly formatted** — the active dot (indicator on the line) does not track the cursor and renders stuck at the chart origin. The tooltip label format is "HH:MM : TT°C" spread across two lines; it should be "HH:MM – TT°C" on a single compact line.

## What Changes

- `CitySearch`: initialise `query` with `""` instead of `searchParams.get("name")`.
- `Shell` / `RegionGrid`: restructure the layout — search in its own full-width row, then a grid with forecast + map below. Forecast panel becomes full-width; map stays full-width below.
- `ForecastPanel`: read `name` from `useSearchParams` and render a heading (`<h2>`) at the top.
- `HourlyChart`: add `isAnimationActive={false}` on the `<Line>` to stop jitter; replace the built-in `activeDot` with a custom `<ActiveDot>` component that reads its position from `payload` via a custom tooltip render, ensuring the dot always tracks the cursor; rewrite the tooltip to a single-line custom component rendering "HH:MM – TT°C".

## Capabilities

### Modified Capabilities

- `city-search`: search bar clears on page transition to active-location view.
- `app-shell`: `RegionGrid` layout refactored; search promoted to a full-width row.
- `forecast`: forecast panel gains a city-name heading and chart tooltip is fixed.

## Non-Goals

- Changing the Hero page search behaviour (still starts empty and is unaffected).
- Altering pin/compare behaviour or weeked-compare mode beyond the layout update.
- Redesigning the map region.

## Impact

- **Modified files:** `app/components/CitySearch.tsx`, `app/components/Shell.tsx`, `app/components/forecast/ForecastPanel.tsx`, `app/components/forecast/HourlyChart.tsx`.
- **New files:** none.
- **New dependencies:** none.
- **Accessibility:** heading in forecast panel improves landmark navigation (NFR-A11Y-01). Chart tooltip still keyboard-accessible via Recharts built-in cursor handling.
- **Requirement IDs:** FR-SEARCH-03, FR-FORECAST-01, NFR-A11Y-01, NFR-A11Y-02, NFR-OBS-01, BC-BRAND-01.
