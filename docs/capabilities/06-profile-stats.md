# Capability: profile-stats

- **Order:** 06 · **Phase:** 4 · **OpenSpec change:** `add-profile-stats` · **Status:** not started
- **Depends on:** time-entries, tags · **Blocks:** daily-insight (reuses aggregation), streaks
- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`

## Summary

The review surface: a profile screen plus weekly stats — a per-day bar chart, today/week/all-time
totals, and a top-tags breakdown. All aggregation is pure and unit-tested.

## Requirements

| ID | Description |
|----|-------------|
| FR-STATS-01 | Profile shows user data: name, email, auth provider, avatar |
| FR-STATS-02 | Weekly bar chart of tracked hours per day for the last 7 local days |
| FR-STATS-03 | Totals: today, this week, all-time |
| FR-STATS-04 | Per-tag breakdown for the selected period (top tags by tracked time) |
| FR-STATS-05 | Aggregation (per-day, per-week, per-tag) implemented as **pure functions**, unit-tested |
| TC-STACK-06 | Charts via a react-native-svg-based library (victory-native / gifted-charts) |

## Pure-logic surface

Per-day, per-week, and per-tag aggregation over entries (FR-STATS-05) — `packages/shared`,
unit-tested. This is the same numeric-summary shaping `daily-insight` consumes.

## Scope

- Shared: aggregation functions + `DayTotal` / period-summary contracts.
- API: stats endpoints returning pre-aggregated summaries (also reused by the insight).
- Mobile: Profile screen (FR-STATS-01), Stats screen with bar chart + totals + top tags.

## Non-goals

No AI text here — the one-sentence insight is its own capability.

## Risks / notes

Midnight-crossing entries attribute to their start day (FR-ENTRY-10). Keep aggregation pure so
`daily-insight` can feed the model numbers, never raw rows (FR-INSIGHT-04).
