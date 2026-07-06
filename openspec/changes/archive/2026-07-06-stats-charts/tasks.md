## 1. Data

- [x] 1.1 Add `createdAt` to `UserProfile` (`lib/types.ts`) and set it in
  `buildProfile` (`lib/metrics/aggregate.ts`); update the profile test

## 2. Components

- [x] 2.1 Add `Panel` (rounded border, padding, serif title) wrapper component
- [x] 2.2 Add `ActivityChart` (vertical bars: commits, PRs, issues, releases;
  height scaled to max; labelled counts) — pure CSS
- [x] 2.3 Add `ReachBar` (horizontal bars: stars, forks, watchers, followers;
  scaled to group max; value alongside) — pure CSS
- [x] 2.4 Add `RepoSplit` (stacked original vs forked bar + legend + total) —
  pure CSS, zero-repo safe

## 3. Layout

- [x] 3.1 Rebuild `StatsView`: enriched profile meta line (location · joined year
  · followers · following); metric grid in a panel (6 cols on lg); language +
  activity in a 2-col panel row; reach and repo-composition full-width panels;
  staggered fade-up
- [x] 3.2 Tweak metric labels in `lib/strings.ts` to match the dashboard
- [x] 3.3 Extend `StatsSkeleton` with placeholder chart panels (no layout shift)

## 4. Verify

- [x] 4.1 Run the gate: `npm run lint && tsc --noEmit && npm test && npm run build`
- [x] 4.2 Screenshot the stats page against the mock (charts render, empty-data
  safe)
