## 1. Dependencies and database schema

- [x] 1.1 No new runtime dependencies.
- [x] 1.2 No database schema changes.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: pin helpers enforce max three unique cities — `@trace FR-COMPARE-01`.
- [x] 2.2 Unit: weekend compare rows include hi/lo, precip %, and comfort — `@trace FR-COMPARE-02`.
- [x] 2.3 Unit: missing weekend returns empty compare model — `@trace FR-COMPARE-03`.
- [x] 2.4 Run tests and confirm RED before implementation.

## 3. Domain/content logic (green)

- [x] 3.1 Add pure pin and compare helpers in `lib/weekend-compare/`.
- [x] 3.2 Add compare i18n strings in `lib/i18n/uk.ts` and `lib/i18n/en.ts`.

## 4. Services and actions (green)

- [x] 4.1 Reuse existing forecast client for parallel pinned-city fetches in compare mode.

## 5. UI and route handlers

- [x] 5.1 Add pinned-city chip row above the forecast column.
- [x] 5.2 Add compare-weekend toggle and table with sticky headers + make active.
- [x] 5.3 Wire compare state into `WeatherExplorer`.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-weekend-compare --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 `node scripts/check-traceability.mjs --pre-commit --check-fresh`
- [x] 6.7 Update `docs/current-state.md`
- [x] 6.8 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.6
- [x] 6.9 Manual browser smoke: pin cities, toggle compare, make active.
- [x] 6.10 Archive after 6.1–6.9 pass
