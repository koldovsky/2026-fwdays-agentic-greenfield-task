# Capabilities & Implementation Order

Last updated: 2026-06-25

This document decomposes [requirements.md](requirements.md) into discrete
**capabilities** to be delivered as OpenSpec changes, and defines the
**order of implementation** based on dependencies.

- Each capability maps to one OpenSpec change under `openspec/changes/<id>/`
  and (once synced) one spec under `openspec/specs/<id>/`.
- Requirement IDs (`FR-*`, `NFR-*`, `TC-*`, `BC-*`) are the source of truth;
  this file only groups and sequences them.
- Cross-cutting requirements (NFR / TC / BC) are not standalone capabilities —
  they are constraints every capability must satisfy. See
  [Cross-cutting constraints](#cross-cutting-constraints).

## Capability map

| #  | Capability ID     | Title                       | Primary requirements                                  | Depends on                          | Type     |
| -- | ----------------- | --------------------------- | ----------------------------------------------------- | ----------------------------------- | -------- |
| 0  | `app-shell`       | App shell & navigation      | FR-SHELL-01..03                                       | foundation (stack, design system)   | MVP      |
| 1  | `top-clock`       | Live local-time clock       | FR-CLOCK-01                                           | `app-shell`                         | MVP      |
| 2  | `bottom-jokes`    | Footer Ukrainian jokes      | FR-JOKES-01, BC-BRAND-02                              | `app-shell`                         | MVP      |
| 3  | `city-search`     | City search & geocoding     | FR-SEARCH-01..05                                      | `app-shell`                         | MVP      |
| 4  | `forecast`        | 7-day + hourly forecast     | FR-FORECAST-01..05                                    | `city-search`                       | MVP      |
| 5  | `comfort-score`   | Comfort score (pure lib)    | FR-COMFORT-01..05                                     | `forecast`                          | MVP      |
| 6  | `animated-bg`     | Animated weather background | FR-ANIM-01..04                                        | `forecast`                          | MVP      |
| 7  | `map`             | Interactive OSM map         | FR-MAP-01..05                                         | `city-search`, `forecast`           | MVP      |
| 8  | `weekend-compare` | Pin & compare cities        | FR-COMPARE-01..03                                     | `forecast`, `comfort-score`         | Optional |

## Order of implementation

The order follows the data/dependency graph: nothing useful renders without a
shell; nothing renders weather without a selected location; comfort and
visuals derive from forecast data; compare builds on top of everything.

```
Phase A — Foundation & shell
  0. app-shell            (layout, breakpoints, empty/hero state)

Phase B — Independent shell widgets (parallelizable)
  1. top-clock            (header widget, no data deps)
  2. bottom-jokes         (footer widget, deterministic, no APIs)

Phase C — Core data path
  3. city-search          (sets active location, drives URL state)
  4. forecast             (fetches + renders weather for active location)

Phase D — Derived from forecast (parallelizable after forecast)
  5. comfort-score        (pure scoring lib + badges + weekend highlight)
  6. animated-bg          (background driven by condition + sunrise/sunset)

Phase E — Spatial selection
  7. map                  (alternate way to set active location; re-fetches)

Phase F — Optional enhancement
  8. weekend-compare      (multi-city pin + compare table)
```

### Rationale for sequencing

1. **`app-shell` first** — every other capability mounts inside it. It also
   establishes the responsive grid (FR-SHELL-02) and empty/hero state
   (FR-SHELL-03) the search lands in.
2. **`top-clock` and `bottom-jokes` next** — small, self-contained, no data
   dependencies. They de-risk the shell wiring and the i18n/voice conventions
   (NFR-I18N-01, BC-BRAND-01) before the data-heavy work begins. Can be built
   in parallel.
3. **`city-search` before `forecast`** — search sets the active location and
   the `?lat=&lon=&name=` URL state (FR-SEARCH-03) that forecast consumes.
4. **`forecast` is the spine** — comfort, animated background, map, and compare
   all read from its data. Lock its data shape early.
5. **`comfort-score` and `animated-bg`** both consume forecast output and are
   independent of each other → parallelizable. Comfort is a pure `lib/`
   function (FR-COMFORT-01, TC-PURE-01), so it is the highest-value unit-test
   target and can start as soon as the forecast data shape is fixed.
6. **`map` after the core path** — it is a second way to set the active
   location (FR-MAP-03) and reuses the same forecast fetch. Building it after
   `city-search`/`forecast` avoids duplicating location-state logic. It is also
   the heaviest client bundle (Leaflet), relevant to NFR-PERF-03.
7. **`weekend-compare` last** — explicitly optional; needs both `forecast` and
   `comfort-score` to exist for every pinned city.

## Capability details

### 0. `app-shell` — App shell & navigation
- **Requirements:** FR-SHELL-01, FR-SHELL-02, FR-SHELL-03
- **Scope:** top bar (logo, theme indicator), main content area, responsive
  layout at 768/1280 px, first-load empty/hero state with centered search slot.
- **Deliverables:** root layout regions, breakpoint grid, hero empty state.
- **Done when:** shell renders responsively with placeholder slots for header
  widgets, search, forecast, and footer.

### 1. `top-clock` — Live local-time clock
- **Requirements:** FR-CLOCK-01
- **Scope:** compact accessible clock in header, updates live while open.
- **Notes:** client component; ensure no hydration mismatch; accessible label.

### 2. `bottom-jokes` — Footer Ukrainian jokes
- **Requirements:** FR-JOKES-01; credits per BC-BRAND-02
- **Scope:** deterministic Ukrainian weather jokes, no external APIs/tracking.
- **Notes:** strings via `lib/i18n/uk.ts`; calm voice, no exclamation marks.

### 3. `city-search` — City search & geocoding
- **Requirements:** FR-SEARCH-01..05
- **Scope:** debounced input, Open-Meteo geocoding suggestions, suggestion
  rows (name/region/country/flag), select → active location + URL state,
  Enter auto-select, empty "Nothing found" state.
- **Notes:** geocoding fetch via server/route handler (TC-DATA-01).

### 4. `forecast` — 7-day + hourly forecast
- **Requirements:** FR-FORECAST-01..05
- **Scope:** 7-day daily cards, 48 h hourly Recharts line chart, sunrise/sunset
  text, re-fetch on location change, in-memory cache of last response.
- **Notes:** defines the canonical forecast data shape consumed downstream.

### 5. `comfort-score` — Comfort score
- **Requirements:** FR-COMFORT-01..05
- **Scope:** pure `comfortScore(daily)` in `lib/scoring/comfort.ts`, Ukrainian
  rationale (≤80 chars, no emoji), colored day badges, weekend (Sat+Sun avg)
  highlight atop the forecast grid.
- **Notes:** framework-free (TC-PURE-01); 100% unit-tested with Vitest.

### 6. `animated-bg` — Animated weather background
- **Requirements:** FR-ANIM-01..04
- **Scope:** condition-driven background (day/night gradient, rain/snow
  particles, cloud drift), day/night from active location's sunrise/sunset,
  `prefers-reduced-motion` → static gradient, pointer-events disabled.

### 7. `map` — Interactive OSM map
- **Requirements:** FR-MAP-01..05; TC-MAP-01
- **Scope:** Leaflet/react-leaflet OSM map bounded to location, marker+popup,
  click → reverse-geocode + set active location + re-fetch, OSM attribution,
  client-only via `dynamic({ ssr: false })` with skeleton placeholder.

### 8. `weekend-compare` — Pin & compare cities (optional)
- **Requirements:** FR-COMPARE-01..03
- **Scope:** pin up to 3 cities (chip row), "Compare weekend" toggle → 3-column
  Sat/Sun table (hi/lo, precip %, comfort), sticky headers with "make active".

## Cross-cutting constraints

These apply to **every** capability and are verified per change, not built as
separate changes:

- **Performance:** NFR-PERF-01 (TTFB ≤ 300 ms), NFR-PERF-02 (Lighthouse ≥ 90),
  NFR-PERF-03 (client JS ≤ 200 KB gz) — especially relevant to `map`.
- **Accessibility:** NFR-A11Y-01/02 (Lighthouse ≥ 95, WCAG AA, focus styles).
- **Cost/privacy:** NFR-COST-01, BC-PRIVACY-01/02/03 (keyless APIs, no
  trackers, no cookies, geolocation only on explicit action).
- **Observability/DX:** NFR-OBS-01 (silent console), NFR-DX-01 (lint+tsc+test+
  build < 60 s).
- **i18n/voice:** NFR-I18N-01 (`lib/i18n/uk.ts` + `en.ts`), BC-BRAND-01
  (Ukrainian-first, calm, no exclamation marks).
- **Stack/data:** TC-STACK-01..05, TC-DATA-01, TC-PURE-01 — fixed by accepted
  technical constraints; assume them as the baseline for each change.

## Suggested OpenSpec workflow

1. Implement capabilities in the order above. For each, run the
   `openspec-propose` skill with the capability ID and its requirement IDs.
2. Keep one OpenSpec change per capability; reference requirement IDs in the
   proposal, specs, tasks, and commits.
3. Build Phase B (`top-clock`, `bottom-jokes`) and Phase D (`comfort-score`,
   `animated-bg`) capabilities in parallel where capacity allows — they have no
   inter-dependencies within their phase.
4. `weekend-compare` is optional; schedule it only after the MVP set ships.
