# note-actions

## Purpose

Secondary note-level actions beyond the core lifecycle: duplicating a note. Covers FR-023.

## Requirements

### Requirement: Duplicate a note (FR-023)
The system SHALL allow an authenticated user to create a copy of one of their own notes,
including its title (prefixed with "Copy of "), content, folder assignment, and tag
assignments, as a new note owned by the same user.

#### Scenario: Duplicating a note copies its fields
- **WHEN** an authenticated user duplicates one of their own notes
- **THEN** a new `Note` is created with the same `content` and `folderId`, a title equal to
  `"Copy of " + <original title>` (or empty if the original title is empty), and the same set
  of tags via new `NoteTag` associations

#### Scenario: Duplicate is independent of the original
- **WHEN** a duplicated note is later edited or deleted
- **THEN** the original note it was copied from is unaffected

#### Scenario: Navigating to the duplicate
- **WHEN** an authenticated user duplicates a note
- **THEN** they are taken to the editor for the newly created duplicate

#### Scenario: Cannot duplicate another user's note
- **WHEN** an authenticated user attempts to duplicate a note that belongs to a different user
- **THEN** the request is rejected and no new note is created

### Requirement: Duplicate confirmation
The system SHALL show the user a brief confirmation after a note is duplicated.

#### Scenario: Confirmation shown once after duplicating
- **WHEN** an authenticated user is taken to a newly duplicated note's editor
- **THEN** a confirmation message is shown once, and does not reappear on a subsequent reload
  of that note's page
