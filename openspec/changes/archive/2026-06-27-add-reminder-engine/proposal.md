## Why

The whole product hinges on one deterministic question: "when is the next break due?"
Building this as a pure, framework-free core first means every other capability
(settings, shell, notify) consumes a fully unit-tested contract instead of ad-hoc
date math scattered through components (TC-PURE-01).

## What Changes

- Introduce `lib/types.ts` with the shared `Settings` type consumed by every later capability.
- Add the pure reminder engine in `lib/schedule/schedule.ts`:
  - `computeNextReminder(settings, from): Date | null` (FR-REMIND-01, FR-REMIND-03).
  - `computeSnooze(settings, from): Date | null` (FR-REMIND-04).
  - Working-window clamping helpers with an exclusive right bound `[workStart, workEnd)` (FR-REMIND-02).
- All functions are deterministic — `from: Date` is passed in, never `new Date()` internally (FR-REMIND-05).
- Add Vitest unit tests covering acceptance cases AC-REMIND-01…09, including a mutation gate.

## Capabilities

### New Capabilities
- `reminder-engine`: pure scheduling core that computes the next reminder time and snooze time from settings and a supplied "now".

### Modified Capabilities
<!-- none — this is the first capability -->

## Impact

- New code: `lib/types.ts`, `lib/schedule/schedule.ts`, `lib/schedule/schedule.test.ts`.
- New dev dependency: Vitest (TC-STACK-04) and its config.
- No UI, no DOM, no persistence — strictly framework-free `lib/` (TC-PURE-01).
- Establishes the `Settings` contract that `settings`, `shell`, and `notify` depend on.
