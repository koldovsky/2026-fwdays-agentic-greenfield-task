# month-view

## Purpose

`/місяць` handler, Europe/Kyiv month display, and month support line (FR-HIST-03..06,
FR-MSG-05, NFR-TZ-01).

## Requirements

### Requirement: Month command shows current calendar month

The `/місяць` command SHALL show statistics for the **current calendar month** in
Europe/Kyiv: entry count and first→latest delta per metric (weight, fat %, muscle %, BMI) with
trend labels on each metric line. (FR-HIST-03, NFR-TZ-01)

#### Scenario: Multiple entries in current month

- **WHEN** the current month has ≥ 2 entries and the user sends `/місяць`
- **THEN** the reply shows entry count and labeled first→latest deltas for all four metrics

#### Scenario: No entries in current month

- **WHEN** the current month has no entries and the user sends `/місяць`
- **THEN** the bot replies in Ukrainian that there are no entries this month yet

### Requirement: Month command includes previous-month weight line

When previous-month weight data exists, `/місяць` SHALL include a **one-line** summary of
that month's weight change. (FR-HIST-04)

#### Scenario: Previous month line present

- **WHEN** the prior month has qualifying weight data and the user sends `/місяць`
- **THEN** the reply includes one line summarizing previous-month weight delta

### Requirement: Single entry in month shows sparse-data message

When the current month has exactly one entry, `/місяць` SHALL show that entry's values and the
Ukrainian phrase «ще мало даних для порівняння в місяці». (FR-HIST-05)

#### Scenario: One entry this month

- **WHEN** the current month has exactly one weigh-in and the user sends `/місяць`
- **THEN** the reply shows the values and «ще мало даних для порівняння в місяці» without
  first→latest comparison lines

### Requirement: Month command may append supportive line

When month weight change vs baseline is known (≥ 2 effective comparison points), `/місяць` MAY
append one supportive line based on the month weight trend via `pick_support_line`.
(FR-MSG-05)

#### Scenario: Supportive line when month comparison exists

- **WHEN** the current month has ≥ 2 entries or a carry-over baseline and month weight trend
  is classifiable
- **THEN** the reply may end with one supportive line

#### Scenario: No supportive line on single entry

- **WHEN** the current month has only one entry
- **THEN** the reply omits a supportive line
