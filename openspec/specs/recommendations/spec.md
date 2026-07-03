# recommendations Specification

## Purpose
TBD - created by archiving change add-recommendations. Update Purpose after archive.
## Requirements
### Requirement: Sorted recommendation list
The recommendations capability SHALL render one card per program, sorted so that
fitting programs come first in descending order of chance. Programs that do not accept
the applicant's chosen elective SHALL sink to the bottom of the list, below every
fitting program, regardless of their raw chance. (Traces: FR-SCORE-03.)

#### Scenario: Fitting programs are ordered by chance
- **WHEN** the list renders for a profile with several fitting programs
- **THEN** fitting programs appear first, ordered from highest chance to lowest

#### Scenario: Non-fitting programs sink to the bottom
- **WHEN** some programs do not accept the chosen elective
- **THEN** those programs appear below all fitting programs, regardless of their raw chance

### Requirement: Chance percentage with uncertainty band
Each recommendation card SHALL display the program's point chance as a percentage in a
`.pk-ring` chance ring and SHALL display its uncertainty band as a `lo–hi %` label.
The band SHALL always be shown alongside the chance — never a bare number. (Traces:
FR-SCORE-02, BC-HONESTY-01.)

#### Scenario: Chance and band are shown together
- **WHEN** a fitting program's card renders
- **THEN** the chance ring shows the point chance as a percentage
- **AND** the card shows the uncertainty band as a `lo–hi %` label next to it

### Requirement: Risk category via non-color-only traffic light
Each recommendation card SHALL show the program's risk category using the
green/amber/red traffic-light code, and the signal SHALL NOT be conveyed by color alone.
The category pill SHALL carry a colored dot AND a text label; the chance ring SHALL
expose an `aria-label` stating the chance and category in words; and a
screen-reader-only summary SHALL repeat the chance, band, and category in text.
(Traces: FR-SCORE-02, FR-SCORE-03, NFR-A11Y-01, BC-HONESTY-01.)

#### Scenario: Category is labelled, not color-only
- **WHEN** a fitting program's card renders its category pill
- **THEN** the pill shows a colored dot alongside a text label (Надійно / Реально / Мрія)
- **AND** the meaning is not conveyed by color alone

#### Scenario: Chance is available to assistive technology in words
- **WHEN** a screen reader reaches the chance ring and card summary
- **THEN** the ring's `aria-label` states the chance percentage and the category in words
- **AND** a screen-reader-only summary repeats the chance, band, and category as text

### Requirement: Neutral marker for non-fitting programs
For a program that does not accept the applicant's chosen elective, the card SHALL NOT
invent a chance value. It SHALL show a neutral "Інший предмет НМТ" marker in place of a
risk color, a muted "—" ring, and an accessible label explaining that the program
accepts a different NMT subject. (Traces: FR-SCORE-02, BC-HONESTY-01.)

#### Scenario: Non-fitting program shows a neutral marker
- **WHEN** a program that does not accept the chosen elective renders
- **THEN** its category pill and ring use a neutral style, not a traffic-light risk color
- **AND** it shows the "Інший предмет НМТ" marker with an accessible explanation, and no invented chance percentage

### Requirement: Helpful empty state
When the visible recommendation set is empty, the capability SHALL render a helpful
empty state with guidance on how to get results, and SHALL NOT leave the screen blank.
(Traces: FR-UX-01.)

#### Scenario: Empty result set shows a hint
- **WHEN** no programs are visible for the current selection
- **THEN** a `.pk-empty` panel renders with a title and a hint to change the filter or adjust scores
- **AND** the screen is not left blank

### Requirement: Persistent honesty framing
The recommendations capability SHALL keep honesty framing present: the persistent
disclaimer (inherited from the app shell) stating chances are estimates, not guarantees,
SHALL be visible, and the data-freshness context (`DATA_AS_OF`) SHALL be available so
users know which admissions session and how illustrative the data is. (Traces:
BC-HONESTY-01.)

#### Scenario: Disclaimer and freshness are present with results
- **WHEN** recommendations are shown
- **THEN** the disclaimer that chances are estimates (not guarantees) is visible
- **AND** the data-freshness label (admissions session) is available to the user

