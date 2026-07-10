# PRD — Weather Explorer / Weekend Trip Planner

Last updated: 2026-05-15

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.

## ID conventions

| Prefix   | Meaning                  | Example                                   |
| -------- | ------------------------ | ----------------------------------------- |
| `FR-*`   | Functional Requirement   | `FR-SEARCH-01` — user searches city by name |
| `NFR-*`  | Non-Functional Requirement | `NFR-PERF-01` — TTFB < 300 ms             |
| `TC-*`   | Technical Constraint     | `TC-STACK-01` — Next.js 16 App Router     |
| `BC-*`   | Business / UX Constraint | `BC-PRIVACY-01` — no analytics            |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Shell & navigation

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-SHELL-01 | Single-page app with a top bar (logo, theme indicator) and a main content area                        | proposed   |
| FR-SHELL-02 | Layout adapts at 768 px and 1280 px breakpoints; mobile single-column, tablet two-column, desktop three-column | proposed   |
| FR-SHELL-03 | Empty state on first load: hero copy + city search prominently centered                               | proposed   |

### Top clock (demo capability `top-clock`)

| ID          | Description                                                                                           | Status     |
| ----------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| FR-CLOCK-01 | Header shows a compact accessible local-time clock that updates live while the page is open           | proposed   |

### City search (capability `city-search`)

| ID           | Description                                                                                              | Status     |
| ------------ | -------------------------------------------------------------------------------------------------------- | ---------- |
| FR-SEARCH-01 | User types a free-form city name into a single input; debounced suggestions appear from Open-Meteo geocoding API | proposed   |
| FR-SEARCH-02 | Each suggestion shows: city name, admin region, country, optional flag emoji                             | proposed   |
| FR-SEARCH-03 | Selecting a suggestion sets the active location; URL reflects it as `?lat=&lon=&name=`                   | proposed   |
| FR-SEARCH-04 | Pressing Enter with a single suggestion auto-selects it                                                  | proposed   |
| FR-SEARCH-05 | If the geocoding API returns zero results, show "Nothing found" inline; no error toast                   | proposed   |

### Footer jokes (capability `bottom-jokes`)

| ID          | Description                                                                                 | Status   |
| ----------- | ------------------------------------------------------------------------------------------- | -------- |
| FR-JOKES-01 | Footer area shows deterministic Ukrainian weather-themed jokes without external APIs or tracking | proposed |

### Forecast (capability `forecast`)

| ID             | Description                                                                                                | Status     |
| -------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| FR-FORECAST-01 | After a location is selected, fetch a 7-day daily forecast from Open-Meteo forecast API                    | proposed   |
| FR-FORECAST-02 | Render 7 day cards: weekday name, hi / lo °C, weather icon, precipitation probability %, wind speed        | proposed   |
| FR-FORECAST-03 | Render an hourly temperature line chart for the next 48 h using Recharts                                   | proposed   |
| FR-FORECAST-04 | Show sunrise + sunset for today as small text under the hourly chart                                       | proposed   |
| FR-FORECAST-05 | Re-fetch when location changes; cache last successful response in memory until next location switch        | proposed   |

### Map (capability `map`)

| ID        | Description                                                                                                  | Status     |
| --------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-MAP-01 | Render an OSM-tiled interactive map (Leaflet via react-leaflet) bounded to the current location              | proposed   |
| FR-MAP-02 | Show a marker at the current location with a popup naming the city                                           | proposed   |
| FR-MAP-03 | Clicking on the map updates the active location (reverse-geocoded via Open-Meteo) and re-fetches forecast    | proposed   |
| FR-MAP-04 | Display "© OpenStreetMap contributors" attribution at the bottom-right; required by OSM Tile Usage Policy    | proposed   |
| FR-MAP-05 | Map is client-only (`dynamic({ ssr: false })`); SSR placeholder is a skeleton with the same footprint        | proposed   |

### Comfort score (capability `comfort-score`)

| ID            | Description                                                                                                              | Status     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-COMFORT-01 | `comfortScore(daily): { value: 0..100; rationale: string }` is a **pure function** in `lib/scoring/comfort.ts`            | proposed   |
| FR-COMFORT-02 | Inputs: temperature feels-like, precipitation probability, wind, cloud cover, UV index                                   | proposed   |
| FR-COMFORT-03 | Output rationale is a single sentence in Ukrainian, max 80 chars, no emojis                                              | proposed   |
| FR-COMFORT-04 | Score for each day is displayed in the day card as a colored badge (green ≥ 70, yellow 40-69, red < 40)                  | proposed   |
| FR-COMFORT-05 | Score for the upcoming weekend (Sat + Sun avg) is highlighted at the top of the forecast grid                            | proposed   |

### Animated background (capability `animated-bg`)

| ID         | Description                                                                                                                          | Status     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-ANIM-01 | Background reflects current condition: day / night gradient, rain particles, snow particles, cloud drift                            | proposed   |
| FR-ANIM-02 | Daytime vs nighttime is driven by today's sunrise/sunset for the active location, not by user's clock                                | proposed   |
| FR-ANIM-03 | Animations respect `prefers-reduced-motion`: when set, render static gradient only                                                   | proposed   |
| FR-ANIM-04 | Background never blocks interaction; pointer-events disabled                                                                         | proposed   |

### Weekend compare (capability `weekend-compare`, optional)

| ID            | Description                                                                                                                                                          | Status     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-COMPARE-01 | User can pin up to 3 cities; pinned cities appear in a small chip row above the forecast                                                                             | proposed   |
| FR-COMPARE-02 | A "Compare weekend" toggle switches the view to a 3-column table for Sat / Sun: hi/lo, precip %, comfort score                                                       | proposed   |
| FR-COMPARE-03 | Each column has a sticky header with the city name and "make active" button                                                                                          | proposed   |

## Non-functional requirements

| ID            | Description                                                                                                            | Status     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| NFR-PERF-01   | Vercel Preview TTFB ≤ 300 ms on p95 for the homepage                                                                   | proposed   |
| NFR-PERF-02   | Lighthouse Performance ≥ 90 on production URL (mobile + desktop)                                                       | proposed   |
| NFR-PERF-03   | Initial client JS payload ≤ 200 KB gzipped                                                                             | proposed   |
| NFR-A11Y-01   | Lighthouse Accessibility ≥ 95; all interactive elements have visible focus styles and accessible names                | proposed   |
| NFR-A11Y-02   | Color palette meets WCAG AA contrast ratio across both light and dark themes                                          | proposed   |
| NFR-COST-01   | Zero paid API keys; all third-party data is keyless or free-tier                                                       | proposed   |
| NFR-OBS-01    | Console is silent at runtime (no warnings, no errors) on a healthy session                                             | proposed   |
| NFR-DX-01     | `npm run lint && tsc --noEmit && npm test && npm run build` finish in < 60 s on a clean checkout                       | proposed   |
| NFR-I18N-01   | Product UI strings centralised in `lib/i18n/uk.ts`; English fallback in `en.ts` (no runtime i18n library in MVP)       | proposed   |

## Technical constraints

| ID            | Description                                                                                                                            | Status     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-STACK-01   | Next.js 16.2 App Router; TypeScript strict; React 19.2                                                                                 | accepted   |
| TC-STACK-02   | Tailwind CSS 4 (PostCSS plugin); shadcn/ui base-nova; class-variance-authority                                                         | accepted   |
| TC-STACK-03   | Open-Meteo APIs (forecast + geocoding); no other weather provider                                                                      | accepted   |
| TC-STACK-04   | Leaflet + react-leaflet for maps; OSM raster tiles only                                                                                | accepted   |
| TC-STACK-05   | Vitest for unit tests on `lib/`; no Playwright in MVP — use `chrome-devtools` MCP for E2E verification recordings                      | proposed   |
| TC-DEPLOY-01  | Vercel for hosting; preview URL per PR via Git integration                                                                             | proposed   |
| TC-DATA-01    | All Open-Meteo calls happen from Server Components or Route Handlers when possible; never expose Open-Meteo URLs in the client bundle in a way that suggests they require keys | proposed   |
| TC-MAP-01     | OSM tiles include attribution; respect Tile Usage Policy (HTTPS, no scraping, valid Referer)                                          | proposed   |
| TC-PURE-01    | `lib/` is framework-free: no `next/*`, no `react`, no DOM globals — enables 100% unit-testability                                       | proposed   |

## Business / UX constraints

| ID             | Description                                                                                                          | Status     |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| BC-PRIVACY-01  | No analytics, no third-party trackers, no fingerprinting                                                             | accepted   |
| BC-PRIVACY-02  | Geolocation only via explicit user action (button "Use my location") — never on page load                            | accepted   |
| BC-PRIVACY-03  | No cookies set by the application code                                                                               | accepted   |
| BC-BRAND-01    | Visual identity follows DESIGN.md (chosen in Phase 4). UI is Ukrainian-first; tone is calm, practical, no exclamation marks | proposed   |
| BC-BRAND-02    | Footer credits Open-Meteo and OpenStreetMap with hyperlinks                                                          | proposed   |
| BC-DEMO-01     | The repo and live URL are the workshop's primary artifacts; every requirement is publicly demonstrable               | accepted   |

## Out of scope (MVP)

- Push notifications, scheduled jobs, background data refresh
- User accounts, history, favorites persisted server-side
- Marine / aviation / agriculture weather variables
- Localisation beyond UA + EN labels
- Native mobile app
- Climate / historical analysis beyond 7-day forecast