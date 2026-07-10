# house-directory Specification (delta)

## ADDED Requirements

### Requirement: User can create a house

The API SHALL allow an authenticated user to create a house in their personal
directory (FR-HOUSE-01): a required name/address (non-empty text) and an
optional note. The created house SHALL belong to the session user
(owner-scoped) and SHALL be validated server-side — an empty or missing
name/address is rejected with a `400`-style validation error.

#### Scenario: House is created with name and note

- **WHEN** an authenticated user creates a house with name «Шевченка 12» and a note
- **THEN** the response is success and the house exists in that user's directory with the given name and note

#### Scenario: Empty name is rejected

- **WHEN** an authenticated user submits a house with an empty or whitespace-only name/address
- **THEN** the response is a `400`-style validation error and no house is created

### Requirement: User sees only their own houses

The API SHALL expose the list of houses belonging to the session user, and a
single-house read by id (FR-HOUSE-01). The list SHALL contain only the
owner's houses — never another user's (FR-ACCESS-01).

#### Scenario: List returns only own houses

- **WHEN** user A has houses and user B requests the houses list
- **THEN** user B's response contains only user B's houses, none of user A's

#### Scenario: Own house is readable by id

- **WHEN** an authenticated user requests one of their houses by id
- **THEN** the response contains that house's name/address and note

### Requirement: User can edit a house

The API SHALL allow the owner to update a house's name/address and note
(FR-HOUSE-01). The same validation as creation applies (name/address stays
required); the update SHALL be visible on subsequent reads.

#### Scenario: Note is updated

- **WHEN** the owner updates a house's note
- **THEN** the change is persisted and returned by subsequent list/get responses

#### Scenario: Name cannot be emptied

- **WHEN** the owner submits an update with an empty name/address
- **THEN** the response is a `400`-style validation error and the stored house is unchanged

### Requirement: Foreign or missing house answers in 404 style

Every house endpoint that takes an id SHALL verify ownership as a security
boundary, not a UX filter (FR-ACCESS-01, NFR-SEC-03): a house that does not
exist and a house owned by another user SHALL produce the same `404`-style
response, with no way to distinguish "not found" from "not yours". This rule
is the owner-isolation pattern all later slices follow for their objects.

#### Scenario: Another user's house by direct URL

- **WHEN** user B requests, updates, or deletes a house owned by user A by its direct id
- **THEN** the response is `404`-style, identical in shape to a request for a nonexistent id, and the house is unchanged

#### Scenario: Nonexistent house

- **WHEN** an authenticated user requests a house id that does not exist
- **THEN** the response is the same `404`-style error

### Requirement: House deletion is blocked while tickets reference it

The API SHALL allow the owner to delete a house that has no tickets attached,
and SHALL refuse deletion with an understandable Ukrainian error while at
least one ticket references the house (FR-HOUSE-02). The invariant is
enforced server-side; tickets arrive in S-04, which makes the refusal path
observable end-to-end.

#### Scenario: House without tickets is deleted

- **WHEN** the owner deletes a house that has no tickets
- **THEN** the response is success and the house disappears from the directory

#### Scenario: House with a ticket is not deleted

- **WHEN** the owner deletes a house that has at least one ticket attached (possible from S-04 on)
- **THEN** the response is an understandable error, the house remains, and no data is lost

### Requirement: Houses screen lets the user manage the directory

The SPA SHALL provide a houses screen (Ukrainian UI) on a guarded route:
the list of the user's houses, creating a house, editing its name/address
and note, and deleting it — with API validation and deletion-refusal errors
shown as understandable messages (FR-HOUSE-01/02). The screen SHALL be
reachable from the app's main navigation.

#### Scenario: Create and edit via UI

- **WHEN** a logged-in user creates house «Шевченка 12» from the houses screen and then edits its note
- **THEN** the list shows the house with the updated data without a page reload

#### Scenario: Empty directory is not a dead end

- **WHEN** a user with no houses opens the houses screen
- **THEN** they see an empty state in Ukrainian with a clear way to create the first house
