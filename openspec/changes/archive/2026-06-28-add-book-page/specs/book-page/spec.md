# book-page

## ADDED Requirements

### Requirement: Book metadata and summary
The system SHALL show cover, title, author, status, date, `Rating`, and tags,
plus the summary rendered from Markdown on a reading-width column.

#### Scenario: Missing book
- **WHEN** opening a slug that does not exist
- **THEN** a 404 is shown

#### Scenario: Malformed metadata
- **WHEN** the book is flagged malformed
- **THEN** a "needs attention" notice is shown but the page still renders

### Requirement: Notes list
The system SHALL render each note as a DS `NoteCard` (highlighter spine = color,
excerpt, reflection, page) and list its outbound links as clickable links.

#### Scenario: Outbound link navigates
- **WHEN** clicking a note's outbound link
- **THEN** the user navigates to the target book/note

### Requirement: Backlinks
The system SHALL show a "Linked from" block listing sources that link to this
book/notes; it is hidden when empty.

#### Scenario: Has backlinks
- **WHEN** another book's note links here
- **THEN** that source appears under "Linked from"
