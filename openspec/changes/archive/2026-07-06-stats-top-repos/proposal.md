## Why

The stats page shows aggregate signals but no way to jump to the actual work. A
"Top repositories" section surfaces the developer's most-starred repos as direct
links, with a path out to their full repo list on GitHub.

## What Changes

- Add a collapsible **Top repositories** panel to the stats page: a clickable
  title that expands/collapses a ranked list.
- List the **10 most-starred** repositories; ties broken by most-recent activity
  (newest first). Each row: rank, repo name (link to GitHub), primary language
  with its color dot, description, star count, and the month/year.
- Below the list, a **"View all repositories on GitHub →"** link to the user's
  repositories tab.
- Extend the data layer to carry per-repo `description`, `html_url`, and
  `pushed_at`; add a pure `buildTopRepos` ranking function and `topRepos` on
  `UserStats`.

No change to the fifteen metrics, scoring, or the fetch endpoints (the repos are
already fetched).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `user-stats`: adds the top-repositories section.
- `github-data`: `UserStats` gains a `topRepos` list built by a pure function.

## Impact

- **Code:** `lib/github/types.ts` (repo fields), `lib/types.ts` (`RepoSummary`,
  `UserStats.topRepos`), `lib/metrics/aggregate.ts` (`buildTopRepos` + tests),
  `lib/metrics/format.ts` (`formatMonthYear`), `lib/strings.ts`; new
  `app/components/TopRepos.tsx` (client, collapsible); `StatsView.tsx`,
  `Skeleton.tsx`.
- **Specs:** deltas to `openspec/specs/user-stats/spec.md` and
  `openspec/specs/github-data/spec.md`.
