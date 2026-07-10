## 1. Dependencies and database schema

- [x] 1.1 No new runtime dependencies.
- [x] 1.2 No database schema changes.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: footer joke selection is deterministic per seed — `@trace FR-JOKES-01`.
- [x] 2.2 Unit: jokes contain no exclamation marks — `@trace FR-JOKES-01`.
- [x] 2.3 Run tests and confirm RED before implementation.

## 3. Domain/content logic (green)

- [x] 3.1 Add joke list and seed helpers in `lib/bottom-jokes/`.
- [x] 3.2 Add footer credit strings in `lib/i18n/uk.ts` and `lib/i18n/en.ts`.

## 4. Services and actions (green)

- [x] 4.1 No server actions required.

## 5. UI and route handlers

- [x] 5.1 Add `AppFooter` with joke and attribution links.
- [x] 5.2 Wire footer into `WeatherExplorer`; remove placeholder from `app/page.tsx`.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-bottom-jokes --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 `node scripts/check-traceability.mjs --pre-commit --check-fresh`
- [x] 6.7 Update `docs/current-state.md`
- [x] 6.8 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.6
- [x] 6.9 Manual browser smoke: joke visible; credits link out; changes with location.
- [x] 6.10 Archive after 6.1–6.9 pass
