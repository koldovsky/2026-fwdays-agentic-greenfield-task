# stats Specification

## Purpose

The stats capability records each break action the user takes and surfaces a calm,
reactive view of their habits over time. It owns the `BreakEvent` persistence in
IndexedDB (via Dexie), the pure `aggregateStats` aggregation in `lib/stats/`, and the
reactive bar-chart view with a friendly empty state. It never shows a blank screen or
an error when there is no data yet.

## Requirements

### Requirement: Record break events
The system SHALL, when the user presses a break action, write a
`BreakEvent { type: "done" | "snoozed", timestamp }` to IndexedDB via Dexie in the
`events` table (backs FR-STATS-01).

#### Scenario: Done action is recorded
- **WHEN** the user chooses "Took a break"
- **THEN** a `BreakEvent` with `type: "done"` and the current timestamp is stored in the `events` table

#### Scenario: Snooze action is recorded
- **WHEN** the user chooses "Snooze"
- **THEN** a `BreakEvent` with `type: "snoozed"` and the current timestamp is stored

### Requirement: Pure stats aggregation
The system SHALL expose `aggregateStats(events, range): StatsSummary` as a pure function
in `lib/stats/stats.ts`, counting done vs. snoozed totals and per-day breakdown over the
given range (backs FR-STATS-02).

#### Scenario: Aggregate over a range
- **WHEN** `aggregateStats` receives `[done@Mon, done@Mon, snoozed@Tue]` over range Mon–Sun
- **THEN** it returns `done = 2, snoozed = 1` with `byDay` `[Mon {2,0}, Tue {0,1}]` (AC-STATS-01)

#### Scenario: Empty input
- **WHEN** `aggregateStats` receives an empty array
- **THEN** it returns `done = 0, snoozed = 0` and `byDay = []` (AC-STATS-02)

### Requirement: Calm reactive chart
The system SHALL show breaks done vs. snoozed per day as a calm bar chart that updates
reactively as new events are recorded, using `dexie-react-hooks` `useLiveQuery`
(backs FR-STATS-03, FR-STATS-04). Bars use `accent` for done and a muted tone for snoozed.

#### Scenario: Chart updates on new event
- **WHEN** a new `BreakEvent` is recorded while the Stats view is open
- **THEN** the bar chart updates without a manual reload

### Requirement: Friendly empty state
The system SHALL show a plain invitation line when there are no events, never a blank
screen or an error (backs FR-STATS-05).

#### Scenario: No events yet
- **WHEN** the Stats view opens with an empty `events` table
- **THEN** a short invitation line is shown instead of an empty or error state
