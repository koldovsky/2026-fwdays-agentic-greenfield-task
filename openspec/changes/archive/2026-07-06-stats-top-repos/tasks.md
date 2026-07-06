## 1. Data

- [x] 1.1 Add `description`, `html_url`, `pushed_at` to `RawRepo`
  (`lib/github/types.ts`)
- [x] 1.2 Add `RepoSummary` type and `topRepos: RepoSummary[]` to `UserStats`
  (`lib/types.ts`)
- [x] 1.3 Add `buildTopRepos(repos, limit=10)` (stars desc, ties by `pushed_at`
  desc, cap 10) in `lib/metrics/aggregate.ts`; wire into `buildUserStats`
- [x] 1.4 Add `formatMonthYear` to `lib/metrics/format.ts`
- [x] 1.5 Vitest: ranking order, tie-break by recency, cap at 10, empty-safe

## 2. UI

- [x] 2.1 Add strings: section title, subtitle, "View all repositories on GitHub"
- [x] 2.2 Add `TopRepos` client component: collapsible title (aria-expanded +
  chevron); ranked rows (rank, name link, language dot, description, stars, date);
  "view all" out-link; empty state
- [x] 2.3 Add the panel to `StatsView` after Repository composition; extend
  `StatsSkeleton` placeholder

## 3. Verify

- [x] 3.1 Run the gate: `npm run lint && tsc --noEmit && npm test && npm run build`
- [x] 3.2 Screenshot the stats page (expanded + collapsed) against the mock
