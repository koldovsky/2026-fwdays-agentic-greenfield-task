# C14 — Note Editor

**OpenSpec change:** `add-note-editor`
**Owner:** `app/book/[slug]/notes/*`, `components/NoteForm`, `components/LinkPicker`
**Depends on:** C9 (Server Actions), C10 (DS Integration), C5 (Note Store), C8 (Queries)
**Maps to:** requirements.md §3.3 (note CRUD, LinkPicker)

## Purpose
Create, edit, and delete a note: choose a highlighter color, write the quoted excerpt
and reflection, set a page, and link to existing books/notes.

## Requirements

### Requirement: Compose a note
The system SHALL provide a color picker (`HighlighterPicker`), an excerpt field, a
ruled reflection textarea, and a page field, saving via the server action.

#### Scenario: Color drives the saved value
- **WHEN** a highlighter color is selected and the note saved
- **THEN** the note's `color` is that key

### Requirement: Link to existing targets
The system SHALL let the user pick an existing book/note (from C8 targets) and append
it to the note's links.

#### Scenario: Append a link
- **WHEN** a target is chosen from the picker
- **THEN** its `book:`/`note:` string is added to the links field

### Requirement: Edit and delete
The system SHALL prefill the form for an existing note, overwrite on save, and remove
the note on delete.

#### Scenario: Delete removes the note
- **WHEN** a note is deleted
- **THEN** it disappears from the book page and its file is gone
