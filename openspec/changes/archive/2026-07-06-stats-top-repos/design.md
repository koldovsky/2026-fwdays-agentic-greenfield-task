## Context

The repos are already fetched for the metrics; this change surfaces the top ones
as links. Only display fields and a pure ranking function are new.

## Goals / Non-Goals

**Goals:** a collapsible, ranked top-10 list with links, a "view all" out-link,
and a pure ranking function with tests.

**Non-Goals:** new fetches or pagination; per-repo detail pages; touching metrics
or scoring.

## Decisions

- **`buildTopRepos(repos, limit=10)`** in `lib/metrics/aggregate.ts`: sort by
  `stargazers_count` desc, then `pushed_at` desc (newest wins ties), slice to the
  limit, map to `RepoSummary` (name, htmlUrl, description, language + color via the
  existing `languageColor`, stars, `pushedAt`). Pure and empty-safe.
- **Recency = `pushed_at`.** It reflects last activity and is what the row's
  month/year shows; used for both the tie-break and the displayed date.
- **`RepoSummary` on `UserStats.topRepos`.** Keeps the view free of raw payloads.
- **Collapsible = client island `TopRepos`.** A title button toggles an
  `aria-expanded` disclosure. Defaults to open (mock shows it open); a chevron
  reflects state. The rest of the stats view stays a server component.
- **"View all" target:** `https://github.com/{login}?tab=repositories`.
- **`formatMonthYear`** added next to the other pure formatters.

## Risks / Trade-offs

- [Forks with 0 stars crowding the list] → Acceptable: ranking by stars naturally
  pushes them last; the list is "most-starred" across all public repos.
- [Long descriptions] → Clamp to a single line with ellipsis so rows stay uniform.
