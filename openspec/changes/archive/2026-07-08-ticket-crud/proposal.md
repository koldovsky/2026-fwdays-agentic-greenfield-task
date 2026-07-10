# Proposal: ticket-crud

## Why

Slice **S-04 «Заявка: створення, редагування, картка»** (docs/mvp-capability-plan.md,
Е-3): the ticket is the core domain object of the service desk — everything
later (lifecycle, feed, attachments, list) hangs off it. This slice creates
the `ticket` entity with its full attribute set and the create / edit / card
contour, and closes the FR-HOUSE-02 debt left by S-03: the house→ticket FK
now exists, so "cannot delete a house with tickets" becomes observable and
tested end-to-end.

## What Changes

- New `ticket` table (Prisma migration): owner-scoped tickets with title,
  optional description, required house from the user's directory, manual
  requester (name + phone, optional text), category / priority / status
  enums per PRD §5.1–5.3, optional executor (text) and optional due date
  (FR-TICKET-01). The BIGINT AI `id` doubles as the human-visible number #N
  (FR-TICKET-02, PRD §9.1).
- New REST endpoints under the existing session guard: create / get / update
  a ticket, every operation scoped to the session owner with the S-03
  404-style idiom for foreign/missing tickets — and for a foreign/missing
  `houseId` supplied on create/update (FR-ACCESS-01, NFR-SEC-03).
- A new ticket is always created in status `Нова`; status is **not** editable
  in this slice (FR-STATUS-01 partially; transitions arrive in S-05). Created
  timestamp and owner are stored automatically; there is no delete endpoint —
  an unwanted ticket is handled by the `Відхилена` status later (FR-TICKET-04).
- All FR-TICKET-01 fields are editable after creation, including setting and
  clearing the due date (FR-DUE-01 partially; system events for field changes
  arrive with the feed in S-05).
- FR-HOUSE-02 becomes enforced: FK `ticket.house_id → house.id` with
  `onDelete: Restrict` plus the service-level check in house deletion that
  maps to an understandable refusal error (archived S-03 design D3),
  with the api-e2e refusal test that S-03 deferred.
- New SPA screens (Ukrainian, mobile-first from this slice on, ADR-0009
  conventions): ticket create/edit form (house select from the directory,
  category/priority selects, date picker) and the ticket card showing all
  attributes, number #N and status — without feed, transitions or
  attachments. Entry point from the home navigation.

## Capabilities

### New Capabilities

- `ticket-crud`: owner-scoped ticket creation, editing and card — full
  attribute set with category/priority/status enums, auto number #N, initial
  status `Нова`, owner isolation with 404-style answers, no deletion
  (FR-TICKET-01/02/04, FR-DUE-01 partially, FR-STATUS-01 partially,
  FR-ACCESS-01, NFR-SEC-03).

### Modified Capabilities

<!-- none: FR-HOUSE-02 refusal is already specified in house-directory
     (scenario "House with a ticket is not deleted"); this slice implements
     and tests it without changing the requirement. -->

## Impact

- **DB:** new Prisma model `ticket` + enums (category, priority, status);
  FK to `house` with `Restrict`, FK to `user`; migration is additive.
- **API:** new `tickets` module (controller/service/DTOs) behind the global
  `SessionGuard`; `houses` service delete gains the has-tickets check and a
  new error code in the locale-free `{ code, message }` contract.
- **Web:** new guarded routes (`/tickets/new`, `/tickets/:id`,
  `/tickets/:id/edit`), tickets facade + api service + container/
  presentational components; home navigation gains «Нова заявка»; houses
  screen shows the delete-refusal error it could not trigger before.
- **Tests:** api unit (validation, owner scoping, house check); api-e2e
  (CRUD happy path, two-user isolation for tickets and for `houseId`,
  FR-HOUSE-02 refusal, 401 without cookie); web unit (facade); Playwright
  e2e for the acceptance scenarios (create → card, edit executor/due date,
  house-with-ticket delete refusal).
- **Docs:** traceability-matrix rows for FR-TICKET-01/02/04 (+ FR-HOUSE-02
  test column); current-state update at slice end.

## Non-goals

- Status transitions and their UI (S-05); the card shows the status, no
  buttons.
- Feed, notes, system events — including events for field edits
  (FR-TICKET-03, S-05).
- Attachments (S-07).
- Ticket list, filters, search, overdue highlighting (S-06; FR-DUE-02);
  the card is reached from the create/edit flow and by direct URL.
- Requester/executor directories — plain text fields per PRD §4.
