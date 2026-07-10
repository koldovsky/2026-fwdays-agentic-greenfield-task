# ticket-feed Delta (S-05)

## ADDED Requirements

### Requirement: Ticket has a single append-only chronological feed

Each ticket SHALL have exactly one feed (PRD §5.5) combining two kinds of
items — user **notes** and automatic **system events** — ordered
chronologically. Every item SHALL carry its author and date-time of
creation. The feed is append-only: the API SHALL NOT provide editing or
deleting of feed items (FR-FEED-01). Feed access SHALL be owner-scoped:
foreign or missing tickets answer in `404` style (FR-ACCESS-01).

#### Scenario: Feed is chronological and mixed

- **WHEN** the owner reads the feed of a ticket that has notes and system events
- **THEN** all items of both kinds come in one chronological sequence, each with author and date-time

#### Scenario: Feed items cannot be edited or deleted

- **WHEN** a client attempts to edit or delete an existing feed item
- **THEN** no such API operation exists and the item stays unchanged

#### Scenario: Foreign ticket feed is invisible

- **WHEN** user Б requests the feed or appends a note to a ticket of user А
- **THEN** the response is the same `404`-style error as for a nonexistent ticket

### Requirement: User can append a text note

The API SHALL allow the ticket owner to append a text note to the feed
(FR-FEED-01): non-empty text, stored with the author and date-time.
Empty or whitespace-only notes SHALL be rejected with a `400`-style
validation error in the locale-free `{ code, message }` contract.

#### Scenario: Note is appended

- **WHEN** the owner submits a non-empty text note
- **THEN** the note appears at the end of the feed with the author and date-time

#### Scenario: Empty note is rejected

- **WHEN** the owner submits an empty or whitespace-only note
- **THEN** the response is a `400`-style validation error and the feed is unchanged

### Requirement: Field changes are recorded as system events

The ticket update SHALL automatically record each change of house,
category, priority, executor and due date as a system event in the
feed, capturing who, when, which field and the old → new values
(FR-TICKET-03); clearing or setting the due date counts as a change
(FR-DUE-01). Attribute changes SHALL NOT change the ticket status
(PRD §5.1 rules). Updates that do not touch these fields, or set a field
to its current value, SHALL NOT produce an event.

#### Scenario: Tracked field change produces an event

- **WHEN** the owner changes the executor and due date of a ticket in one update
- **THEN** the feed gains system events recording the executor change and the due-date change with old and new values

#### Scenario: No-op update produces no event

- **WHEN** the owner submits an update that only repeats current values or touches untracked fields (e.g. title, description)
- **THEN** no system event is appended

#### Scenario: Attribute change keeps the status

- **WHEN** the owner changes the category of a ticket in `В роботі`
- **THEN** the status is still `В роботі` and only a system event is added

### Requirement: SPA shows the feed in the ticket card

The ticket card SHALL render the feed (mobile-first, NFR-COMPAT-01):
items in chronological order, notes and system events **visually
distinct** (FR-FEED-02), each with author and date-time, plus an input
for appending a note. System-event texts SHALL be rendered in Ukrainian
by the SPA from locale-free API data (S-02 D6 contract).

#### Scenario: Notes and events look different

- **WHEN** the owner opens the card of a ticket with notes and system events
- **THEN** both kinds are visible in one feed and are visually distinguishable

#### Scenario: Note added from the card

- **WHEN** the owner types a note in the card and submits it
- **THEN** the note appears in the feed without a manual reload

#### Scenario: Empty note is blocked in UI

- **WHEN** the owner tries to submit an empty note from the card
- **THEN** the note is not sent and an understandable Ukrainian validation hint is shown
