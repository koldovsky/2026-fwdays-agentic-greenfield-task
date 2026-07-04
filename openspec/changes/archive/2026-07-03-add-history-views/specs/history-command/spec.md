## ADDED Requirements

### Requirement: History command lists last eight entries

The `/історія` command SHALL reply with a compact Ukrainian table of the **last 8** weigh-in
entries, each row showing date, weight (kg), fat %, muscle %, and BMI. (FR-HIST-01)

#### Scenario: Eight or more entries show latest eight

- **WHEN** the user has ≥ 8 weigh-ins and sends `/історія`
- **THEN** the reply lists exactly 8 rows ordered newest first with date and all four metrics

#### Scenario: Fewer than eight entries show all

- **WHEN** the user has fewer than 8 weigh-ins and sends `/історія`
- **THEN** the reply lists all entries ordered newest first

#### Scenario: No entries yet

- **WHEN** the user has no weigh-ins and sends `/історія`
- **THEN** the bot replies in Ukrainian that there is nothing to show yet

### Requirement: History view is factual only

The `/історія` reply SHALL contain only tabular data and neutral headers — no supportive
paragraphs or trend-based encouragement. (FR-MSG-06)

#### Scenario: No supportive line in history table

- **WHEN** an allowlisted user sends `/історія` with multiple entries
- **THEN** the reply does not include lines from the supportive message pools
