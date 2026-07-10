# ticket-lifecycle Specification

## Purpose

The 5-status ticket lifecycle (FR-STATUS-01/02/03, FR-ACCESS-01): only the
PRD §5.1 transitions are possible — enforced server-side by a dedicated
transition endpoint and reflected in the UI as buttons rendered from the
server-computed `allowedTransitions`; `Закрита` and `Відхилена` are
terminal; every status change lands as a system event in the ticket feed.

## Requirements

### Requirement: Ticket status follows the PRD §5.1 lifecycle

A ticket SHALL always have exactly one of the 5 statuses from PRD §5.1 —
`Нова`, `В роботі`, `Виконана`, `Закрита`, `Відхилена` (FR-STATUS-01).
The API SHALL allow **only** the transitions from the PRD §5.1 table
(FR-STATUS-02): `Нова → В роботі`, `Нова → Відхилена`,
`В роботі → Виконана`, `В роботі → Відхилена`, `Виконана → В роботі`
(повторне відкриття), `Виконана → Закрита`. `Закрита` and `Відхилена`
are terminal — no transition leaves them. All transitions are manual:
the system SHALL NOT change a status on its own.

#### Scenario: Full happy-path lifecycle

- **WHEN** the owner transitions a ticket `Нова → В роботі → Виконана → Закрита` step by step
- **THEN** each transition succeeds and the ticket ends in status `Закрита`

#### Scenario: Reopening a done ticket

- **WHEN** the owner transitions a ticket in `Виконана` to `В роботі` (повторне відкриття)
- **THEN** the transition succeeds and the ticket status is `В роботі`

#### Scenario: Forbidden transition is rejected

- **WHEN** the API receives a transition request not present in the §5.1 table (e.g. `Закрита → В роботі` or `Нова → Виконана`)
- **THEN** the response is an error in the locale-free `{ code, message }` contract and the stored status is unchanged (FR-STATUS-02)

### Requirement: Transitions go through a dedicated endpoint

Status SHALL be changed only through a dedicated owner-scoped transition
endpoint that takes the target status; create and general update SHALL
keep ignoring `status` (unchanged `ticket-crud` contract). The endpoint
SHALL validate the target against the current status atomically enough
that a stale request (current status already moved on) is rejected, not
applied. Foreign or missing tickets SHALL answer in `404` style
(FR-ACCESS-01).

#### Scenario: Transition on another user's ticket

- **WHEN** user Б requests a transition on a ticket of user А by its id
- **THEN** the response is the same `404`-style error as for a nonexistent ticket and the status is unchanged

#### Scenario: Invalid target status value

- **WHEN** a transition request carries a value outside the 5 PRD §5.1 statuses
- **THEN** the response is a `400`-style validation error

### Requirement: Every status change is recorded as a system event

Each successful transition SHALL be recorded as a system event in the
ticket feed capturing who changed it, when, and from which status to
which (FR-STATUS-03). The event SHALL appear in the same single feed as
user notes (FR-FEED-02).

#### Scenario: Transition leaves a feed event

- **WHEN** the owner transitions a ticket `Нова → В роботі`
- **THEN** the ticket feed contains a system event with the author, the date-time, the previous status `Нова` and the new status `В роботі`

#### Scenario: Failed transition leaves no event

- **WHEN** a forbidden transition request is rejected
- **THEN** no feed item is created

### Requirement: Ticket card offers only allowed transitions

The SPA ticket card SHALL show action buttons for exactly the
transitions allowed from the current status per PRD §5.1 (FR-STATUS-02
at the UI level), labeled with the Ukrainian actions from the table
(«взято в роботу», «не виконуємо», «роботу завершено», «повторне
відкриття», «підтверджено й закрито»). Terminal statuses SHALL render
no transition buttons.

#### Scenario: Buttons match the current status

- **WHEN** the owner opens the card of a ticket in `Нова`
- **THEN** exactly two transition actions are offered — to `В роботі` and to `Відхилена`

#### Scenario: Terminal status offers no actions

- **WHEN** the owner opens the card of a ticket in `Закрита` or `Відхилена`
- **THEN** no transition buttons are shown

#### Scenario: UI transition updates card and feed

- **WHEN** the owner triggers an allowed transition from the card
- **THEN** the card shows the new status and the new system event is visible in the feed without a manual reload
