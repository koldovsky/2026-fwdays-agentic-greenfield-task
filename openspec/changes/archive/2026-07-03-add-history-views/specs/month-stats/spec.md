## ADDED Requirements

### Requirement: Month boundaries use Europe/Kyiv

Month aggregation SHALL use the **Europe/Kyiv** timezone for calendar month start and end.
(NFR-TZ-01)

#### Scenario: Entry near month boundary

- **WHEN** a weigh-in is recorded at 23:30 Kyiv on the last day of a month
- **THEN** it is included in that month's statistics, not the next month

### Requirement: Month baseline with carry-over

For in-month first→latest comparison, the baseline SHALL be the first entry recorded in the
month. If the first in-month entry is not on the 1st, the baseline SHALL use the last
pre-month entry as the start reference when computing first→latest deltas. (FR-HIST-06)

#### Scenario: First entry mid-month uses carry-over baseline

- **WHEN** the user's last pre-month entry is 72,0 kg and the first in-month entry is 71,5 kg
  on the 10th
- **THEN** month weight delta from baseline is computed from 72,0 kg to the latest in-month
  entry

#### Scenario: Entry on the first of month uses in-month first

- **WHEN** the first in-month entry is recorded on the 1st
- **THEN** that entry is the month baseline for first→latest deltas

### Requirement: Previous-month weight delta

When data exists for the prior calendar month, month summary logic SHALL expose a one-line
previous-month weight delta (first→latest within that month). (FR-HIST-04)

#### Scenario: Previous month has two or more entries

- **WHEN** the prior month has ≥ 2 entries
- **THEN** the previous-month weight delta is the difference between first and latest in that
  month

#### Scenario: Previous month has no entries

- **WHEN** the prior month has no entries
- **THEN** no previous-month delta line is produced

### Requirement: Best month by weight loss

All-time logic SHALL identify the calendar month with the largest weight loss (most negative
first→latest delta) among months with **≥ 2** entries. (FR-HIST-08)

#### Scenario: Month qualifies with two entries

- **WHEN** March has entries 73,0 kg and 72,0 kg and no other month has greater loss
- **THEN** March is selected as the best month

#### Scenario: Month with one entry does not qualify

- **WHEN** a month has only one entry
- **THEN** that month is not considered for best-month selection

### Requirement: Best month omitted when insufficient data

When no month has ≥ 2 entries, best-month output SHALL be omitted. (FR-HIST-09)

#### Scenario: Only single-entry months exist

- **WHEN** every calendar month has at most one entry
- **THEN** best-month result is `None` or empty
