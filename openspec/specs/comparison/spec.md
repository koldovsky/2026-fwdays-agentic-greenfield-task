# comparison Specification

## Purpose
TBD - created by archiving change add-comparison. Update Purpose after archive.
## Requirements
### Requirement: Select 2–3 programs to compare
The comparison capability SHALL let the user assemble a comparison set of
between 2 and 3 programs, chosen via the ⇄ toggle on recommendation cards and in
the program-detail modal. The comparison SHALL be considered ready only when at
least 2 programs are selected, and selection SHALL be capped at 3. (Traces:
FR-COMPARE-01.)

#### Scenario: Comparison becomes ready at two selections
- **WHEN** the user has selected exactly 2 programs with the ⇄ button
- **THEN** the comparison table is shown for those 2 programs
- **AND** selecting a 3rd program adds a third column

#### Scenario: Selection is capped at three
- **WHEN** 3 programs are already selected and the user tries to add a 4th
- **THEN** the 4th is not added and the set stays at 3
- **AND** de-selecting a program with ⇄ removes its column

### Requirement: Side-by-side comparison table
When the comparison is ready, the capability SHALL render a `.pk-table` with one
column per selected program and one row per compared attribute: chance %
(with its uncertainty band and category), last year's cutoff (2024), the
applicant's competitive score, number of budget seats, tuition, city, and
dormitory availability. Values SHALL be `uk-UA` formatted, and the chance
category SHALL be conveyed by text/label rather than color alone. (Traces:
FR-COMPARE-01, NFR-A11Y-01.)

#### Scenario: Table shows every compared attribute
- **WHEN** the comparison renders for 2–3 selected programs
- **THEN** each selected program is a column headed by its university and specialty
- **AND** there is a row for each of: chance (with band + category), last year's cutoff, the applicant's competitive score, budget seats, tuition, city, and dormitory
- **AND** the dormitory value is shown as "так"/"ні"

#### Scenario: Chance category is not color-only
- **WHEN** the chance row renders each program's category with the traffic-light palette
- **THEN** the category is also conveyed by a text label or accompanying mark, not color alone

### Requirement: Text recommendation across compared options
When the comparison is ready, the capability SHALL show a text recommendation
reasoning across the compared options: the option with the highest chance among
the selected set SHALL be named and framed as priority 1. (Traces:
FR-COMPARE-01.)

#### Scenario: Highest-chance option is recommended as priority 1
- **WHEN** the comparison is ready with 2–3 programs of differing chances
- **THEN** the recommendation names the program with the highest chance (university + specialty) and its chance %
- **AND** it advises considering that program as priority 1

### Requirement: Empty state below the minimum
When fewer than 2 programs are selected, the capability SHALL show an empty
state instead of a table, prompting the user to add 2–3 options with the ⇄
button. (Traces: FR-COMPARE-01.)

#### Scenario: Empty state with zero or one selection
- **WHEN** 0 or 1 programs are selected for comparison
- **THEN** no comparison table is rendered
- **AND** an empty-state message prompts the user to add 2–3 options using the ⇄ button

