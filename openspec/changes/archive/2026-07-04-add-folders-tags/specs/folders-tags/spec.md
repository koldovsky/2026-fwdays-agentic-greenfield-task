## ADDED Requirements

### Requirement: Folder management (DATA-002)
The system SHALL allow an authenticated user to create, rename, and delete folders belonging
to them. Deleting a folder SHALL NOT delete the notes inside it.

#### Scenario: Creating a folder
- **WHEN** an authenticated user creates a folder with a name
- **THEN** a new `Folder` record is created with `userId` set to the current user and appears
  in that user's sidebar

#### Scenario: Renaming a folder
- **WHEN** an authenticated user renames one of their own folders
- **THEN** the folder's `name` is updated and reflected everywhere it is displayed

#### Scenario: Deleting a folder preserves its notes
- **WHEN** an authenticated user deletes one of their own folders that contains notes
- **THEN** the folder record is removed, and every note that referenced it has its `folderId`
  set to null rather than being deleted

#### Scenario: Cannot modify another user's folder
- **WHEN** an authenticated user attempts to rename or delete a folder belonging to a
  different user
- **THEN** the request is rejected and the folder is unchanged

### Requirement: Tag management (DATA-003)
The system SHALL allow an authenticated user to create, rename, and delete tags belonging to
them. Deleting a tag SHALL remove its assignments without deleting the tagged notes.

#### Scenario: Creating a tag
- **WHEN** an authenticated user creates a tag with a name
- **THEN** a new `Tag` record is created with `userId` set to the current user and is
  available to assign to notes

#### Scenario: Renaming a tag
- **WHEN** an authenticated user renames one of their own tags
- **THEN** the tag's `name` is updated and reflected everywhere it is displayed

#### Scenario: Deleting a tag preserves its notes
- **WHEN** an authenticated user deletes one of their own tags that is assigned to notes
- **THEN** the tag record and its `NoteTag` associations are removed, and the previously
  tagged notes are retained

#### Scenario: Cannot modify another user's tag
- **WHEN** an authenticated user attempts to rename or delete a tag belonging to a different
  user
- **THEN** the request is rejected and the tag is unchanged

### Requirement: Assign a folder and tags to a note
The system SHALL allow an authenticated user to set or clear a note's folder, and add or
remove tags on a note, from the note editor.

#### Scenario: Assigning a note to a folder
- **WHEN** an authenticated user selects one of their own folders for one of their own notes
- **THEN** the note's `folderId` is updated to reference that folder

#### Scenario: Clearing a note's folder
- **WHEN** an authenticated user clears the folder selection on one of their own notes
- **THEN** the note's `folderId` is set to null

#### Scenario: Adding a tag to a note
- **WHEN** an authenticated user adds one of their own tags to one of their own notes
- **THEN** a `NoteTag` association is created between that note and tag

#### Scenario: Removing a tag from a note
- **WHEN** an authenticated user removes a tag from one of their own notes
- **THEN** the corresponding `NoteTag` association is deleted

#### Scenario: Cannot assign another user's folder or tag
- **WHEN** an authenticated user attempts to assign a folder or tag that does not belong to
  them onto one of their own notes
- **THEN** the request is rejected and the note's folder/tags are unchanged

### Requirement: Filter notes by folder (FR-061)
The system SHALL show an authenticated user a list of their own, non-deleted notes filtered to
a single folder they select.

#### Scenario: Viewing notes in a folder
- **WHEN** an authenticated user opens one of their own folders
- **THEN** only their own, non-deleted notes with a matching `folderId` are shown

#### Scenario: Empty folder shows an empty state
- **WHEN** an authenticated user opens one of their own folders that has no notes
- **THEN** an empty state is shown for that folder

#### Scenario: Cannot view another user's folder contents
- **WHEN** an authenticated user attempts to open a folder belonging to a different user
- **THEN** the request is rejected and no notes are shown

### Requirement: Filter notes by tag (FR-062)
The system SHALL show an authenticated user a list of their own, non-deleted notes filtered to
a single tag they select.

#### Scenario: Viewing notes with a tag
- **WHEN** an authenticated user opens one of their own tags
- **THEN** only their own, non-deleted notes associated with that tag are shown

#### Scenario: Empty tag shows an empty state
- **WHEN** an authenticated user opens one of their own tags that has no associated notes
- **THEN** an empty state is shown for that tag

#### Scenario: Cannot view another user's tag contents
- **WHEN** an authenticated user attempts to open a tag belonging to a different user
- **THEN** the request is rejected and no notes are shown
