## ADDED Requirements

### Requirement: Typed program registry
The system SHALL expose a static, typed registry of study programs. Each program
SHALL carry a stable id, university name, program/specialty name, field of study,
city, subject weighting coefficients, a cutoff history, a state-funded seat count,
a human-readable tuition value, dormitory availability, and the elective ("4th")
NMT subjects it accepts. The registry SHALL be static bundled data with no I/O or
backend for the MVP. (Traces: §10 data, TC-DATA-01.)

#### Scenario: Every program carries the full §10 field set
- **WHEN** any program in the registry is inspected
- **THEN** it has an `id`, `uni`, `spec`, `field`, `city`, `coeff`, `cutoffs`, `budgetSeats`, `tuition`, `dorm`, and `electives`
- **AND** every field is populated (no empty/undefined required field)

#### Scenario: Program lookup by id
- **WHEN** `getProgram(id)` is called with an id present in the registry
- **THEN** the matching program is returned
- **AND** when the id is not present, `undefined` is returned

#### Scenario: No runtime data fetch
- **WHEN** the registry is read
- **THEN** the data is served from the bundled static module with no network or backend request

### Requirement: Eleven sample programs
The registry SHALL contain exactly eleven (11) sample programs, presented as
illustrative examples rather than an official admissions registry. (Traces:
TC-DATA-01.)

#### Scenario: Registry holds eleven programs
- **WHEN** the number of programs in the registry is counted
- **THEN** the count is exactly 11

#### Scenario: Program ids are unique
- **WHEN** the ids of all programs are collected
- **THEN** every id is distinct (no duplicates)

### Requirement: Coefficients sum to one
Each program's subject weighting coefficients (`ukr`, `math`, `hist`, `eng`) SHALL
sum to `1.0`, so a weighted sum of subject scores stays on the NMT scale. (Traces:
§10 data.)

#### Scenario: Weights total 1.0 per program
- **WHEN** the coefficients of any program are summed
- **THEN** the total equals `1.0` (within floating-point tolerance)

#### Scenario: Coefficient keys are valid subjects
- **WHEN** a program's coefficient keys are inspected
- **THEN** every key is one of `ukr`, `math`, `hist`, `eng`

### Requirement: Three-year cutoff history
Each program SHALL provide passing (cutoff) scores for at least three years — 2022,
2023, and 2024 — so `scoring-engine` can compute cutoff volatility (σ) and the
uncertainty band. (Traces: §10 data.)

#### Scenario: Each program has three cutoff years
- **WHEN** a program's `cutoffs` are inspected
- **THEN** numeric values are present for years 2022, 2023, and 2024

#### Scenario: 2024 is the reference cutoff
- **WHEN** the current admissions session is read as `DATA_SESSION`
- **THEN** its value is `2024`, matching the latest cutoff year every program carries

### Requirement: Seats, cost, dormitory, and accepted electives
Each program SHALL expose its number of state-funded (budget) seats, a
human-readable tuition value, a dormitory-availability flag, and the list of
elective ("4th") NMT subjects it accepts. (Traces: §10 data.)

#### Scenario: Seats and tuition present
- **WHEN** a program is inspected
- **THEN** `budgetSeats` is a positive number and `tuition` is a non-empty human-readable string
- **AND** `dorm` is a boolean

#### Scenario: Accepted electives are valid subjects
- **WHEN** a program's `electives` are inspected
- **THEN** the list is non-empty
- **AND** every entry is a recognised elective NMT subject

### Requirement: Benefit catalog
The system SHALL expose a benefit catalog listing the three benefit categories with
a Ukrainian label, a description, and an additive bonus fraction applied to the
competitive score: rural coefficient (`village`, +0.02), preferential quota
(`quota`, +0.04), and special conditions (`orphan`, +0.02). (Traces: §10 data.)

#### Scenario: Three benefits with their bonuses
- **WHEN** the benefit catalog is read
- **THEN** it contains `village` with bonus `0.02`, `quota` with bonus `0.04`, and `orphan` with bonus `0.02`
- **AND** each entry has a non-empty Ukrainian label and description

#### Scenario: Benefit keys match the profile shape
- **WHEN** a catalog entry's key is inspected
- **THEN** it is one of the `Benefits` toggle keys (`village`, `quota`, `orphan`) consumed by `scoring-engine`

### Requirement: First-class data freshness
The system SHALL expose the dataset's freshness as first-class metadata — a session
year (`DATA_SESSION`), a human-readable freshness label (`DATA_AS_OF`), and a
disclaimer note (`DATA_DISCLAIMER`) stating the data is 11 illustrative samples, not
an official registry — so the UI can always show how fresh and how illustrative the
data is. (Traces: TC-DATA-01, BC-HONESTY-01.)

#### Scenario: Freshness metadata is available for the UI
- **WHEN** a UI surface reads the data-freshness metadata
- **THEN** a session year, a human-readable freshness label, and an illustrative-data disclaimer note are all available
- **AND** the disclaimer communicates that the cutoffs are illustrative samples rather than an official registry

### Requirement: Derived field and city lists
The system SHALL expose derived, distinct lists of the fields and cities present in
the registry (in dataset order) so filter surfaces can render selectable options
without re-deriving them. (Traces: §10 data.)

#### Scenario: Distinct fields and cities
- **WHEN** the derived `FIELDS` and `CITIES` lists are read
- **THEN** each contains the distinct field/city values present in the registry with no duplicates
- **AND** every value corresponds to at least one program
