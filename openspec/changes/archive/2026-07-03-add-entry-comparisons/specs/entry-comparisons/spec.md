## ADDED Requirements

### Requirement: Per-metric delta vs previous entry

The system SHALL compute the difference between the current entry and the immediately previous
entry for weight (kg), fat (%), muscle (%), and BMI when a previous entry exists. (FR-CMP-01)

#### Scenario: Second entry shows four deltas

- **WHEN** a user logs a second weigh-in after an existing entry
- **THEN** the comparison output includes per-metric deltas vs the previous entry for weight,
  fat %, muscle %, and BMI

#### Scenario: First entry has no previous deltas

- **WHEN** a user logs their first weigh-in
- **THEN** no «vs previous» delta lines are produced

### Requirement: Weight delta vs first entry

When the user has at least two weigh-ins, the system SHALL compute and display the weight delta
between the current entry and the user's first (earliest) entry, labeled «від старту». (FR-CMP-02)

#### Scenario: Weight from start on third log

- **WHEN** a user logs a third weigh-in
- **THEN** the comparison output includes a weight delta vs the first entry («від старту») in
  addition to deltas vs the previous entry

#### Scenario: Single entry omits from-start line

- **WHEN** the user has only one weigh-in after logging
- **THEN** no «від старту» weight delta line is shown

### Requirement: Baseline confirmation for first entry

When the logged entry is the user's first, the confirmation SHALL acknowledge it as the baseline
without previous-entry deltas. (FR-CMP-03)

#### Scenario: Baseline message

- **WHEN** a user logs their first weigh-in successfully
- **THEN** the confirmation includes a Ukrainian baseline line such as «стартова точка» and does
  not show «vs previous» deltas

### Requirement: Ukrainian delta formatting

Displayed deltas SHALL use a Ukrainian decimal comma and a minus sign for negative values (e.g.
`−0,6`). Positive deltas SHALL use an explicit `+` prefix. (FR-CMP-04)

#### Scenario: Negative delta display

- **WHEN** weight decreased by 0.6 kg vs the previous entry
- **THEN** the formatted delta reads `−0,6` (Unicode minus, comma decimal)

#### Scenario: Positive delta display

- **WHEN** fat % increased by 0.3 points vs the previous entry
- **THEN** the formatted delta reads `+0,3`
