# notes-core

## Purpose

Core note lifecycle for Notely: create, edit, autosave, and soft-delete notes for the
authenticated user, plus the notes list, favorites, pinned, archive, and trash views that
surface them. Covers FR-020, FR-021, FR-022, FR-024.

## Requirements

### Requirement: Create a new note (FR-020)
The system SHALL allow an authenticated user to create a new note belonging to them, with an
empty title and content, immediately usable in the editor.

#### Scenario: New note created from the notes list
- **WHEN** an authenticated user activates "New note" from the notes list
- **THEN** a new `Note` record is created with `userId` set to the current user, empty title
  and content, and the user is taken to the editor for that note

#### Scenario: New note is private to its owner
- **WHEN** a new note is created for one user
- **THEN** the note is not visible in any other user's note list or accessible via its id by
  another user

### Requirement: Edit existing notes (FR-021)
The system SHALL allow an authenticated user to view and edit the title and content of any of
their own, non-deleted notes.

#### Scenario: Opening a note loads its current content
- **WHEN** an authenticated user opens one of their own notes from the notes list
- **THEN** the editor displays that note's current title and content

#### Scenario: Editing updates the stored note
- **WHEN** an authenticated user changes the title or content of their own note and the change
  is saved
- **THEN** the `Note` record's `title`/`content` and `updatedAt` are updated to reflect the
  edit

#### Scenario: Cannot edit another user's note
- **WHEN** an authenticated user attempts to load or save a note that belongs to a different
  user
- **THEN** the request is rejected and no data is read or written

### Requirement: Autosave after inactivity (FR-022)
The system SHALL automatically save in-progress edits to a note's title or content after 1
second of user inactivity, without requiring an explicit save action, and SHALL reflect the
save status to the user.

#### Scenario: Edit is saved after a pause in typing
- **WHEN** an authenticated user types in the note title or content and then stops for 1
  second
- **THEN** the current title and content are persisted to the `Note` record without the user
  taking any explicit save action

#### Scenario: Continued typing defers the save
- **WHEN** an authenticated user keeps typing within the 1-second window
- **THEN** no save is triggered until 1 second of continuous inactivity has elapsed

#### Scenario: Save status is visible to the user
- **WHEN** an autosave is pending, in progress, has completed, or has failed
- **THEN** the editor displays a corresponding status (e.g. idle/pending, saving, saved, or
  error) so the user knows whether their edit is persisted

#### Scenario: Pending edit is flushed before leaving the editor
- **WHEN** an authenticated user navigates away from or closes the editor while an autosave is
  still pending (within the 1-second debounce window)
- **THEN** the pending edit is saved immediately rather than discarded

### Requirement: Soft-delete notes (FR-024)
The system SHALL allow an authenticated user to delete one of their own notes without
permanently removing it, marking it deleted and moving it out of the active notes list into a
trash view, retained per the 30-day retention policy.

#### Scenario: Deleting a note removes it from the active list
- **WHEN** an authenticated user deletes one of their own notes from the notes list or editor
- **THEN** the note's `deletedAt` timestamp is set, and the note no longer appears in the
  active notes list

#### Scenario: Deleted note appears in trash
- **WHEN** a note has been soft-deleted
- **THEN** the note appears in the user's trash view showing only their own soft-deleted,
  non-purged notes

#### Scenario: Cannot delete another user's note
- **WHEN** an authenticated user attempts to delete a note that belongs to a different user
- **THEN** the request is rejected and the note's `deletedAt` is unchanged

### Requirement: Notes list view
The system SHALL show an authenticated user a list of their own, non-deleted, non-archived
notes, with an empty state when they have none.

#### Scenario: Notes list shows only the current user's active notes
- **WHEN** an authenticated user opens the notes list
- **THEN** all of that user's notes with `deletedAt` unset and `isArchived` false are shown,
  ordered by most recently updated, and no other user's notes appear

#### Scenario: Empty notes list shows a call to action
- **WHEN** an authenticated user with no active notes opens the notes list
- **THEN** an empty state is shown with an action to create a new note

### Requirement: Favorites view
The system SHALL show an authenticated user a list of their own, non-deleted notes marked as
favorite, with an empty state when they have none.

#### Scenario: Favorites view shows only the current user's favorited notes
- **WHEN** an authenticated user opens the Favorites view
- **THEN** all of that user's notes with `isFavorite` true and `deletedAt` unset are shown,
  ordered by most recently updated, and no other user's notes appear

#### Scenario: Empty favorites view shows an empty state
- **WHEN** an authenticated user with no favorited notes opens the Favorites view
- **THEN** an empty state indicating there are no favorites is shown

### Requirement: Pinned view
The system SHALL show an authenticated user a list of their own, non-deleted notes that are
pinned, with an empty state when they have none.

#### Scenario: Pinned view shows only the current user's pinned notes
- **WHEN** an authenticated user opens the Pinned view
- **THEN** all of that user's notes with `isPinned` true and `deletedAt` unset are shown,
  ordered by most recently updated, and no other user's notes appear

#### Scenario: Empty pinned view shows an empty state
- **WHEN** an authenticated user with no pinned notes opens the Pinned view
- **THEN** an empty state indicating there are no pinned notes is shown

### Requirement: Archive view
The system SHALL show an authenticated user a list of their own, non-deleted notes that are
archived, with an empty state when they have none.

#### Scenario: Archive view shows only the current user's archived notes
- **WHEN** an authenticated user opens the Archive view
- **THEN** all of that user's notes with `isArchived` true and `deletedAt` unset are shown,
  ordered by most recently updated, and no other user's notes appear

#### Scenario: Empty archive view shows an empty state
- **WHEN** an authenticated user with no archived notes opens the Archive view
- **THEN** an empty state indicating the archive is empty is shown

### Requirement: Trash view
The system SHALL show an authenticated user a list of their own soft-deleted notes, with an
empty state when trash is empty.

#### Scenario: Trash shows only the current user's deleted notes
- **WHEN** an authenticated user opens the trash view
- **THEN** all of that user's notes with `deletedAt` set are shown, and no other user's
  deleted notes appear

#### Scenario: Empty trash shows an empty state
- **WHEN** an authenticated user with no deleted notes opens the trash view
- **THEN** an empty state indicating trash is empty is shown
