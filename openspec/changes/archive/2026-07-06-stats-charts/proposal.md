## Why

The stats page shows the fifteen metrics as numbers plus a language donut, but
the same aggregate data reads far better as charts. The design system already
ships the components for this (ActivityChart, ReachBar, RepoSplit) per TC-STACK-05.
Adding them turns the page into a proper dashboard and uses the numbers we already
compute — no new data.

## What Changes

- Add a **Recent activity** bar chart (the four 90-day event metrics: commits,
  pull requests, issues, releases) beside the language breakdown.
- Add a **Reach & influence** horizontal bar chart (stars, forks, watchers,
  followers), each bar scaled to the largest value.
- Add a **Repository composition** stacked bar (original vs forked) with the total
  public-repo count.
- Group the sections into titled panels; lay the language + activity charts
  side-by-side on wider screens.
- Enrich the profile meta line with the joined year and follower/following counts.
- Minor metric-label wording to match the dashboard ("Forks received",
  "PRs · 90d", "Issues · 90d", "Releases · 90d").

No change to the data layer, scoring, or the fifteen computed metrics.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `user-stats`: adds activity, reach, and repository-composition charts to the
  stats view, panel grouping, and an enriched profile meta line.

## Impact

- **Code:** new `app/components/{ActivityChart,ReachBar,RepoSplit,Panel}.tsx`;
  `StatsView.tsx`, `Skeleton.tsx`; add `createdAt` to `UserProfile`
  (`lib/types.ts`, `lib/metrics/aggregate.ts`); label tweaks in `lib/strings.ts`.
- **Charts:** pure CSS (flex bars, stacked bar) per TC-STACK-05 — no chart library.
- **Specs:** delta to `openspec/specs/user-stats/spec.md`.
