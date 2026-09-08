# categories Specification

## Purpose
TBD - created by archiving change add-categories. Update Purpose after archive.
## Requirements
### Requirement: Create a category (FR-CAT-01)
The system SHALL create a category for the authenticated user from a name, a color, and an optional
description, kept as a flat list with no nesting; and SHALL reject a create whose name duplicates one
of that user's existing active (non-archived) categories.

#### Scenario: A valid category is created
- **GIVEN** an authenticated user with no active category named "Deep Work"
- **WHEN** the client POSTs `/api/categories` with name "Deep Work", a hex color, and a description
- **THEN** the system creates a `categories` row owned by that user and responds `201`

#### Scenario: The same name is allowed for two different users
- **GIVEN** user A already has an active category named "Work"
- **WHEN** user B POSTs `/api/categories` with name "Work"
- **THEN** the system creates B's category and responds `201`, because the unique index is `(user_id, name) WHERE archived_at IS NULL` — scoped per user

#### Scenario: A duplicate active name for the same user is rejected
- **GIVEN** the authenticated user already has an active category named "Work"
- **WHEN** the client POSTs `/api/categories` with name "Work" again
- **THEN** the system responds `409` and creates no second row, per the partial unique index

### Requirement: Edit a category (FR-CAT-02)
The system SHALL let the authenticated user update the name, color, and description of one of their
own categories; and SHALL reject a rename whose new name duplicates another of that user's active
categories.

#### Scenario: Name, color, and description are updated
- **GIVEN** an authenticated user owns a category
- **WHEN** the client PATCHes `/api/categories/{id}` with a new name, color, and description
- **THEN** the system updates that row and responds `200` with the updated category

#### Scenario: Renaming onto an existing active name is rejected
- **GIVEN** the user owns active categories "Work" and "Study"
- **WHEN** the client PATCHes the "Study" category's name to "Work"
- **THEN** the system responds `409` and leaves both categories unchanged, per the partial unique index

#### Scenario: A user cannot edit another user's category
- **GIVEN** a category owned by user A
- **WHEN** user B PATCHes `/api/categories/{that id}`
- **THEN** the system responds `404` and changes nothing, because the user_id-scoped repository (FR-AUTH-07) never returns another user's row

### Requirement: Delete a category as archive (FR-CAT-03)
The system SHALL delete a category by **archiving** it when sessions reference it — setting
`archived_at` so history and metrics are preserved and the category no longer appears in the active
list that pickers consume — and MAY hard-delete a category that no session references; this is the
O-4 decision recorded in architecture §7.

#### Scenario: Deleting a category that has sessions archives it
- **GIVEN** an authenticated user owns a category referenced by at least one saved session
- **WHEN** the client DELETEs `/api/categories/{id}`
- **THEN** the system sets the category's `archived_at`, keeps the row as a valid foreign-key target so history and metrics are unaffected, and responds `204`

#### Scenario: An archived category is excluded from the active list
- **GIVEN** the user has one archived category and one active category
- **WHEN** the client GETs `/api/categories`
- **THEN** the response contains only the active category, so any picker built on this list never offers the archived one

#### Scenario: Deleting a category with no sessions may be hard-deleted
- **GIVEN** an authenticated user owns a category that no session references
- **WHEN** the client DELETEs `/api/categories/{id}`
- **THEN** the system MAY remove the row outright (there is no history to preserve) and responds `204`; the category is gone from the active list either way

#### Scenario: A user cannot delete another user's category
- **GIVEN** a category owned by user A
- **WHEN** user B DELETEs `/api/categories/{that id}`
- **THEN** the system responds `404` and changes nothing, because the user_id-scoped repository (FR-AUTH-07) never returns another user's row

