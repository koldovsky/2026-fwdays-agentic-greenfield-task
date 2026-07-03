# filtering Specification

## Purpose
TBD - created by archiving change add-filtering. Update Purpose after archive.
## Requirements
### Requirement: Field and city filters
The filtering capability SHALL provide multi-select field and city filters, presented as
`.pk-chip` buttons, with the available options sourced from the program registry
(distinct fields and cities of the loaded programs). A program SHALL remain in the list
only if it matches a selected field (when any field is selected) AND matches a selected
city (when any city is selected); an empty selection in a group SHALL apply no narrowing
for that group. (Traces: FR-FILTER-01.)

#### Scenario: Options come from the registry
- **WHEN** the filter panel renders
- **THEN** the field chips list the distinct fields present in the program registry
- **AND** the city chips list the distinct cities present in the program registry

#### Scenario: Selecting a city narrows the list
- **WHEN** the applicant selects one or more cities
- **THEN** only programs in a selected city remain in the list
- **AND** deselecting all cities restores programs from every city

#### Scenario: Field and city filters combine
- **WHEN** at least one field and at least one city are selected
- **THEN** a program remains only if it matches a selected field AND a selected city

### Requirement: Risk-category filter
The filtering capability SHALL provide risk-category tabs — Усі (all), Надійно (safe),
Реально (realistic), Мрія (reach) — that filter the list over the categories computed by
the scoring engine. The "Усі" tab SHALL show every program (including non-fitting ones);
a specific category tab SHALL show only fitting programs whose computed category matches.
(Traces: FR-FILTER-02.)

#### Scenario: A category tab narrows to that category
- **WHEN** the applicant selects a specific risk-category tab
- **THEN** only fitting programs whose computed category matches that tab remain visible
- **AND** the active tab is marked via `aria-pressed`

#### Scenario: The "all" tab shows everything
- **WHEN** the "Усі" tab is active
- **THEN** all programs are visible, including programs that do not accept the chosen elective

### Requirement: Instant, combinable re-render
Every filter change (field, city, or risk category) SHALL re-render the list instantly
(< 100 ms, no submit step), and all filters SHALL combine so their effects apply
together. (Traces: NFR-PERF-01, FR-FILTER-01, FR-FILTER-02.)

#### Scenario: Filter change updates the list immediately
- **WHEN** the applicant toggles any field, city, or risk-category filter
- **THEN** the list updates immediately with no explicit apply or submit action
- **AND** the field/city filters and the risk-category tab apply together

### Requirement: Empty-filter state
When a filter combination matches no programs, the filtering capability SHALL surface a
helpful empty state hinting to relax the filters, and SHALL NOT leave the screen blank.
(Traces: FR-UX-01.)

#### Scenario: No matches shows a relax-filters hint
- **WHEN** the current filter combination matches no programs
- **THEN** an empty-state panel renders with a hint to change the filter or adjust scores
- **AND** the screen is not left blank

### Requirement: Accessible filter controls
The filter controls SHALL be accessible: each filter group (field, city, risk category)
SHALL be a `role="group"` with an `aria-label`, and chips and tabs SHALL expose their
selected state via `aria-pressed` rather than color alone. (Traces: NFR-A11Y-01.)

#### Scenario: Filter groups and controls expose state
- **WHEN** a screen reader inspects the filter panel and category tabs
- **THEN** each filter group is announced with its `aria-label`
- **AND** each active chip or tab exposes its state via `aria-pressed`, not color alone

