# ticket-list Specification

## Purpose

Owner-scoped ticket list (FR-LIST-01…04, FR-DUE-02, NFR-PERF-01,
NFR-COMPAT-01, with FR-ACCESS-01/NFR-SEC-03 carried through): one
GET /api/tickets endpoint with AND-combined filters (status incl. the
server-expanded «активні» preset, house, category, priority), literal LIKE
search over title/description/requester/executor, createdAt/dueDate sorting
with stable pagination, and the server-computed §5.4 overdue flag —
surfaced by a mobile-first SPA list screen whose filter/search/sort state
lives in the URL.

## Requirements

### Requirement: User's tickets are listed owner-scoped with FR-LIST-01 columns

The API SHALL provide a ticket list endpoint returning only the session
user's tickets (FR-ACCESS-01, NFR-SEC-03), where every row carries the
FR-LIST-01 set: number #N, title, house name, category, priority, status,
due date with an overdue flag, and creation date. The response SHALL be a
page envelope with the total count of matching tickets.

#### Scenario: List returns only own tickets

- **WHEN** users A and B each have tickets and user A requests the list
- **THEN** the response contains all of A's tickets and none of B's

#### Scenario: Row carries the FR-LIST-01 columns

- **WHEN** a user with a ticket requests the list
- **THEN** the row exposes number #N, title, house name, category, priority, status, due date, overdue flag and creation date

### Requirement: Filters combine — status with the активні preset, house, category, priority

The API SHALL accept optional filters by status, house, category and
priority, combined with AND when several are present (FR-LIST-02). The
status filter SHALL accept one or more concrete statuses, or the preset
token `ACTIVE`, which the server SHALL expand to the PRD §5.1 active
statuses (`Нова`, `В роботі`) — the client owns no activity rule. An
unknown filter value SHALL be rejected with a `400`-style
`{ code, message }` error, not silently ignored.

#### Scenario: Активні preset combines with a house filter

- **WHEN** a user has tickets of different statuses across two houses and requests the list with the `ACTIVE` preset and one house
- **THEN** only tickets of that house in statuses `Нова` or `В роботі` are returned

#### Scenario: Concrete status filter

- **WHEN** a user requests the list filtered by status `Відхилена`
- **THEN** only rejected tickets are returned

#### Scenario: Invalid filter value is a 400

- **WHEN** a client requests the list with a status, category, priority or house id that is not a valid value
- **THEN** the response is a `400`-style `{ code, message }` error

### Requirement: Simple LIKE search over text fields

The API SHALL accept a search string and match it as a case-insensitive
substring (LIKE) against title, description, requester name, requester
phone and executor (FR-LIST-03 — «заявник» is the name+phone pair),
combining with any active filters. A blank search string SHALL be treated
as no search.

#### Scenario: Search by requester surname

- **WHEN** a user searches for a requester's surname present on two tickets and absent elsewhere
- **THEN** exactly those two tickets are returned, regardless of letter case

#### Scenario: Search combines with filters

- **WHEN** a user searches a term matching tickets in two statuses and also applies the `ACTIVE` preset
- **THEN** only the matching tickets in active statuses are returned

### Requirement: Sorting by creation date and due date with stable pagination

The API SHALL sort by creation date (default: newest first) or by due date
(FR-LIST-04), in ascending or descending order; tickets without a due date
SHALL go last for due-date sorting, and equal keys SHALL keep a
deterministic order across pages. The API SHALL paginate with a page
number and page size (bounded default), and the envelope's total SHALL
let the client detect the last page. Malformed paging values SHALL be
rejected with a `400`-style error.

#### Scenario: Default order is newest first

- **WHEN** a user with several tickets requests the list without sort parameters
- **THEN** tickets come ordered by creation date descending

#### Scenario: Due-date sort puts undated tickets last

- **WHEN** a user sorts by due date ascending and some tickets have no due date
- **THEN** dated tickets come first in date order and undated ones follow

#### Scenario: Second page continues the list

- **WHEN** a user has more tickets than one page and requests page 2 with the same parameters
- **THEN** the response returns the next slice with no repeats or gaps relative to page 1 and the same total

### Requirement: Overdue tickets are flagged by the server

The API SHALL mark a list row overdue exactly per PRD §5.4: a due date is
set, it is in the past, and the status is active (`Нова`, `В роботі`) —
computed server-side so the client owns no §5.4 rule (FR-DUE-02). The flag
SHALL cause no side effects — no auto-transitions, no notifications.

#### Scenario: Active overdue ticket is flagged, closed one is not

- **WHEN** two tickets share yesterday's due date, one `В роботі` and one `Закрита`, and the list is requested
- **THEN** the first row is flagged overdue and the second is not

#### Scenario: Due today is not overdue

- **WHEN** a ticket in an active status has today's due date
- **THEN** its list row is not flagged overdue

### Requirement: SPA provides the mobile-first ticket list screen

The SPA SHALL provide a guarded Ukrainian mobile-first list screen
(NFR-COMPAT-01) as the ticket entry point, reachable from the app's main
navigation: rows with the FR-LIST-01 columns linking to the ticket card,
filter controls for status (including an «активні» preset), house,
category and priority, a search input, a sort switch, and a load-more
control that appends the next page (FR-LIST-04). Overdue rows SHALL be
visually highlighted (FR-DUE-02). Filter, search and sort state SHALL
live in the URL so a filtered list survives reload and back navigation;
the load-more depth is in-memory and starts over on reload. The
«Нова заявка» action SHALL be reachable from the list.

#### Scenario: Combined filtering from the UI

- **WHEN** a logged-in user opens the list, picks the «активні» preset and a house
- **THEN** only matching rows remain and the URL reflects the selection

#### Scenario: Load more appends the next page

- **WHEN** the user has more tickets than one page and taps «Показати ще»
- **THEN** the next page's rows are appended and the control disappears on the last page

#### Scenario: Filtered URL survives reload

- **WHEN** the user reloads a list URL carrying filters and a search term
- **THEN** the same filtered result is shown with the controls reflecting the URL state

#### Scenario: Overdue row is visibly distinct

- **WHEN** the list contains an overdue ticket and a non-overdue one
- **THEN** the overdue row is visually highlighted and the other is not

#### Scenario: Empty result is understandable

- **WHEN** filters or search match no tickets
- **THEN** the screen shows an understandable Ukrainian empty state instead of a blank list

### Requirement: List stays responsive at POC volumes

The list endpoint SHALL answer within the NFR-PERF-01 budget (≤ 1 s p95,
network excluded) at POC volumes (hundreds of tickets per user), backed by
composite indexes covering the owner-scoped status and house filters.

#### Scenario: Hundreds of tickets stay fast

- **WHEN** a user with hundreds of tickets requests a filtered first page
- **THEN** the API responds well within the NFR-PERF-01 budget
