## Why

The MVP forecast view shows one city at a time, making it impossible to quickly compare weekend conditions across multiple destinations — the core use-case for weekend trip planning. Adding pin & compare unlocks the product's primary differentiator and completes the MVP feature set.

## What Changes

- Add a **pin button** on the active city chip / search result that saves up to 3 cities in local (session) state.
- Render a **pinned-city chip row** above the forecast grid showing all pinned cities.
- Add a **"Порівняти вихідні" toggle** that switches the main content area to a 3-column weekend compare table.
- Each column shows Saturday + Sunday: hi / lo °C, precipitation %, and comfort score badge.
- Each column header is sticky and includes the city name and a "Зробити активним" button.
- Pinned cities' forecast data is fetched via the existing Route Handler pattern (TC-DATA-01) in parallel.

## Capabilities

### New Capabilities

- `weekend-compare`: Pin up to 3 cities and compare their Saturday / Sunday forecast conditions (hi/lo, precip %, comfort score) in a side-by-side table with sticky city headers and an "make active" action per column.

### Modified Capabilities

<!-- No existing spec-level requirements change; comfort-score and forecast are consumed as-is. -->

## Impact

- **New files:** `components/WeekendCompare/`, `components/PinnedCities/`, i18n keys in `lib/i18n/uk.ts` + `en.ts`
- **Route Handler:** reuse or extend the existing forecast Route Handler to accept multiple `lat/lon` pairs (or call it N times client-side)
- **State:** pinned cities stored in React state (no persistence beyond session; no cookies, per BC-PRIVACY-03)
- **Deps:** no new runtime dependencies; reuses `lib/scoring/comfort.ts` (TC-PURE-01) and existing forecast data shape
- **Bundle:** table + chip row are client components; must keep total client JS ≤ 200 KB gz (NFR-PERF-03)
