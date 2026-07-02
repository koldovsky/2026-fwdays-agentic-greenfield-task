# profile-stats Specification

## Purpose

The review surface: a Profile screen that shows who's signed in, and a Stats screen with a
weekly hours chart, today/week/all-time totals, and a per-tag breakdown. All aggregation is
pure, framework-free, and unit-tested so it can also feed `daily-insight` numeric summaries.
(FR-STATS-01→05, TC-STACK-06)

## Requirements

### Requirement: Profile shows the signed-in user

The Profile screen SHALL show the authenticated user's identity: an avatar, their display
name, their email, and the sign-in provider(s) linked to the account. When no display name
is set, the email SHALL stand in for it, and the avatar SHALL fall back to an initials
monogram derived from the name or email. (FR-STATS-01)

#### Scenario: Signed-in user with a name

- **WHEN** a signed-in user opens the Profile screen and their account has a display name
- **THEN** the screen shows their avatar, name, email, and auth provider(s)

#### Scenario: User without a display name

- **WHEN** the account has no display name
- **THEN** the email is shown as the primary identity and the avatar shows initials derived
  from the email

### Requirement: Weekly hours chart

The Stats screen SHALL show a bar chart of tracked hours per day for the **last 7 local
days** (the current local day and the six preceding local days), oldest day first. Each
entry's duration attributes entirely to its **start day** (a midnight-crossing entry counts
on the day it began); a day with no tracked time SHALL render as an empty (zero-height) bar,
and the current day SHALL be visually distinguished. (FR-STATS-02, FR-ENTRY-10)

#### Scenario: Seven days rendered oldest-first

- **WHEN** the Stats screen loads with tracked time in the past week
- **THEN** exactly seven bars are shown, one per local day, oldest on the left and today on
  the right, today highlighted

#### Scenario: Empty day shows a zero bar

- **WHEN** a day in the window has no tracked time
- **THEN** that day still appears with a zero-height bar, keeping the seven-day axis intact

#### Scenario: Midnight-crossing entry counts on its start day

- **WHEN** an entry starts before local midnight and stops after it
- **THEN** its full duration is counted on the day it started, not split across two days

### Requirement: Today, this week, and all-time totals

The Stats screen SHALL show three totals: time tracked **today** (the current local day),
**this week** (the sum over the same last-7-local-days window as the chart), and **all
time** (every stopped entry). A currently running entry SHALL contribute zero to every
total until it is stopped. (FR-STATS-03)

#### Scenario: Totals reflect tracked time

- **WHEN** the user has stopped entries across today, the past week, and earlier
- **THEN** the Today, This week, and All time totals each show the summed durations for
  their period

#### Scenario: Running entry excluded from totals

- **WHEN** an entry is currently running
- **THEN** it adds nothing to any total until stopped

### Requirement: Per-tag breakdown for the selected period

The Stats screen SHALL show a breakdown of tracked time per tag for a selected period
(this week or all time), ordered by tracked time descending (the top tags). An entry's
duration SHALL count toward **each** tag assigned to it. Entries with no tags SHALL be
excluded from the breakdown. When no tagged time exists in the period, a calm empty state
SHALL be shown. (FR-STATS-04)

#### Scenario: Top tags ordered by time

- **WHEN** the user has tracked time against several tags in the selected period
- **THEN** the breakdown lists tags ordered from most to least tracked time, each with its
  color and total

#### Scenario: Changing the period updates the breakdown

- **WHEN** the user switches the period between "This week" and "All time"
- **THEN** the tag breakdown recomputes over the newly selected period

#### Scenario: No tagged time

- **WHEN** no entries in the selected period carry a tag
- **THEN** the breakdown shows an empty state rather than an error or blank space

### Requirement: Aggregation is pure and unit-tested

Per-day, per-week (period), and per-tag aggregation SHALL be implemented as **pure,
framework-free functions** in `@honeydo/shared` (no Nest, Prisma, or React Native imports)
and SHALL be unit-tested, including empty input, running entries, midnight-crossing
entries, and multi-tag entries. The functions SHALL take the reference "now" as an argument
so results are deterministic and time-zone correct under test. (FR-STATS-05, TC-PURE-01,
TC-TEST-01)

#### Scenario: Deterministic aggregation under test

- **WHEN** the aggregation functions are called with a fixed set of entries and an explicit
  `now`
- **THEN** they return the same per-day, period, and per-tag totals every time, independent
  of the machine clock

#### Scenario: Edge cases covered

- **WHEN** input includes no entries, a running entry, a midnight-crossing entry, and a
  multi-tag entry
- **THEN** unit tests assert the correct totals for each case

### Requirement: Charts render with a react-native-svg library

The weekly chart SHALL be rendered with a `react-native-svg`-based implementation and use
design tokens only (no raw hex, honoring light/dark as a token swap). (TC-STACK-06,
FR-THEME-03)

#### Scenario: Chart uses tokens and svg

- **WHEN** the weekly chart renders in either light or dark mode
- **THEN** it is drawn with react-native-svg and colored entirely from theme tokens,
  switching correctly between schemes
