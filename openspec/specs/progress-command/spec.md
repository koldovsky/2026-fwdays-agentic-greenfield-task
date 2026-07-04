# progress-command

## Purpose

`/прогрес` handler reusing compare, trends, and supportive messaging (FR-HIST-02, FR-MSG-03).

## Requirements

### Requirement: Progress command shows latest entry and comparisons

The `/прогрес` command SHALL show the latest weigh-in values, numeric deltas vs the previous
entry and vs the first entry, and per-metric trend labels on the vs-previous lines.
(FR-HIST-02)

#### Scenario: Latest entry with previous and start

- **WHEN** the user has ≥ 2 weigh-ins and sends `/прогрес`
- **THEN** the reply includes latest metric values, a comparison block vs previous with trend
  labels, and a weight delta vs start

#### Scenario: Only one entry shows baseline

- **WHEN** the user has exactly one weigh-in and sends `/прогрес`
- **THEN** the reply shows the entry values and baseline confirmation without vs-previous deltas

#### Scenario: No entries yet

- **WHEN** the user has no weigh-ins and sends `/прогрес`
- **THEN** the bot replies in Ukrainian prompting the user to log via `/вага`

### Requirement: Progress command appends supportive line

When a weight delta vs the previous entry exists, `/прогрес` SHALL append one supportive
Ukrainian line selected by weight trend via `pick_support_line`. (FR-MSG-03)

#### Scenario: Supportive line on second or later entry

- **WHEN** the user has ≥ 2 weigh-ins and sends `/прогрес`
- **THEN** the reply ends with one supportive line prefixed by display name when set

#### Scenario: No supportive line on first entry only

- **WHEN** the user has exactly one weigh-in and sends `/прогрес`
- **THEN** the reply omits a supportive line
