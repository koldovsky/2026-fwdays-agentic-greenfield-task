## Why

Entries and tags exist, but the user has no way to see *how they spent their time*.
`profile-stats` is the review surface (Phase 4): a Profile screen that shows who's signed
in, and a Stats screen with a weekly bar chart, today/week/all-time totals, and a top-tags
breakdown. The aggregation is pure and unit-tested — the same numeric summary that
`daily-insight` (Phase 5) will feed to the model, never raw rows (FR-INSIGHT-04).

## What Changes

- **Shared (`@honeydo/shared`)** — a new framework-free `stats` module with pure,
  unit-tested aggregation over `TimeEntry[]` (TC-PURE-01, FR-STATS-05):
  - `weeklyTotals(entries, now)` → the last **7 local days** as `DayTotal[]`, oldest→newest
    (FR-STATS-02).
  - `periodTotals(entries, now)` → `{ todaySec, weekSec, allTimeSec }` (FR-STATS-03).
  - `tagTotals(entries)` / period-scoped tag totals → `TagTotal[]` sorted by tracked time
    (FR-STATS-04).
  - Entries attribute to their **start day** (FR-ENTRY-10); running entries count 0. All
    functions take `now` explicitly so they're deterministic and TZ-correct in tests.
  - New `TagTotal` (and `PeriodTotals`) contracts; `DayTotal` already exists. A small
    `localDateKey` date helper is extracted so `timeEntries` and `stats` share one
    definition of "local day".
- **Mobile (`@honeydo/mobile`)** — fill the two placeholder tabs:
  - **Stats screen** (FR-STATS-02/03/04): a weekly bar chart, a three-up totals row
    (Today / This week / All time), and a top-tags card with a Week/All-time period toggle.
    Loading, empty, and error states are calm and visible (NFR-OBS-01).
  - A **`WeekChart`** component built on `react-native-svg` (already a dependency), a
    reusable **`StatBlock`** and **`TopTag`** row, and an **`Avatar`** monogram — all
    token-only, matching the `honeydo-design` Stats/Profile reference (TC-STACK-06).
  - **Profile screen** (FR-STATS-01): show the signed-in user's avatar (initials monogram),
    name, email, and auth provider — extending the existing Profile tab.
  - A tiny `useStats(now)` hook that derives the memoized summaries from the existing
    `useEntries()` cache (no new query).

## Capabilities

### New Capabilities
- `profile-stats`: profile identity display (FR-STATS-01), weekly hours chart (FR-STATS-02),
  today/week/all-time totals (FR-STATS-03), per-tag breakdown for a selected period
  (FR-STATS-04), and pure, unit-tested aggregation (FR-STATS-05) rendered with a
  react-native-svg chart (TC-STACK-06).

### Modified Capabilities
<!-- None. Aggregation reuses the existing flat `/time-entries` list; no requirement of an
     existing capability changes. Server-side pre-aggregation and Google-photo avatars are
     out of scope (see Impact). -->

## Impact

- **Contracts:** `packages/shared/src/contracts.ts` gains `TagTotal` and `PeriodTotals`
  (`DayTotal` already present). New `packages/shared/src/stats.ts` + `stats.test.ts`, and a
  new `packages/shared/src/dates.ts` (`localDateKey`) reused by `timeEntries.ts`. Exported
  from `index.ts`. Build `@honeydo/shared` before the apps.
- **Mobile:** rewrite `StatsScreen.tsx`; extend `ProfileScreen.tsx` (avatar + identity);
  new `components/WeekChart.tsx`, `components/StatBlock.tsx`, `components/TopTag.tsx`,
  `components/Avatar.tsx`; new `hooks/useStats.ts`. Consumes `useEntries()`; no new API
  client code.
- **No API / DB changes.** Aggregation runs client-side over the flat entries list because
  "local calendar day" depends on the device time zone (the same reason `groupEntriesByDay`
  and `filterEntriesByTags` are client-side). The pure functions live in `shared` so the
  server can reuse them for `daily-insight` with an explicit TZ.
- **Out of scope (deferred):**
  - Server-side stats endpoints returning pre-aggregated summaries — deferred to
    `daily-insight` (Phase 5), where the server needs the user's time zone anyway.
  - **Google profile-photo avatars** — needs an `AuthUser.avatarUrl` contract + persistence
    (an `auth` change). This change ships an initials monogram; photos are a follow-up.
  - **Daily goals / goal line** on the chart — belongs to `streaks` (Phase 7).
