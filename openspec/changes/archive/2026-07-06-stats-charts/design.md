## Context

The stats view already computes all fifteen metrics and the language breakdown.
The design system ships CSS chart components (ActivityChart, ReachBar, RepoSplit)
that consume exactly these numbers. This change lifts them into Tailwind-utility
components and lays the page out as a panelled dashboard.

## Goals / Non-Goals

**Goals:** activity + reach + repo-composition charts from existing metrics; panel
grouping; enriched profile meta line; all pure-CSS, token-styled, reduced-motion
safe.

**Non-Goals:** new API calls or metrics; a chart library (TC-STACK-05); touching
the battle view.

## Decisions

- **Reuse existing metrics.** ActivityChart ← commit/pr/issue/release; ReachBar ←
  stars/forks/watchers/followers (each scaled to the group max); RepoSplit ←
  original/forked (+ their sum as total public repos). No fetch changes.
- **Add `createdAt` to `UserProfile`.** The meta line needs the joined year;
  `buildProfile` already receives `RawUser.created_at`. Follower/following counts
  come from the existing metrics, passed to the profile header.
- **Panel wrapper.** A small `Panel` (rounded border, padding, serif `text-h2`
  title) groups each section; language + activity sit in a 2-col grid on `md+`,
  reach and repo composition are full width.
- **CSS-only charts.** Flex columns (activity), flex rows with proportional widths
  (reach), and a stacked flex bar (repo split). Widths/heights via inline style
  percentages; colors via tokens. Panels fade up on load (staggered), collapsing
  to instant under reduced motion (global handler).
- **Skeleton parity.** `StatsSkeleton` gains placeholder panels so the taller
  layout still arrives with no layout shift (FR-STATS-05).

## Risks / Trade-offs

- [Divide-by-zero on empty data] → Guard every scale with a `max(1, …)` / total
  fallback so zero-metric users render clean empty bars.
- [Bars must stay legible at tiny values] → Enforce a small minimum bar
  size so a value of 0–1 is still visible, matching the DS reference.
