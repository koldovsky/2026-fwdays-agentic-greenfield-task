# weigh-in-commands

## Purpose

Telegram handlers for logging and undoing weigh-ins via `/вага` and `/скасувати`.

## Requirements

### Requirement: Weigh-in input hint

When the user invokes `/вага`, the bot SHALL reply in Ukrainian with a format hint
and an example before accepting the four numbers. (FR-LOG-05)

#### Scenario: Hint on command

- **WHEN** an allowlisted user sends `/вага`
- **THEN** the bot replies in Ukrainian explaining the four-number format with an
  example such as `72,4 28,5 32,1 24,8`

### Requirement: Invalid input error message

When weigh-in parsing fails, the bot SHALL reply in Ukrainian with a clear example of
valid input. (FR-LOG-04)

#### Scenario: Parse failure response

- **WHEN** the user sends malformed input after `/вага`
- **THEN** the bot replies in Ukrainian including an example like
  `72,4 28,5 32,1 24,8`

### Requirement: Successful weigh-in persistence

When parsing succeeds, the bot SHALL persist `recorded_at`, `weight_kg`, `fat_pct`,
`muscle_pct`, and `bmi` for the user and confirm in Ukrainian. The confirmation SHALL include
comparison output per `entry-comparisons`: baseline acknowledgment on the first entry, per-metric
deltas vs the previous entry when applicable, and weight «від старту» when at least two entries
exist. When a weight delta vs the previous entry exists, the confirmation SHALL also append one
supportive line per `supportive-messaging`. (FR-LOG-06, FR-CMP-01..03, FR-MSG-03)

#### Scenario: Valid log saved

- **WHEN** the user sends four valid numbers after `/вага`
- **THEN** a row is inserted into `weigh_ins` and the bot confirms the saved values

#### Scenario: First log includes baseline

- **WHEN** the user's first weigh-in is saved successfully
- **THEN** the confirmation includes baseline acknowledgment and no previous-entry deltas

#### Scenario: Subsequent log includes comparisons

- **WHEN** the user saves a second or later weigh-in successfully
- **THEN** the confirmation includes per-metric deltas vs the previous entry and, when at least
  two entries exist, a weight delta «від старту»

#### Scenario: Subsequent log includes supportive line

- **WHEN** the user saves a second or later weigh-in successfully
- **THEN** the confirmation appends one supportive Ukrainian line based on weight trend vs the
  previous entry

#### Scenario: First log omits supportive line

- **WHEN** the user's first weigh-in is saved successfully
- **THEN** the confirmation does not append a supportive line

### Requirement: Undo latest entry

The `/скасувати` command SHALL remove the user's most recent weigh-in and confirm in
Ukrainian. (FR-LOG-07)

#### Scenario: Undo with existing entry

- **WHEN** the user sends `/скасувати` and at least one weigh-in exists
- **THEN** the latest entry is deleted and the bot confirms in Ukrainian

#### Scenario: Undo with no entries

- **WHEN** the user sends `/скасувати` and no weigh-ins exist
- **THEN** the bot replies in Ukrainian that there is nothing to undo

### Requirement: Logging allowed any day

The bot SHALL accept weigh-ins on any day of the week with no Sunday-only gate.
(FR-LOG-08)

#### Scenario: Log on non-Sunday

- **WHEN** an allowlisted user successfully logs on a weekday
- **THEN** the entry is persisted without day-of-week rejection
