# ticket-crud Specification

## Purpose

Owner-scoped ticket creation, editing and card (FR-TICKET-01/02/04,
FR-DUE-01 partially, FR-STATUS-01 partially, FR-ACCESS-01, NFR-SEC-03):
the core service-desk entity with its full attribute set — category /
priority / status enums per PRD §5.1–5.3, auto number #N, initial status
`Нова`, no deletion — behind the house-directory owner-isolation idiom,
with the SPA form and card as the first mobile-first screens.

## Requirements

### Requirement: User can create a ticket

The API SHALL allow an authenticated user to create a ticket
(FR-TICKET-01) with: a required title (non-empty text), a required house
referencing the user's own directory, a required category from the fixed
PRD §5.2 list, a priority from PRD §5.3 defaulting to «Звичайна», and
optional description, requester name, requester phone, executor (plain
text) and due date. The ticket SHALL belong to the session user. Missing
or invalid required fields SHALL be rejected with a `400`-style
validation error in the locale-free `{ code, message }` contract.

#### Scenario: Ticket is created with required fields

- **WHEN** an authenticated user creates a ticket with a title, one of their houses and a category
- **THEN** the response is success and the ticket exists with priority «Звичайна» by default and the given attributes

#### Scenario: Empty title is rejected

- **WHEN** an authenticated user submits a ticket with an empty or whitespace-only title, or without a house or category
- **THEN** the response is a `400`-style validation error and no ticket is created

#### Scenario: Foreign or missing house is rejected in 404 style

- **WHEN** an authenticated user creates a ticket with a `houseId` that does not exist or belongs to another user
- **THEN** the response is the same `404`-style error for both cases and no ticket is created (FR-ACCESS-01)

### Requirement: New ticket starts in status Нова with a sequential number

A newly created ticket SHALL have status `Нова` (FR-STATUS-01) and a
sequential human-visible number #N derived from its auto-increment id
(FR-TICKET-02). The status SHALL NOT be changeable through create or
update in this capability — transitions are a separate capability (S-05).

#### Scenario: Created ticket is Нова and numbered

- **WHEN** a user creates a ticket
- **THEN** the response contains status `Нова` and a positive integer number #N unique across tickets

#### Scenario: Status cannot be set through create or update

- **WHEN** a create or update request supplies a status value
- **THEN** the supplied status is rejected or ignored and the stored status is unchanged (`Нова` for a new ticket)

### Requirement: User can edit ticket attributes

The API SHALL allow the owner to update every FR-TICKET-01 field of
their ticket — title, description, house, category, priority, requester
name/phone, executor and due date — with the same validation as creation
(FR-TICKET-01). The due date SHALL be settable and clearable
(FR-DUE-01). A changed `houseId` SHALL be verified against the owner's
directory with the same 404-style rule as creation.

#### Scenario: Executor and due date are updated

- **WHEN** the owner updates a ticket's executor and due date
- **THEN** the changes are persisted and returned by a subsequent read

#### Scenario: Due date is cleared

- **WHEN** the owner updates a ticket setting the due date to empty
- **THEN** the stored due date is removed and the subsequent read returns no due date

#### Scenario: Title cannot be emptied

- **WHEN** the owner submits an update with an empty title
- **THEN** the response is a `400`-style validation error and the stored ticket is unchanged

### Requirement: Ticket records creation time and owner; no deletion

Every ticket SHALL automatically store its creation date-time and its
author-owner (FR-TICKET-04). The API SHALL NOT expose ticket deletion —
an unwanted ticket is handled by the `Відхилена` status once transitions
exist (S-05).

#### Scenario: Creation metadata is stored automatically

- **WHEN** a user creates a ticket
- **THEN** the ticket has a creation date-time and the session user as owner, without the client supplying either

#### Scenario: Deletion is not available

- **WHEN** a client sends `DELETE` for a ticket id
- **THEN** the API answers that the route or method does not exist and the ticket remains

### Requirement: Foreign or missing ticket answers in 404 style

Every ticket endpoint that takes an id SHALL verify ownership as a
security boundary (FR-ACCESS-01, NFR-SEC-03), following the
house-directory idiom: a ticket that does not exist and a ticket owned by
another user SHALL produce the same `404`-style response with no way to
distinguish the cases.

#### Scenario: Another user's ticket by direct URL

- **WHEN** user B requests or updates a ticket owned by user A by its direct id
- **THEN** the response is `404`-style, identical in shape to a request for a nonexistent id, and the ticket is unchanged

#### Scenario: Nonexistent ticket

- **WHEN** an authenticated user requests a ticket id that does not exist
- **THEN** the response is the same `404`-style error

### Requirement: SPA provides ticket form and card

The SPA SHALL provide guarded Ukrainian mobile-first screens
(NFR-COMPAT-01, from this slice on): a ticket create/edit form — house
select fed from the user's directory, fixed category and priority
selects, date picker for the due date, text inputs for the rest — and a
ticket card showing the number #N, status and every FR-TICKET-01
attribute. Ticket creation SHALL be reachable from the app's main
navigation; after create or edit the user lands on the card. The card
SHALL show no transition, feed or attachment UI in this capability. An
overdue ticket (server-computed flag, PRD §5.4) SHALL be visually
highlighted on the card (FR-DUE-02) — the highlight is purely visual,
with no auto-actions.

#### Scenario: Create from UI lands on the card

- **WHEN** a logged-in user with a house opens «Нова заявка», fills title, house and category and submits
- **THEN** they land on the ticket card showing number #N, status «Нова» and the entered attributes

#### Scenario: Edit from the card

- **WHEN** the owner opens editing from the ticket card, changes the executor and due date and saves
- **THEN** the card shows the updated values

#### Scenario: Validation errors are understandable

- **WHEN** a user submits the form without a title, house or category
- **THEN** the form shows understandable Ukrainian validation messages and nothing is submitted

#### Scenario: No house yet is not a dead end

- **WHEN** a user with an empty house directory opens the ticket form
- **THEN** they see an understandable Ukrainian hint leading them to create a house first

#### Scenario: Overdue ticket is highlighted on the card

- **WHEN** the owner opens the card of a ticket with a past due date in an active status, and the card of a ticket in `Закрита` with the same due date
- **THEN** the first card shows the overdue highlight and the second does not
