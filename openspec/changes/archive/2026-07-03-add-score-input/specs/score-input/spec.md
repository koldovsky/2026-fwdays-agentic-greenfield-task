## ADDED Requirements

### Requirement: NMT score entry for four subjects
The score-input surface SHALL provide four NMT score inputs — three required subjects
(Українська мова, Математика, Історія України) and one elective slot — and each input
SHALL constrain its value to the valid NMT range of 100–200 inclusive. Each score
control SHALL be a design-system `.pk-range` slider bound to `SCORE_MIN` (100) and
`SCORE_MAX` (200). (Traces: FR-INPUT-01.)

#### Scenario: All four scores can be entered within range
- **WHEN** the applicant adjusts each of the four score sliders
- **THEN** each slider accepts and displays a value between 100 and 200 inclusive
- **AND** the current value is shown next to its subject label, formatted to the Ukrainian standard

#### Scenario: Values cannot leave the valid NMT range
- **WHEN** a score control is set toward a value below 100 or above 200
- **THEN** the control clamps the value to the 100–200 range (`min`/`max` bounds enforced)
- **AND** no out-of-range NMT score reaches the scoring engine

### Requirement: Elective (4th-subject) choice
The score-input surface SHALL let the applicant choose the 4th (elective) subject from
exactly the six supported options — Англійська, Біологія, Фізика, Хімія, Географія,
Німецька — presented as `.pk-chip` buttons. The chosen elective SHALL relabel the 4th
score row and SHALL determine which programs are treated as eligible downstream:
programs that do not accept the chosen elective are marked as not fitting.
(Traces: FR-INPUT-02.)

#### Scenario: Choosing an elective relabels the 4th score row
- **WHEN** the applicant selects an elective subject chip
- **THEN** the chip is marked selected via `aria-pressed="true"`
- **AND** the label of the 4th score row updates to the chosen subject name

#### Scenario: Elective choice changes the eligible program set
- **WHEN** the applicant switches from one elective to another
- **THEN** programs that accept the newly chosen elective are treated as fitting
- **AND** programs that do not accept it are marked as not fitting downstream

### Requirement: Benefit toggles affecting the score
The score-input surface SHALL provide toggles for the admissions benefits from the
benefit catalog — rural coefficient, preferential quota, and special conditions —
as `.pk-toggle-row` controls. Turning a benefit on SHALL add its bonus fraction to the
competitive-score calculation; turning it off SHALL remove that bonus. (Traces:
FR-INPUT-03.)

#### Scenario: Enabling a benefit raises the competitive score
- **WHEN** the applicant turns on a benefit toggle
- **THEN** the toggle is marked active via `aria-pressed="true"`
- **AND** the benefit's bonus fraction is added to the competitive score used downstream

#### Scenario: Disabling a benefit removes its effect
- **WHEN** the applicant turns a previously active benefit off
- **THEN** the toggle is marked inactive via `aria-pressed="false"`
- **AND** the benefit's bonus is no longer applied to the competitive score

### Requirement: Instant recomputation and persistence
Every change to a score, the elective, or a benefit SHALL flow into recomputation
instantly (< 100 ms, no submit step) and SHALL persist across sessions so the inputs
survive a page reload. (Traces: NFR-PERF-01, FR-STATE-01.)

#### Scenario: A change recomputes without a submit step
- **WHEN** the applicant changes any score, elective, or benefit
- **THEN** the downstream results recompute immediately with no explicit submit or save action

#### Scenario: Inputs survive a reload
- **WHEN** the applicant reloads the page after entering scores, an elective, and benefits
- **THEN** the previously entered scores, elective, and benefit states are restored

### Requirement: Accessible input controls
The score-input controls SHALL be operable and understandable assistive-technology:
each score slider SHALL have an associated `<label>` and an `aria-valuetext`; the
elective picker and benefit group SHALL each be a `role="group"` with an `aria-label`;
and elective chips and benefit toggles SHALL expose their state via `aria-pressed`.
Meaning SHALL NOT be conveyed by color alone. (Traces: NFR-A11Y-01.)

#### Scenario: Sliders are labelled and announce their value
- **WHEN** a screen reader focuses a score slider
- **THEN** it announces the subject label associated with the slider
- **AND** it announces the current value via `aria-valuetext` (e.g. "187 балів")

#### Scenario: Selection state is exposed, not color-only
- **WHEN** an elective chip or benefit toggle is active
- **THEN** its selected state is exposed via `aria-pressed`
- **AND** the state is not communicated by color alone
