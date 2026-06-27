## 1. Pure aggregation

- [x] 1.1 Add `BreakEvent` and `StatsSummary` types to `lib/types.ts`
- [x] 1.2 Implement `aggregateStats(events, range)` in `lib/stats/stats.ts` (totals + `byDay`, local-day buckets) (FR-STATS-02)
- [x] 1.3 Unit-test AC-STATS-01 and AC-STATS-02; add a mutation gate

## 2. Persistence

- [x] 2.1 Add `dexie` + `dexie-react-hooks`; define the `events` Dexie schema with indexed `timestamp` (TC-STACK-03)
- [x] 2.2 Implement `src/storage/events.ts` with an append-event write path (FR-STATS-01)
- [x] 2.3 Wire notify's "done"/"snoozed" actions to write a `BreakEvent`

## 3. Stats view

- [x] 3.1 Build the calm bar chart (done = `accent`, snoozed = muted, never `signal`) (FR-STATS-03)
- [x] 3.2 Drive it with `useLiveQuery` so it updates reactively (FR-STATS-04)
- [x] 3.3 Add the friendly empty-state invitation line (FR-STATS-05)

## 4. Verify

- [x] 4.1 Run `npm run lint && npm run typecheck && npm test && npm run build`
- [x] 4.2 Run `npx openspec validate add-stats --strict`
