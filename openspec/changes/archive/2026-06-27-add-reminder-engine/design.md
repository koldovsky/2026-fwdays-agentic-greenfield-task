## Context

The reminder engine is the spine of the product and the only piece that is 100%
unit-testable in isolation (TC-PURE-01). It must live under `lib/` with no `next/*`,
no `react`, and no DOM globals. Time is always injected as `from: Date` so tests are
deterministic and timezone-stable. The acceptance table in `docs/requirements.md`
(AC-REMIND-01…09) is the test oracle.

## Goals / Non-Goals

**Goals:**
- A small, pure module: `computeNextReminder`, `computeSnooze`, and internal clamping helpers.
- Define the shared `Settings` type once, in `lib/types.ts`, for downstream capabilities.
- Tests that fail under mutation (maker ≠ checker gate).

**Non-Goals:**
- No persistence, scheduling, timers, or UI — those belong to `settings`, `shell`, and `notify`.
- No timezone handling beyond the host local time the `Date` already carries.

## Decisions

- **Time as parameter, not ambient.** Every function takes `from: Date`. Rationale: determinism
  and testability; forbids `new Date()` inside `lib/` (FR-REMIND-05). Alternative (reading a clock)
  rejected — untestable and violates TC-PURE-01.
- **A single `clampToWindow(settings, candidate): Date | null` helper** shared by both public
  functions, so FR-REMIND-03 and FR-REMIND-04 cannot drift apart. Alternative (duplicated logic)
  rejected as a correctness risk.
- **Half-open window `[workStart, workEnd)`.** Compare candidate minutes-of-day against `workEnd`
  with strict `<`. This makes AC-REMIND-06 (17:59 → next day) fall out naturally.
- **Weekday roll-forward loop** bounded to at most 7 iterations to find the next working day,
  guaranteeing termination even if `workingDays` is empty (return `null` in that degenerate case).
- **Parse `"HH:MM"` to minutes-of-day** with a tiny helper; reused by the window math.

## Risks / Trade-offs

- [Empty `workingDays` could loop forever] → bound the search to 7 days; return `null` if no working day exists.
- [DST transitions shift wall-clock minutes] → acceptable for MVP; windows are expressed in local
  wall time and the injected `Date` carries the host offset. Documented, not handled.
- [Midnight-spanning windows (workEnd ≤ workStart)] → out of scope for MVP; assume `workStart < workEnd`.

## Open Questions

- None blocking. Confirm `workingDays` encoding (0=Sun…6=Sat) matches `Date.getDay()`; the engine
  will use `Date.getDay()` semantics.
