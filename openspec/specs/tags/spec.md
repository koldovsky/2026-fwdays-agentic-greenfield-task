# tags Specification

## Purpose
Tags let a user label time entries with their own reusable, colored categories and
filter history by them. Tags are per-user, created and managed by the owner, and can be
assigned to entries on create/manual/edit/continue. Deleting a tag only detaches it from
entries — it never removes the entries themselves. (FR-TAG-01 → FR-TAG-04)
## Requirements
### Requirement: Create a tag

The system SHALL let a user create a tag with a name and an optional color. Tag names
SHALL be unique per user (case-insensitively); a duplicate name MUST be rejected.
(FR-TAG-01)

#### Scenario: Create a tag with a name and color

- **WHEN** a user creates a tag with a non-empty name and an optional color
- **THEN** the tag is created for that user and returned

#### Scenario: Duplicate name rejected

- **WHEN** a user creates a tag whose name matches one of their existing tags
- **THEN** the request is rejected and no second tag is created

#### Scenario: Empty name rejected

- **WHEN** a tag is created with an empty or whitespace-only name
- **THEN** the request is rejected with a validation error

### Requirement: Assign tags to an entry

The system SHALL let a user assign zero or more of their tags to a time entry when
creating, adding manually, editing, or continuing it. An entry's tag set SHALL be exactly
the tags identified by the supplied `tagIds`. Only the user's own tags MAY be assigned.
(FR-TAG-02)

#### Scenario: Assign tags on create or edit

- **WHEN** a user creates or edits an entry with a set of their tag ids
- **THEN** the entry's tags are exactly those tags, and the entry response includes them

#### Scenario: Clearing tags

- **WHEN** a user edits an entry with an empty tag set
- **THEN** the entry ends up with no tags

#### Scenario: Another user's tag cannot be assigned

- **WHEN** a tag id that does not belong to the user is supplied
- **THEN** it is rejected/ignored and never attached to the entry

### Requirement: Rename or delete a tag without losing entries

The system SHALL let a user rename or delete their own tag. Deleting a tag SHALL only
**detach** it from any entries it was on; the entries themselves MUST remain unchanged
apart from losing that tag. (FR-TAG-03)

#### Scenario: Rename a tag

- **WHEN** a user renames one of their tags to a new unique name
- **THEN** the tag's name is updated everywhere it appears

#### Scenario: Delete detaches, never cascades to entries

- **WHEN** a user deletes a tag that is assigned to several entries
- **THEN** the tag is removed and detached from those entries
- **AND** every one of those entries still exists with its other data intact

### Requirement: Filter history by tags

The system SHALL let a user filter the history list by one or more tags, showing only
entries carrying at least one of the selected tags. With no tag selected, all entries are
shown. (FR-TAG-04)

#### Scenario: Filter to selected tags

- **WHEN** one or more tags are selected as a filter
- **THEN** the history list shows only entries that have at least one of those tags

#### Scenario: No filter shows everything

- **WHEN** no tag is selected
- **THEN** the history list shows all entries

### Requirement: Tags are user-scoped and require authentication

Every tag endpoint SHALL require a valid access token and operate only on the
authenticated user's own tags. A user MUST never read or modify another user's tags.
(BC-SCOPE-01, FR-AUTH-06)

#### Scenario: Unauthenticated request rejected

- **WHEN** a tag endpoint is called without a valid access token
- **THEN** the API responds with 401 Unauthorized

#### Scenario: Cross-user access denied

- **WHEN** a user requests or modifies a tag that belongs to another user
- **THEN** the request is denied and no data is disclosed or changed
