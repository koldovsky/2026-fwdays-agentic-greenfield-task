## Why

Once the user can act on a nudge, those actions are worth a calm, honest reflection —
breaks done vs. snoozed — without a hint of gamification (FR-STATS-01…05, BC-CALM-01).
This closes the loop: notify emits actions, stats records and shows them.

## What Changes

- Pressing an action writes a `BreakEvent { type: "done" | "snoozed", timestamp }` to
  IndexedDB via Dexie (table `events`) (FR-STATS-01).
- Add `aggregateStats(events, range): StatsSummary` as a pure function in
  `lib/stats/stats.ts` (FR-STATS-02).
- Stats view shows breaks done vs. snoozed per day as a calm bar chart (FR-STATS-03),
  using `accent` for done and a muted tone for snoozed — never `signal` (DESIGN.md).
- The chart updates reactively via `dexie-react-hooks` `useLiveQuery` (FR-STATS-04).
- Empty state is a plain invitation line, never blank or an error (FR-STATS-05).

## Capabilities

### New Capabilities
- `stats`: record break events locally and present a calm, reactive done-vs-snoozed view.

### Modified Capabilities
<!-- none -->

## Impact

- New code: `lib/stats/stats.ts` (pure) + `lib/types.ts` additions (`BreakEvent`, `StatsSummary`),
  `src/storage/events.ts` (Dexie), Stats view + chart under `src/components/`/`src/app/`.
- New deps: `dexie`, `dexie-react-hooks` (TC-STACK-03).
- Depends on `notify` (emits the actions) and `shell` (hosts the Stats view).
