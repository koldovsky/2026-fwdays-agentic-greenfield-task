## Context

Stats is the second pure-core capability: aggregation lives in `lib/stats/stats.ts`
(framework-free, TC-PURE-01), while Dexie persistence and the chart stay thin in
`src/storage/` and `src/components/`. The acceptance cases AC-STATS-01…02 are the test
oracle. Tone is calm — no streaks, no `signal` color (BC-CALM-01, DESIGN.md).

## Goals / Non-Goals

**Goals:**
- A pure `aggregateStats` with a stable `StatsSummary` shape (totals + `byDay`).
- A thin Dexie wrapper (`events` table) and an append-on-action write path.
- A reactive, calm bar chart with a friendly empty state.

**Non-Goals:**
- No cross-device sync or server history (BC-PRIVACY-01).
- No analytics/trackers; all data on-device.

## Decisions

- **Aggregation is pure and range-bounded.** `aggregateStats(events, range)` filters to the range,
  buckets by local day, and counts by type. Rationale: deterministic tests against AC-STATS-01/02.
  Day bucketing uses local date keys so "per day" matches the user's wall calendar.
- **Dexie schema is minimal:** `events` table keyed by auto-increment id, with `timestamp` indexed
  for range queries (TC-STACK-03). `BreakEvent`/`StatsSummary` types live in `lib/types.ts`.
- **Reactivity via `useLiveQuery`** so the chart re-derives on every write (FR-STATS-04); the chart
  calls `aggregateStats` on the live event list, keeping view logic dumb.
- **Chart is hand-rolled SVG/CSS bars**, not a charting lib — small, calm, palette-locked
  (`accent`/muted, never `signal`). Avoids a heavy dependency for two series.

## Risks / Trade-offs

- [Large event history slows aggregation] → range-bound the query (e.g. current week) and index `timestamp`.
- [Timezone vs. UTC day bucketing] → bucket by local day to match user expectation; documented.
- [IndexedDB unavailable (private mode)] → degrade to the empty/invitation state, no error (FR-STATS-05).
