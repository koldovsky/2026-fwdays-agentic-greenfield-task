# note-actions

## Purpose

Secondary note-level actions beyond the core lifecycle: duplicating a note, and marking notes
favorite, pinned, or archived. Covers FR-023, FR-025, FR-026, FR-027.

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

### Requirement: Favorite a note (FR-025)
The system SHALL allow an authenticated user to mark one of their own, non-deleted notes as a
favorite, and to unmark it, without affecting the note's pinned or archived state.

#### Scenario: Marking a note as a favorite
- **WHEN** an authenticated user marks one of their own notes as a favorite
- **THEN** the note's `isFavorite` flag is set to true and the note continues to appear in the
  active notes list

#### Scenario: Unmarking a favorite
- **WHEN** an authenticated user unmarks a note that is currently marked as a favorite
- **THEN** the note's `isFavorite` flag is set to false

#### Scenario: Cannot favorite another user's note
- **WHEN** an authenticated user attempts to mark a note that belongs to a different user as a
  favorite
- **THEN** the request is rejected and the note's `isFavorite` flag is unchanged

### Requirement: Pin a note (FR-026)
The system SHALL allow an authenticated user to pin one of their own, non-deleted notes, and to
unpin it, without affecting the note's favorite or archived state.

#### Scenario: Pinning a note
- **WHEN** an authenticated user pins one of their own notes
- **THEN** the note's `isPinned` flag is set to true and the note continues to appear in the
  active notes list

#### Scenario: Unpinning a note
- **WHEN** an authenticated user unpins a note that is currently pinned
- **THEN** the note's `isPinned` flag is set to false

#### Scenario: Cannot pin another user's note
- **WHEN** an authenticated user attempts to pin a note that belongs to a different user
- **THEN** the request is rejected and the note's `isPinned` flag is unchanged

### Requirement: Archive a note (FR-027)
The system SHALL allow an authenticated user to archive one of their own, non-deleted notes,
and to unarchive it. Archiving a note removes it from the active notes list, folder views, tag
views, and search results, without deleting it, and independently of its favorite or pinned
state.

#### Scenario: Archiving a note removes it from the active list
- **WHEN** an authenticated user archives one of their own notes
- **THEN** the note's `isArchived` flag is set to true, and the note no longer appears in the
  active notes list, its folder's notes, its tags' notes, or search results

#### Scenario: Unarchiving restores a note to the active list
- **WHEN** an authenticated user unarchives a note that is currently archived
- **THEN** the note's `isArchived` flag is set to false, and the note reappears in the active
  notes list (and any folder/tag/search views it would otherwise match)

#### Scenario: Archiving does not affect favorite or pinned state
- **WHEN** an authenticated user archives a note that is favorited and/or pinned
- **THEN** the note's `isFavorite` and `isPinned` flags are unchanged

#### Scenario: Cannot archive another user's note
- **WHEN** an authenticated user attempts to archive a note that belongs to a different user
- **THEN** the request is rejected and the note's `isArchived` flag is unchanged
