## 1. Dependencies and database schema

- [x] 1.1 Add `recharts` runtime dependency for the 48-hour temperature chart.
- [x] 1.2 No database schema changes.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: forecast URL builder requests required Open-Meteo daily/hourly fields — `@trace FR-FORECAST-01`.
- [x] 2.2 Unit: forecast normalization yields 7 day cards with weather display fields — `@trace FR-FORECAST-02`.
- [x] 2.3 Unit: hourly chart model includes the first 48 temperature points — `@trace FR-FORECAST-03`.
- [x] 2.4 Unit: today's sunrise/sunset are formatted from daily data — `@trace FR-FORECAST-04`.
- [x] 2.5 Unit: memory cache returns same-location response and misses on new location — `@trace FR-FORECAST-05`.
- [x] 2.6 Unit: comfort badge and weekend highlight data are attached — `@trace FR-COMFORT-04, FR-COMFORT-05`.
- [x] 2.7 Run tests and confirm RED before implementation.
- [x] 2.8 Render-level forecast view test covers cards, chart section, sun note, comfort text, and weekend highlight.

## 3. Domain/content logic (green)

- [x] 3.1 Add pure forecast URL, normalization, icon, and cache helpers in `lib/forecast/`.
- [x] 3.2 Add forecast i18n strings in `lib/i18n/uk.ts` and `lib/i18n/en.ts`.

## 4. Services and actions (green)

- [x] 4.1 Add client-side forecast fetcher using the pure helpers and memory cache.

## 5. UI and route handlers

- [x] 5.1 Add shared `WeatherExplorer` client wrapper for city search + forecast state.
- [x] 5.2 Add forecast panel with loading/error/empty states.
- [x] 5.3 Render seven day cards with comfort badges.
- [x] 5.4 Render dynamic Recharts 48-hour temperature chart.
- [x] 5.5 Render today's sunrise/sunset note and weekend comfort highlight.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-forecast --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 `node scripts/check-traceability.mjs --pre-commit --check-fresh`
- [x] 6.7 Update `docs/current-state.md`
- [x] 6.8 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.6
- [x] 6.9 Manual browser smoke: select city, see forecast cards/chart/sun note/comfort badges.
- [x] 6.10 Archive after 6.1–6.9 pass
- [x] 6.11 Resolve local `SQLITE_FULL`/terminal-runner disk issue blocking command reruns.
