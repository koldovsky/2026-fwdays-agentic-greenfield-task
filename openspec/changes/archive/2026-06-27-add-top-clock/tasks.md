## 1. Dependencies and database schema

- [x] 1.1 No new runtime dependencies.
- [x] 1.2 No database schema changes.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: local time formatter returns 24-hour `HH:MM` — `@trace FR-CLOCK-01`.
- [x] 2.2 Run tests and confirm RED before implementation.

## 3. Domain/content logic (green)

- [x] 3.1 Add pure formatter in `lib/top-clock/format-local-time.ts`.
- [x] 3.2 Add clock i18n strings in `lib/i18n/uk.ts` and `lib/i18n/en.ts`.

## 4. Services and actions (green)

- [x] 4.1 No server actions required.

## 5. UI and route handlers

- [x] 5.1 Add client `TopClock` with minute tick and hydration-safe rendering.
- [x] 5.2 Wire clock into `app/page.tsx` header between wordmark and theme indicator.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-top-clock --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 `node scripts/check-traceability.mjs --pre-commit --check-fresh`
- [x] 6.7 Update `docs/current-state.md`
- [x] 6.8 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.6
- [x] 6.9 Manual browser smoke: clock visible and ticks across a minute boundary.
- [x] 6.10 Archive after 6.1–6.9 pass
