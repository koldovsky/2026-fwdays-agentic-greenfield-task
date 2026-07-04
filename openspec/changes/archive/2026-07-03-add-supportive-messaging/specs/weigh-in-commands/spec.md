## MODIFIED Requirements

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
