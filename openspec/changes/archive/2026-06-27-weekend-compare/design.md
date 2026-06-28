## Context

The app currently shows a forecast for a single active location selected via city search or map click. The `forecast` Route Handler (`/api/forecast`) and the `comfortScore` pure function in `lib/scoring/comfort.ts` are already defined. Weekend compare needs to display the same forecast data for up to 3 user-pinned cities side-by-side, focused on Saturday and Sunday only.

Key constraints: no cookies (BC-PRIVACY-03), no new paid APIs (NFR-COST-01), client JS ≤ 200 KB gz (NFR-PERF-03), all UI strings in `lib/i18n/uk.ts` + `en.ts` (NFR-I18N-01).

## Goals / Non-Goals

**Goals:**

- Let users pin up to 3 cities and hold them in ephemeral React state for the session
- Render a chip row of pinned cities above the forecast panel
- Provide a "Порівняти вихідні" toggle that replaces the forecast panel with a weekend compare table
- Fetch forecast for each pinned city in parallel via the existing `/api/forecast` Route Handler
- Display hi/lo °C, precipitation %, and comfort score for Saturday and Sunday per city column
- Sticky city-name headers with a "Зробити активним" action per column

**Non-Goals:**

- Persisting pins to localStorage, a database, or cookies
- Comparing more than 2 days (Sat + Sun only)
- Showing full 7-day data in the compare view
- A new Route Handler or third-party API

## Decisions

### 1. Ephemeral React state for pinned cities

**Decision:** Store pinned cities as `PinnedCity[]` in a React `useState` hook at the page (or nearest common ancestor) level.

**Alternatives considered:**

- URL params (`?pins=lat1,lon1,name1|...`): URL gets unwieldy with 3 cities × 3 params each; also creates back-button confusion. Rejected.
- `localStorage`: persists across sessions, but unnecessary complexity and no UX requirement for it. Rejected.
- Zustand/Jotai: no new runtime dependency warranted for a single local array. Rejected.

**Rationale:** Pins are a transient session artifact. React state is the simplest option that satisfies BC-PRIVACY-03 (no cookies/storage) and keeps the bundle clean.

---

### 2. Reuse existing `/api/forecast` Route Handler — call it N times

**Decision:** For each pinned city, call `GET /api/forecast?lat=<lat>&lon=<lon>` from the client. Fire all N fetches in parallel with `Promise.all`.

**Alternatives considered:**

- New batch Route Handler (`/api/forecast/batch?cities=...`): would reduce round-trips but adds server surface area and duplicates transform logic. Not worth it for ≤ 3 cities.
- Server Component fetch on each compare-table render: would re-fetch on every render; React state change would break memoization. Rejected.

**Rationale:** Reusing the existing handler keeps the scope minimal. Three parallel fetches to the same origin are negligible at this scale and the handler already has `Cache-Control: s-maxage=600`, so repeat fetches are free after the first.

---

### 3. Toggle swaps forecast panel content (not a modal/drawer)

**Decision:** The compare toggle replaces the main forecast panel in-place. A single boolean `isComparing` flips which panel is shown; the pinned chip row stays visible in both states.

**Alternatives considered:**

- Drawer / slide-over: hides context; users lose access to the active location forecast. Rejected.
- Separate route `/compare`: navigation overhead; pins stored in React state don't survive navigation. Rejected.

**Rationale:** In-place swap is the simplest mental model — the page structure doesn't change, only the content of the forecast area.

---

### 4. Comfort score computed client-side from fetched data

**Decision:** Call `comfortScore(day)` client-side after the parallel forecasts resolve. No new server endpoint needed.

**Rationale:** `comfortScore` is a pure function (TC-PURE-01, no Node APIs) — it runs identically in the browser. Computing it client-side avoids adding a new API shape.

---

### 5. No new runtime dependency

**Decision:** Implement the chip row and compare table with plain Tailwind and existing design-system tokens. No new npm package.

**Rationale:** The compare table is a simple CSS grid/table; the chip row is a flex list. Adding a dependency for this would push the client bundle toward the 200 KB gz limit (NFR-PERF-03).

## Risks / Trade-offs

- **Three parallel fetches on slow connections** → Each pinned city fetch triggers a separate network round-trip. Mitigation: show a per-column skeleton while data loads; the existing Route Handler cache means repeat selects are instant.
- **Pinned state lost on page refresh** → Intentional per design decision 1, but users may expect persistence. Mitigation: none in MVP; document as known limitation.
- **Weekend days not always in the 7-day window** → If today is Saturday or Sunday, the next weekend may be at days 6–7 (or absent). Mitigation: spec requires graceful "no data" column state rather than an error.
- **Table layout on mobile (< 768 px with 3 columns)** → Three columns of weather data may be cramped on small screens. Mitigation: horizontal scroll on the table container; sticky first column (city name) remains visible.
