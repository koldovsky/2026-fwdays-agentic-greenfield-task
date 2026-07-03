# shortlist Specification

## Purpose
TBD - created by archiving change add-shortlist. Update Purpose after archive.
## Requirements
### Requirement: Add and remove programs from the saved list
The shortlist capability SHALL let the user save a program to a personal list
and remove it, via the ★ toggle on recommendation cards and in the
program-detail modal. A newly saved program SHALL enter the list with the
initial status "Збережено", and removing a program SHALL take it off the list.
(Traces: FR-LIST-01.)

#### Scenario: Save a program to the list
- **WHEN** the user activates the ★ toggle for a program that is not yet saved
- **THEN** the program is added to the saved list with status "Збережено"
- **AND** the ★ control reflects the saved state (e.g. `aria-pressed` true, label "★ У списку")

#### Scenario: Remove a program from the list
- **WHEN** the user activates the ★ toggle for a program that is already saved
- **THEN** the program is removed from the saved list
- **AND** it no longer appears in the saved-list view

### Requirement: Five-stage application-status tracking
Each saved item SHALL carry an application status that advances through the five
stages in order — Збережено → Подано → Розглядається → Рекомендовано →
Зараховано — when the user activates its status control, cycling back to
"Збережено" after "Зараховано". The status badge SHALL be conveyed by its text
label, not color alone. (Traces: FR-LIST-02, NFR-A11Y-01.)

#### Scenario: Status advances through the stages in order
- **WHEN** the user clicks the status badge of an item currently at "Збережено"
- **THEN** the status advances to "Подано"
- **AND** repeated clicks advance it through "Розглядається", "Рекомендовано", and "Зараховано"

#### Scenario: Status cycles back after the final stage
- **WHEN** the user clicks the status badge of an item at "Зараховано"
- **THEN** the status returns to "Збережено"

#### Scenario: Status is not conveyed by color alone
- **WHEN** a status badge renders with its stage color
- **THEN** the stage is also shown by its Ukrainian text label, not color alone

### Requirement: Persist list and statuses across reloads
The saved list and each item's application status SHALL persist across page
reloads and sessions via the state-persistence store (localStorage). After a
reload the same programs and their last statuses SHALL be restored. (Traces:
FR-LIST-01, FR-LIST-02, FR-STATE-01.)

#### Scenario: List and statuses survive a reload
- **WHEN** the user has saved programs and advanced one to "Розглядається", then reloads the page
- **THEN** the same programs remain in the saved list
- **AND** the advanced item is still at "Розглядається"

#### Scenario: Fresh start when storage is empty or corrupt
- **WHEN** there is no stored profile, or the stored payload is unreadable
- **THEN** the app falls back to the default profile without crashing
- **AND** the saved list renders its empty state

### Requirement: Empty-list state with a save hint
When the saved list is empty, the capability SHALL render an empty state hinting
that the user can save options from their recommendations with the ★ button,
rather than showing a blank area. (Traces: FR-UX-01.)

#### Scenario: Empty list shows a save hint
- **WHEN** the saved list contains no programs
- **THEN** an empty-state message is shown
- **AND** it hints that options are saved with the ★ button and their statuses are tracked here

