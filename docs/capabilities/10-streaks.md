# Capability: streaks (optional)

- **Order:** 10 · **Phase:** 7 · **OpenSpec change:** `add-streaks` · **Status:** not started (optional)
- **Depends on:** time-entries, profile-stats · **Blocks:** —
- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`

## Summary

An optional habit loop: set a daily-hours goal and keep a Duolingo-style streak of days that hit
it. Cheap to build and the project's strongest unit-test surface (gaps, timezone edges).

## Requirements

| ID | Description |
|----|-------------|
| FR-STREAK-01 | Set a daily goal (hours) in profile settings |
| FR-STREAK-02 | A day "counts" when tracked time ≥ goal, by local date |
| FR-STREAK-03 | Current streak = consecutive counting days ending today or yesterday; shown on Profile + Timer |
| FR-STREAK-04 | Streak computation is a **pure function** over the daily-totals series, unit-tested for gaps + TZ edges |

## Pure-logic surface

Streak calculation over the per-day totals series (FR-STREAK-04) — `packages/shared`,
unit-tested for gaps, today-vs-yesterday boundaries, and timezone edges.

## Scope

- Shared: streak fn + goal/streak contracts.
- API: persist the per-user daily goal; expose streak (or compute client-side from totals).
- Mobile: goal setting in Profile; streak display on Profile + Timer screens.

## Non-goals

No notifications/reminders to defend the streak (out of scope). No multi-goal types.

## Status decision

**Optional within the MVP** — promote to core or defer to Future at scope sign-off (FR-STREAK-*).
Reuses the daily-totals aggregation from `profile-stats`.
