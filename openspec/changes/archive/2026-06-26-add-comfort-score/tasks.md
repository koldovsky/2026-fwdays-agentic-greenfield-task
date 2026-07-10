## 1. Dependencies and database schema

- [x] 1.1 Add `vitest` dev dependency + `vitest.config.ts`

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: `comfortScore` warm dry, invalid input, purity — `@trace FR-COMFORT-01`
- [x] 2.2 Unit: precip/wind sensitivity — `@trace FR-COMFORT-02`
- [x] 2.3 Unit: rationale UA/length/emoji/rain/UV — `@trace FR-COMFORT-03`
- [x] 2.4 Unit: badge tiers + boundaries — `@trace FR-COMFORT-04`
- [x] 2.5 Unit: weekend highlight avg + missing weekend — `@trace FR-COMFORT-05`
- [x] 2.6 Eval: `evals/cases/comfort.eval.ts` — `@trace FR-COMFORT-03`
- [x] 2.7 Confirmed red then green during implementation

## 3. Domain logic (green)

- [x] 3.1 `lib/scoring/comfort.ts` — `comfortScore`, `comfortBadgeTier`, `weekendComfortHighlight`
- [x] 3.2 `scripts/check-traceability.mjs` recognizes categorized IDs such as `FR-COMFORT-01`

## 4. Services and actions (green)

- [x] 4.1 N/A — no server actions in this slice

## 5. UI and route handlers

- [x] 5.1 Wire comfort badges into forecast day cards (deferred to `add-forecast` integration)
- [x] 5.2 Wire weekend highlight strip above forecast grid (deferred to `add-forecast` integration)

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-comfort-score --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 Run review-gate workflow; fix all confirmed findings; re-run 6.1–6.5
- [x] 6.7 Update `docs/current-state.md` (README unchanged until user-visible UI lands)
- [x] 6.8 Manual smoke: import `comfortScore` in Node REPL with warm/rainy fixtures
- [x] 6.9 Archive after 6.1–6.8 pass
