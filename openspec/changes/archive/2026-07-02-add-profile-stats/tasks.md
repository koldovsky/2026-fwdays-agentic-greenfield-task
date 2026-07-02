## 1. Shared — date helper + contracts

- [x] 1.1 Add `packages/shared/src/dates.ts` exporting pure `localDateKey(iso)` → local `YYYY-MM-DD` (ambient device TZ), lifted verbatim from `timeEntries.ts`
- [x] 1.2 Refactor `timeEntries.ts` `groupEntriesByDay` to import `localDateKey` from `./dates` (behavior unchanged); keep `timeEntries.test.ts` green
- [x] 1.3 Add `TagTotal` (`tagId`, `name`, `color: string | null`, `totalSec`) and `PeriodTotals` (`todaySec`, `weekSec`, `allTimeSec`) to `contracts.ts` (`DayTotal` already exists)

## 2. Shared — pure aggregation (test-first)

- [x] 2.1 Write `packages/shared/src/stats.test.ts` first: fixtures covering empty input, a running entry (counts 0), a midnight-crossing entry (counts on start day), multi-tag entries, empty days in the window, and an injected fixed `now` for determinism (FR-STATS-05, TC-TEST-01)
- [x] 2.2 `stats.ts` `weeklyTotals(entries, now): DayTotal[]` — 7 buckets for `[now-6d … now]`, oldest first, empty days = 0, start-day attribution, running entries = 0 (FR-STATS-02, FR-ENTRY-10)
- [x] 2.3 `stats.ts` `periodTotals(entries, now): PeriodTotals` — `todaySec` (current local day), `weekSec` (= sum of `weeklyTotals`), `allTimeSec` (all stopped entries); running entries contribute 0 (FR-STATS-03)
- [x] 2.4 `stats.ts` period filter helpers `entriesOnDay(entries, now)` / `entriesInLastNDays(entries, now, n)` (pure, over `localDateKey`)
- [x] 2.5 `stats.ts` `tagTotals(entries): TagTotal[]` — duration counts toward every tag on an entry, untagged excluded, sorted by `totalSec` desc then name (FR-STATS-04)
- [x] 2.6 Add pure `formatHoursShort(totalSec)` to `duration.ts` (one decimal < 10h, whole otherwise) + tests, for the stat blocks
- [x] 2.7 Export `dates` + `stats` (and `formatHoursShort`) from `index.ts`; `npm run build -w @honeydo/shared`; shared `test`/`typecheck` green

## 3. Mobile — stats derivation + primitives

- [x] 3.1 `src/hooks/useStats.ts`: read `useEntries()`, capture `now` once per mount, return memoized `{ weekly, totals, tagTotalsWeek, tagTotalsAll, isLoading, isError }` (no new query key)
- [x] 3.2 `src/components/Avatar.tsx`: initials monogram (from name, else email local-part) on an accent circle, token-only; optional future `uri` prop for a photo fallback (not wired)
- [x] 3.3 `src/components/StatBlock.tsx`: value + unit + label card (accent variant for "Today"), token-only, matching the design reference
- [x] 3.4 `src/components/TopTag.tsx`: colored dot + name + proportional bar (pct of the max total) + formatted hours row, token-only

## 4. Mobile — WeekChart (react-native-svg)

- [x] 4.1 `src/components/WeekChart.tsx` on `react-native-svg`: 7 bars from `DayTotal[]`, weekday-initial labels, today's bar highlighted, bars scaled to the window max, all-zero week renders flat baseline (no divide-by-zero); tokens only, light/dark verified (TC-STACK-06, FR-THEME-03)

## 5. Mobile — Stats screen

- [x] 5.1 Rewrite `StatsScreen.tsx` (LargeTitle "Stats", `ScrollView`, `SafeAreaView`): totals row (Today accent / This week / All time via `StatBlock` + `formatHoursShort`), `WeekChart` card, top-tags card
- [x] 5.2 Top-tags card: Week/All-time `SegmentedControl` driving `tagTotalsWeek`/`tagTotalsAll`; render `TopTag` rows; calm empty state when no tagged time in the period (FR-STATS-04, NFR-OBS-01)
- [x] 5.3 Loading and error states for the screen (skeleton/placeholder + calm error), and a first-run empty state ("Track time to see your week") (NFR-OBS-01)

## 6. Mobile — Profile identity

- [x] 6.1 Extend `ProfileScreen.tsx`: add the `Avatar` monogram alongside the existing name / email / provider block, keeping appearance + Manage tags rows (FR-STATS-01)

## 7. Verify & document

- [x] 7.1 `npm run gate` (shared) green; mobile `lint` + `typecheck` green; no raw-hex/token violations in new UI
- [ ] 7.2 Manual device smoke: track time across several days + tags → Stats shows 7-day chart with today highlighted, correct Today/Week/All-time totals, top tags reorder by time, Week/All toggle works, empty state on a fresh account; Profile shows avatar + identity
- [x] 7.3 Update `docs/current-state.md` (newest-first) with what shipped + FR IDs (FR-STATS-01→05, TC-STACK-06); note deferred server aggregation + photo avatars
