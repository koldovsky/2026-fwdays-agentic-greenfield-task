# note-editor Specification

## Purpose
Create, edit, and delete notes (color, excerpt, page, reflection, links), with a color legend.
## Requirements
### Requirement: Compose a note
The system SHALL provide a color picker (`HighlighterPicker`), an excerpt field, a
ruled reflection textarea, and a page field, saving via the server action.

#### Scenario: Color drives the saved value
- **WHEN** a highlighter color is selected and the note saved
- **THEN** the note's `color` is that key

#### Scenario: New note starts empty
- **WHEN** the new-note form is rendered
- **THEN** the reflection textarea is empty and a highlighter swatch row is shown

### Requirement: Link to existing targets
The system SHALL let the user pick an existing book/note (from C8 targets) and append
it to the note's links.

#### Scenario: Append a link
- **WHEN** a target is chosen from the picker and "Add link" is pressed
- **THEN** its `book:`/`note:` string is added to the links field

### Requirement: Edit and delete
The system SHALL prefill the form for an existing note, overwrite on save, and remove
the note on delete.

#### Scenario: Edit prefills the form
- **WHEN** an existing note is opened for editing
- **THEN** the reflection, excerpt, page, and links fields are populated from the note

#### Scenario: Delete removes the note
- **WHEN** a note is deleted
- **THEN** it disappears from the book page and its file is gone

### Requirement: Highlighter color legend
The note editor SHALL show a legend listing each highlighter color and its meaning
(Idea, Question, Disagree, Resonates, Theme, Fact, Term, Quote), with the currently
selected color emphasized.

#### Scenario: Legend lists every color meaning
- **WHEN** the note editor is open
- **THEN** a legend lists all eight highlighter colors with their meanings

#### Scenario: Selected color is emphasized
- **WHEN** a highlighter color is selected
- **THEN** that color's entry in the legend is emphasized

