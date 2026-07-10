# Requirements Traceability Matrix — Weather Explorer MVP

Last updated: 2026-06-27. Maps every MVP functional requirement to implementation,
automated tests, manual verification, and demo recording clips.

Legend: **Rec** = clip id in `docs/qa/demo-recordings/manifest.json`.

| FR | Capability | Implementation | Automated tests | Manual TC | Recording |
|---|---|---|---|---|---|
| FR-SHELL-01 | shell | `app/page.tsx`, `components/weather-explorer/` | `lib/shell/shell-content.test.ts` | TC-01 | 01-shell-empty |
| FR-SHELL-02 | shell | responsive grid in `weather-explorer.tsx` | `lib/shell/shell-content.test.ts` | TC-02, TC-10 | 01-shell-empty, 08-mobile-layout |
| FR-SHELL-03 | shell | hero + search empty state | `lib/shell/shell-content.test.ts` | TC-01 | 01-shell-empty |
| FR-CLOCK-01 | top-clock | `components/top-clock/`, `lib/top-clock/` | `lib/top-clock/format-local-time.test.ts` | TC-03 | 02-header-clock |
| FR-SEARCH-01 | city-search | `components/city-search/`, `lib/city-search/` | `lib/city-search/geocoding.test.ts` | TC-04 | 03-search-forecast |
| FR-SEARCH-02 | city-search | suggestion list UI | `lib/city-search/geocoding.test.ts` | TC-04 | 03-search-forecast |
| FR-SEARCH-03 | city-search | URL sync on select | `lib/city-search/geocoding.test.ts` | TC-05 | 03-search-forecast |
| FR-SEARCH-04 | city-search | Enter auto-select | `lib/city-search/geocoding.test.ts` | TC-06 | 03-search-forecast |
| FR-SEARCH-05 | city-search | inline empty message | `lib/city-search/geocoding.test.ts` | TC-07 | 03-search-forecast |
| FR-FORECAST-01 | forecast | `lib/forecast/`, `forecast-client.ts` | `lib/forecast/forecast.test.ts` | TC-08 | 03-search-forecast |
| FR-FORECAST-02 | forecast | day cards in `forecast-panel.tsx` | `lib/forecast/forecast.test.ts` | TC-08 | 03-search-forecast |
| FR-FORECAST-03 | forecast | Recharts chart (dynamic import) | `forecast-panel.test.tsx` | TC-08 | 03-search-forecast |
| FR-FORECAST-04 | forecast | sunrise/sunset note | `lib/forecast/forecast.test.ts` | TC-08 | 03-search-forecast |
| FR-FORECAST-05 | forecast | in-memory cache | `lib/forecast/forecast.test.ts` | TC-09 | 03-search-forecast |
| FR-COMFORT-01 | comfort-score | `lib/scoring/comfort.ts` | `lib/scoring/comfort.test.ts` | TC-08 | 03-search-forecast |
| FR-COMFORT-02 | comfort-score | scoring inputs | `lib/scoring/comfort.test.ts` | TC-08 | 03-search-forecast |
| FR-COMFORT-03 | comfort-score | Ukrainian rationale | `lib/scoring/comfort.test.ts` | TC-08 | 03-search-forecast |
| FR-COMFORT-04 | comfort-score | badge tiers on cards | `lib/scoring/comfort.test.ts` | TC-08 | 03-search-forecast |
| FR-COMFORT-05 | comfort-score | weekend highlight strip | `lib/forecast/forecast.test.ts` | TC-08 | 03-search-forecast |
| FR-MAP-01 | map | `components/map/`, Leaflet | `lib/map/map.test.ts` | TC-11 | 04-map-panel |
| FR-MAP-02 | map | marker popup | `lib/map/map.test.ts` | TC-11 | 04-map-panel |
| FR-MAP-03 | map | click + Nominatim reverse | `lib/map/map.test.ts` | TC-12 | 04-map-panel |
| FR-MAP-04 | map | OSM attribution | `components/map/map-view.tsx` | TC-11 | 04-map-panel |
| FR-MAP-05 | map | client-only dynamic import | `components/map/map-panel.tsx` | TC-11 | 04-map-panel |
| FR-ANIM-01 | animated-bg | `components/animated-bg/` | `lib/animated-bg/weather-condition.test.ts` | TC-13 | 05-animated-background |
| FR-ANIM-02 | animated-bg | `lib/animated-bg/daytime.ts` | `lib/animated-bg/daytime.test.ts` | TC-13 | 05-animated-background |
| FR-ANIM-03 | animated-bg | reduced-motion static fallback | `lib/animated-bg/background-visual.test.ts` | TC-14 | 06-reduced-motion |
| FR-ANIM-04 | animated-bg | `pointer-events-none` layer | `lib/animated-bg/background-visual.test.ts` | TC-13 | 05-animated-background |
| FR-COMPARE-01 | weekend-compare | pin chips | `lib/weekend-compare/pins.test.ts` | TC-15 | 07-weekend-compare |
| FR-COMPARE-02 | weekend-compare | compare table | `lib/weekend-compare/compare-table.test.ts` | TC-15 | 07-weekend-compare |
| FR-COMPARE-03 | weekend-compare | make active control | `lib/weekend-compare/compare-table.test.ts` | TC-15 | 07-weekend-compare |
| FR-JOKES-01 | bottom-jokes | `lib/bottom-jokes/jokes.ts` | `lib/bottom-jokes/jokes.test.ts` | TC-16 | 08-footer-jokes |
| BC-BRAND-02 | bottom-jokes | footer attribution links | `components/bottom-jokes/app-footer.tsx` | — | 08-footer-jokes |

## NFR / BC cross-cutting (manual + automated partial)

| ID | Evidence |
|---|---|
| BC-PRIVACY-01/02/03 | No analytics scripts; geolocation not on load; no app cookies — code review + TC-01 |
| NFR-I18N-01 | `lib/i18n/uk.ts` primary strings — spot-check TC-01 |
| NFR-OBS-01 | Healthy session console silent — TC-01, manual smoke logs |
| NFR-A11Y-01 | Focus rings on interactive controls — TC-04; full axe gate optional (`check:a11y`) |
| NFR-PERF-03 | Dynamic imports for map/chart — build output review |

## Gaps / pending live measurement

| ID | Status |
|---|---|
| NFR-PERF-01, NFR-PERF-02 | Pending live Lighthouse / p95 on deployed URL |
| TC-DEPLOY-01 | Pending Vercel preview smoke |
