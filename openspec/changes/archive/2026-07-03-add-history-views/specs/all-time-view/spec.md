## ADDED Requirements

### Requirement: All-time command shows first to latest summary

The `/весь_час` command SHALL show first→latest deltas for weight, fat %, muscle %, and BMI,
total entry count, and the date of the first entry. (FR-HIST-07)

#### Scenario: Multiple entries all time

- **WHEN** the user has ≥ 2 weigh-ins and sends `/весь_час`
- **THEN** the reply shows entry count, first-entry date, and first→latest deltas for all
  metrics

#### Scenario: Single entry all time

- **WHEN** the user has exactly one weigh-in and sends `/весь_час`
- **THEN** the reply shows entry count 1, the entry date, and values without comparison
  deltas

#### Scenario: No entries yet

- **WHEN** the user has no weigh-ins and sends `/весь_час`
- **THEN** the bot replies in Ukrainian that there is nothing to show yet

### Requirement: All-time command shows best month

When at least one calendar month has ≥ 2 entries, `/весь_час` SHALL include a line naming
the **best month** by largest weight loss. (FR-HIST-08)

#### Scenario: Best month line included

- **WHEN** a qualifying best month exists and the user sends `/весь_час`
- **THEN** the reply names that month and its weight loss in Ukrainian decimal-comma format

### Requirement: All-time omits best month when insufficient data

When no month qualifies for best-month selection, `/весь_час` SHALL omit the best-month line.
(FR-HIST-09)

#### Scenario: No qualifying month

- **WHEN** every month has at most one entry and the user sends `/весь_час`
- **THEN** the reply has no best-month line
