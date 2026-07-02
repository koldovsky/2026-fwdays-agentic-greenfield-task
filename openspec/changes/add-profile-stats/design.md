## Context

Entries (Phase 2) and tags (Phase 3) are live. The API returns a **flat, TZ-agnostic list**
of `TimeEntry` (newest first); the mobile client already derives everything calendar-shaped
from that list — `groupEntriesByDay` and `filterEntriesByTags` are pure functions in
`@honeydo/shared` that run on device, because "local calendar day" depends on the device
time zone. `profile-stats` is the review surface built on the same list: a weekly chart,
totals, and a top-tags breakdown, plus a Profile identity header.

Constraints:
- **FR-STATS-05 / TC-PURE-01 / TC-TEST-01** — aggregation is pure, framework-free, and
  100% unit-tested; it must be reusable by the server later (`daily-insight`, FR-INSIGHT-04).
- **FR-ENTRY-10** — an entry attributes to its **start day** (midnight-crossing counts once).
- **FR-THEME-03 / TC-STACK-06** — chart uses a react-native-svg lib and design tokens only.
- **NFR-OBS-01** — loading/empty/error states are calm and visible.
- `react-native-svg@15` is already a dependency (lucide uses it); the totals come from the
  existing `useEntries()` cache — no new query, endpoint, or DB table.

## Goals / Non-Goals

**Goals:**
- Pure aggregation in `@honeydo/shared`: weekly (7 local days), period totals
  (today/week/all-time), and per-tag totals — deterministic (take `now`), fully tested.
- Stats screen: weekly bar chart (svg) + three totals + top-tags card with a Week/All-time
  period toggle, matching the `honeydo-design` reference, with loading/empty/error states.
- Profile screen: avatar (initials monogram) + name + email + provider(s) (FR-STATS-01).

**Non-Goals:**
- **Server-side stats endpoints** — deferred to `daily-insight`, which needs the user's TZ
  to aggregate by local day server-side. The pure fns are written so it can reuse them.
- **Google profile-photo avatars** — needs `AuthUser.avatarUrl` + persistence (an `auth`
  change); this ships an initials monogram.
- **Daily goal / goal line** on the chart — belongs to `streaks` (Phase 7).
- New API/DB work of any kind.

## Decisions

### 1. Aggregate client-side over the flat list; pure fns live in `@honeydo/shared`

The Stats screen reads the existing `['time-entries']` cache and computes summaries on
device with pure functions, exactly like day-grouping and tag-filtering. This keeps
"local day" correct (device TZ) with zero new server surface. *Alternative:* server
pre-aggregated `/stats` endpoints — rejected here because the server is deliberately
TZ-agnostic; it's the right move only once `daily-insight` supplies a stored/derived TZ.
Because the functions are framework-free in `shared`, that later server reuse is a
straight import, not a rewrite.

### 2. Aggregation functions take `now` explicitly (deterministic + TZ-correct)

New `packages/shared/src/stats.ts`:
- `weeklyTotals(entries, now): DayTotal[]` — 7 buckets for `[now-6d … now]`, oldest first,
  each `{ date: 'YYYY-MM-DD', totalSec }`; empty days are `0`; start-day attribution;
  running entries count `0`.
- `periodTotals(entries, now): PeriodTotals` — `{ todaySec, weekSec, allTimeSec }`;
  `weekSec` equals the sum of `weeklyTotals` (one definition of "week").
- `tagTotals(entries): TagTotal[]` — `{ tagId, name, color, totalSec }`, sorted by
  `totalSec` desc then name; each entry's duration counts toward **every** tag it carries;
  untagged entries excluded. Period scoping is done by pre-filtering entries with a small
  `entriesInLastNDays(entries, now, n)` / `entriesOnDay` helper.

Passing `now` (vs reading the clock inside) makes every scenario a deterministic unit test.
`weekSec` is defined as the rolling 7-day window (FR-STATS-02 wording), not a Mon–Sun
calendar week, so the "This week" number always equals the chart's sum. *Trade-off:*
"this week" is rolling, not calendar — documented; simpler and self-consistent.

### 3. One definition of "local day": extract `localDateKey` to `dates.ts`

`localDateKey` is currently private in `timeEntries.ts`. Move it to
`packages/shared/src/dates.ts`, have `groupEntriesByDay` and `stats.ts` both import it, so
day bucketing can never drift between History and Stats. Pure and covered by existing +
new tests.

### 4. `WeekChart` on raw `react-native-svg` (no new dependency)

The chart is a fixed 7-bar column chart with a highlighted "today" bar and weekday labels —
small enough to draw directly with `react-native-svg` (`Rect`/`Line`/`Text`), which is
already installed and Expo-Go-friendly. This satisfies TC-STACK-06 ("charts via a
react-native-svg-based library") without pulling a heavier chart lib. *Alternatives:*
`react-native-gifted-charts` (pulls `react-native-linear-gradient`, a native dep → prebuild
config) or `victory-native` (Skia, heavy) — both overkill for one simple chart; either
remains a drop-in later if charts grow. Bars scale to the window max; an all-zero week
renders flat baseline bars (no divide-by-zero).

### 5. Presentation helpers stay pure and tested

Stat blocks show decimal hours ("6.2h", "31h", "412h"); top-tag rows show compact totals.
Add a pure `formatHoursShort(totalSec)` to `duration.ts` (one decimal under 10h, whole
otherwise) beside the existing `formatDurationCompact`, and unit-test it. Bar percentages
in the top-tags list are computed in the component from the max total.

### 6. `useStats(now)` derives from `useEntries()`; memoized

A thin `hooks/useStats.ts` calls `useEntries()` and returns
`{ weekly, totals, tagTotalsWeek, tagTotalsAll, isLoading, isError }`, each `useMemo`'d over
the entries + `now`. `now` is captured once per mount (a `useRef(new Date())`/state) so the
screen doesn't churn on every render; a minute-level refresh isn't needed for totals. No new
query key — Stats reflects the same cache that Timer/History mutate, so it stays live.

### 7. Profile avatar = initials monogram (client-only)

`components/Avatar.tsx` renders initials (from name, else email local-part) on an accent
circle, token-colored. The Profile screen keeps its current name/email/provider block and
adds the avatar. When `AuthUser.avatarUrl` later exists (an `auth` change), `Avatar` can
take an optional `uri` and render the photo with the monogram as fallback — designed for
that but not wired now.

## Risks / Trade-offs

- **"This week" is a rolling 7-day window, not a calendar week** → matches FR-STATS-02 and
  keeps totals == chart sum; documented in copy if needed.
- **Multi-tag entries count toward each tag** → per-tag totals can exceed the period total;
  this is the intended "time spent on X" reading, called out in the spec.
- **All-time total grows unbounded** → `formatHoursShort` switches to whole hours so large
  numbers stay legible; aggregation is O(n) and memoized, fine at MVP data sizes.
- **`now` captured at mount** → crossing local midnight while the screen stays open won't
  reshuffle the window until remount/refetch; acceptable for a review screen (mitigate later
  with an app-foreground refresh if needed).
- **Avatar is initials-only** → Google users won't see their photo yet; explicitly a
  follow-up (`auth` contract + persistence), not a regression (there was no avatar before).

## Migration Plan

1. Shared, test-first: `dates.ts` (`localDateKey`) + refactor `timeEntries.ts`; `stats.ts`
   (`weeklyTotals`, `periodTotals`, `tagTotals`, period filters) + `stats.test.ts`;
   `TagTotal`/`PeriodTotals` contracts; `formatHoursShort` + test. `npm run build -w
   @honeydo/shared`.
2. Mobile: `Avatar`, `StatBlock`, `TopTag`, `WeekChart` components; `useStats` hook; rewrite
   `StatsScreen`; extend `ProfileScreen`. Tokens only; verify light/dark.
3. `lint && typecheck && test` on shared and mobile.
Rollback: revert the mobile screens (placeholders return) and drop `stats.ts`/`dates.ts`
re-export — additive, nothing else depends on it yet.

## Open Questions

- None blocking. If product wants a Mon–Sun calendar "this week" instead of a rolling
  7-day window, that's a one-line change in `periodTotals` + a matching chart axis; deferred
  unless requested.
