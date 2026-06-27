## 1. Scaffold pure core

- [x] 1.1 Add Vitest + config (`vitest.config.ts`) scoped to `lib/` (TC-STACK-04)
- [x] 1.2 Create `lib/types.ts` with the `Settings` type (workStart, workEnd, workingDays, intervalMinutes, snoozeMinutes, enabled, soundEnabled)
- [x] 1.3 Create `lib/schedule/schedule.ts` module skeleton with JSDoc exports

## 2. Implement engine

- [x] 2.1 Add `parseHHMM` and minutes-of-day helpers
- [x] 2.2 Implement `clampToWindow(settings, candidate)` with half-open `[workStart, workEnd)` and ≤7-day roll-forward (FR-REMIND-02, FR-REMIND-03)
- [x] 2.3 Implement `computeNextReminder(settings, from)` returning `null` when disabled (FR-REMIND-01, FR-REMIND-05)
- [x] 2.4 Implement `computeSnooze(settings, from)` reusing the clamp helper (FR-REMIND-04)

## 3. Tests (acceptance oracle)

- [x] 3.1 Write `lib/schedule/schedule.test.ts` covering AC-REMIND-01…07 for `computeNextReminder`
- [x] 3.2 Cover AC-REMIND-08…09 for `computeSnooze`
- [x] 3.3 Add determinism test (same inputs → same output, no clock read)
- [x] 3.4 Mutation gate: break one branch, confirm a test turns red, revert

## 4. Verify

- [x] 4.1 Verify the harness for this capability: `npm test` green (12/12); `npx eslint lib/` clean; no `lib/` typecheck errors. NOTE: repo-wide `npm run lint`/`typecheck`/`build` still fail on pre-existing untracked scaffold (`types/validator.ts`, `types/routes.d.ts`, missing `app/page|layout`) owned by the `shell` capability — out of scope here.
- [x] 4.2 Run `npx openspec validate add-reminder-engine --strict`
