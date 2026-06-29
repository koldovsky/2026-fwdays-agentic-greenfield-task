# note-store

## ADDED Requirements

### Requirement: Note round-trip
The system SHALL serialize a `Note` and parse it back to an equal object,
including optional `excerpt` and `page`.

#### Scenario: Round-trip with excerpt and page
- **WHEN** a note with excerpt + page is serialized then parsed
- **THEN** the parsed object equals the original

### Requirement: Tolerant defaults
The system SHALL default an invalid/missing color to `yellow`, treat absent
links as `[]`, and omit absent excerpt/page.

#### Scenario: Invalid color
- **WHEN** parsing a note whose color is unrecognized
- **THEN** color is `yellow`, links is `[]`, and excerpt/page are omitted

### Requirement: List, save, delete
The system SHALL list a book's notes (sorted by id), overwrite by id on save,
and remove the file on delete.

#### Scenario: Delete removes the file
- **WHEN** a note is deleted
- **THEN** reading it afterwards returns nothing and its `.md` is gone

#### Scenario: List sorted by id
- **WHEN** multiple notes are saved for a book
- **THEN** `listNotes` returns them sorted by id

#### Scenario: Read missing note
- **WHEN** reading a note id that does not exist
- **THEN** the result is null
