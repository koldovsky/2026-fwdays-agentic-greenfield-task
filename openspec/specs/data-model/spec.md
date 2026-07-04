# data-model

## Purpose

Prisma schema, migrations, and data lifecycle rules for users, notes, folders, and tags, including soft-delete retention.

## Requirements

### Requirement: Note ownership (DATA-001)

Every note SHALL belong to exactly one user. The system SHALL enforce this
with a required, non-nullable foreign key from `Note` to `User`.

#### Scenario: Note created with an owner

- **WHEN** a note is created
- **THEN** the note is persisted with a non-null `userId` referencing an existing user

#### Scenario: User cannot be deleted while owning notes without cascade

- **WHEN** a user with existing notes is deleted
- **THEN** the database enforces referential integrity so no note is left without a valid `userId`

### Requirement: Note-folder association (DATA-002)

A note MAY belong to at most one folder. Deleting a folder SHALL NOT delete
the notes inside it.

#### Scenario: Note assigned to a folder

- **WHEN** a note is created or updated with a `folderId`
- **THEN** the note is persisted referencing that folder and `Folder.userId` matches the note's owner

#### Scenario: Note with no folder

- **WHEN** a note is created without a `folderId`
- **THEN** the note is persisted with a null `folderId`

#### Scenario: Folder deleted while containing notes

- **WHEN** a folder containing notes is deleted
- **THEN** the notes are retained with `folderId` set to null

### Requirement: Note-tag association (DATA-003)

The system SHALL allow a note to have multiple tags, and a tag to be
applied to multiple notes, via a many-to-many association.

#### Scenario: Note assigned multiple tags

- **WHEN** a note is created or updated with a set of tag IDs
- **THEN** a `NoteTag` join record is persisted for each note-tag pair

#### Scenario: Tag reused across notes

- **WHEN** the same tag is assigned to more than one note
- **THEN** each note retains an independent `NoteTag` association to that tag

#### Scenario: Tag deleted while assigned to notes

- **WHEN** a tag with existing note associations is deleted
- **THEN** the corresponding `NoteTag` join records are removed and the notes themselves are retained

### Requirement: Soft-delete retention (DATA-004)

Deleted notes SHALL be retained for 30 days before permanent removal, and
SHALL be excluded from normal (non-trash) queries during that window.

#### Scenario: Note soft-deleted

- **WHEN** a note is deleted through the application
- **THEN** the note's `deletedAt` field is set to the current timestamp instead of removing the row

#### Scenario: Soft-deleted note hidden from default views

- **WHEN** a note has a non-null `deletedAt`
- **THEN** it is excluded from default note list queries and only returned by trash-specific queries

#### Scenario: Purge after retention window

- **WHEN** a note's `deletedAt` timestamp is more than 30 days in the past
- **THEN** the purge routine permanently removes the note (and its `NoteTag` associations) from the database

#### Scenario: Purge does not affect recently deleted notes

- **WHEN** a note's `deletedAt` timestamp is less than 30 days in the past
- **THEN** the purge routine leaves the note in place
