## MODIFIED Requirements

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

## ADDED Requirements

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
