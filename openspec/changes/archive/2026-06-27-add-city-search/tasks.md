## 1. Dependencies and database schema

- [x] 1.1 No new runtime or database dependencies.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: query builder skips short queries and builds Open-Meteo URLs — `@trace FR-SEARCH-01`.
- [x] 2.2 Unit: geocoding result normalization and labels include city, region, country, flag — `@trace FR-SEARCH-02`.
- [x] 2.3 Unit: selected location serializes to `lat`, `lon`, `name` URL params — `@trace FR-SEARCH-03`.
- [x] 2.4 Unit: Enter auto-select helper only selects a single suggestion — `@trace FR-SEARCH-04`.
- [x] 2.5 Unit: empty results state maps to inline "Nothing found" copy — `@trace FR-SEARCH-05`.
- [x] 2.6 Run tests and confirm RED before implementation.

## 3. Domain/content logic (green)

- [x] 3.1 Add pure geocoding helpers in `lib/city-search/`.
- [x] 3.2 Add city-search i18n strings in `lib/i18n/uk.ts` and `lib/i18n/en.ts`.

## 4. Services and actions (green)

- [x] 4.1 Add client-side geocoding fetcher with debounce-friendly in-memory cache.

## 5. UI and route handlers

- [x] 5.1 Add `components/city-search/city-search.tsx` client combobox.
- [x] 5.2 Replace shell placeholder with interactive city search.
- [x] 5.3 Show selected active-location summary without fetching forecast.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-city-search --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 `node scripts/check-traceability.mjs --pre-commit --check-fresh`
- [x] 6.7 Update `docs/current-state.md`
- [x] 6.8 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.6
- [x] 6.9 Manual browser smoke: type city, see suggestions, select one, verify URL params.
- [x] 6.10 Archive after 6.1–6.9 pass
