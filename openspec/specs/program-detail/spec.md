# program-detail Specification

## Purpose
TBD - created by archiving change add-program-detail. Update Purpose after archive.
## Requirements
### Requirement: Competitive-score breakdown that sums to the score
The program-detail view SHALL show how the competitive score was computed for
the current profile: one row per weighted subject rendering `subject × weight →
contribution`, plus a benefit-multiplier row when any benefit is active, and a
total row labelled as the competitive score. The listed contributions SHALL sum
to the displayed competitive-score total. (Traces: FR-DETAIL-01.)

#### Scenario: Per-subject rows sum to the competitive score
- **WHEN** the detail modal opens for a program the applicant's elective fits
- **THEN** each weighted subject appears as a row showing its label with the weight and its `score × weight` contribution
- **AND** a total row labelled "Конкурсний бал" shows the competitive score
- **AND** the sum of the contribution rows (including the benefit row when shown) equals the competitive-score total

#### Scenario: Benefit multiplier line appears only when a benefit is active
- **WHEN** the applicant has at least one benefit toggled on
- **THEN** the breakdown includes a benefit row showing the multiplier (e.g. `Пільга ×1.02`) and the bonus it adds
- **AND** when no benefit is active no benefit row is shown and the subject rows alone sum to the competitive score

### Requirement: Three-year cutoff history bar chart
The program-detail view SHALL render the program's cutoff (passing) scores for
the last three years (2022, 2023, 2024) as a bar chart, with each bar labelled
by its year and value and the latest year visually highlighted. (Traces:
FR-DETAIL-01.)

#### Scenario: Three years render as labelled bars
- **WHEN** the detail modal opens for a program
- **THEN** three bars are rendered, one for each of 2022, 2023, and 2024
- **AND** each bar is labelled with its year and cutoff value (uk-UA formatted)
- **AND** the 2024 bar is visually highlighted as the latest year

### Requirement: Category-appropriate advice
The program-detail view SHALL show advice text that matches the program's risk
category for the current profile — Safe (≥ 75 %), Realistic (40–74 %), or Reach
(< 40 %) per §6 — alongside the category label. (Traces: FR-DETAIL-01.)

#### Scenario: Advice matches a Safe program
- **WHEN** the program's chance for the profile is at least 75 %
- **THEN** the category label reads "Надійно"
- **AND** the advice recommends keeping it as a fallback priority

#### Scenario: Advice matches a Realistic program
- **WHEN** the program's chance is between 40 % and 74 % inclusive
- **THEN** the category label reads "Реально"
- **AND** the advice recommends applying it as priority 1–2

#### Scenario: Advice matches a Reach program
- **WHEN** the program's chance is below 40 %
- **THEN** the category label reads "Мрія"
- **AND** the advice frames it as a worth-trying reach among the applicant's priorities

### Requirement: In-context uncertainty band and disclaimer
The program-detail view SHALL present the point chance together with its
uncertainty band `lo–hi %` and a plain-language sentence stating the chance is
an estimate reflecting cutoff volatility over the years, not a guarantee of
admission. The band and disclaimer SHALL appear even when the point chance is
high. (Traces: FR-DETAIL-01, BC-HONESTY-01.)

#### Scenario: Band and disclaimer are shown with the chance
- **WHEN** the detail modal renders the chance for a program
- **THEN** the uncertainty band is shown as a `lo–hi %` range derived from the cutoff volatility
- **AND** a disclaimer sentence states the chance is an estimate with a range, not a guarantee

#### Scenario: Disclaimer persists for a near-certain chance
- **WHEN** the program's chance is at the high end (e.g. 90 %+)
- **THEN** the band and the not-a-guarantee disclaimer sentence are still displayed

### Requirement: Accessible dialog semantics
The program-detail modal SHALL be an accessible dialog: the dialog container
SHALL carry `role="dialog"` and `aria-modal="true"` and be labelled by the
program title. On open, focus SHALL move to the close button. The dialog SHALL
close on the Escape key and on an overlay (outside-content) click, and the close
control SHALL expose an accessible Ukrainian label. Meaning SHALL NOT be
conveyed by color alone — the category is reinforced by its text label.
(Traces: FR-DETAIL-01, NFR-A11Y-01.)

#### Scenario: Dialog exposes modal semantics and initial focus
- **WHEN** the modal opens
- **THEN** its container has `role="dialog"` and `aria-modal="true"` and is labelled by the program-title element
- **AND** keyboard focus is placed on the close button
- **AND** the close control has an accessible label ("Закрити")

#### Scenario: Escape and overlay click close the dialog
- **WHEN** the user presses Escape while the dialog is open
- **THEN** the dialog closes via its close handler
- **AND** clicking the overlay outside the dialog content also closes it
- **AND** clicking inside the dialog content does not close it

#### Scenario: Category signal is not color-only
- **WHEN** the modal shows the risk category using the traffic-light palette
- **THEN** the category is also conveyed by its Ukrainian text label, not color alone

