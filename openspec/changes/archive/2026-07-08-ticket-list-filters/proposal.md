## Why

Slice **S-06 «Список, фільтри, пошук, прострочення»** (Е-5) from
`docs/mvp-capability-plan.md`. After S-04/S-05 a user can create tickets and
drive them through the full lifecycle, but the only way to reach a ticket is
its direct URL — there is no list. This slice makes every ticket findable
(list, combinable filters, LIKE search, sorting, pagination) and makes overdue
tickets immediately visible in both the list and the card.

Covers **FR-LIST-01…04, FR-DUE-02, NFR-PERF-01, NFR-COMPAT-01** (PRD §7.8,
§7.5, §8).

## What Changes

- New `GET /api/tickets` list endpoint: owner-scoped, combinable filters
  (status incl. the «активні» preset, house, category, priority), LIKE search
  over title / description / requester / executor, sorting by creation date
  (default: newest first) and by due date, pagination.
- New SPA list screen (mobile-first): ticket rows with number, title, house,
  category, priority, status, due date and creation date (FR-LIST-01), filter
  controls, search input, sort switch, paging from ~50 records.
- Overdue highlighting (PRD §5.4: due date set, in the past, status active) in
  the list rows and on the ticket card (FR-DUE-02) — purely visual, no
  auto-actions.
- The list becomes the app's main ticket entry point: card and creation form
  are reachable from it.
- DB: composite indexes to keep the owner-scoped filtered list fast on POC
  volumes (`user_id + status`, `user_id + house_id`; NFR-PERF-01).

## Capabilities

### New Capabilities

- `ticket-list`: owner-scoped ticket list — columns per FR-LIST-01,
  combinable filters with the «активні» preset (FR-LIST-02), LIKE search
  (FR-LIST-03), sorting and pagination (FR-LIST-04), overdue highlighting in
  the list (FR-DUE-02), mobile-first screen (NFR-COMPAT-01), POC-scale
  responsiveness (NFR-PERF-01).

### Modified Capabilities

- `ticket-crud`: the ticket card SHALL visually highlight an overdue ticket
  (FR-DUE-02 applies to «списку та картці» — the card half lands here, since
  the card belongs to this capability).

## Impact

- **API** (`api/`): new list handler in the existing tickets module
  (controller + service + DTO for query params); no changes to existing
  endpoints' contracts. Errors stay in the locale-free `{ code, message }`
  contract (S-02 D6).
- **DB** (Prisma): one migration adding composite indexes on `ticket`
  (`user_id + status`, `user_id + house_id`). No schema/data shape changes.
- **Web** (`web/`): new list route/container + presentational components,
  facade per ADR-0009 (signals, no NgRx); card component gains the overdue
  visual state; navigation updated so the list is the home screen for
  tickets.
- **Tests**: api unit + api-e2e for filter/search/sort/pagination and owner
  isolation; web unit for facade/overdue logic; Playwright for the S-06
  acceptance scenarios.

## Non-goals

- Full-text search (LIKE only), saved filters, export (plan §S-06 non-goals).
- Notifications, SLA or any auto-actions on overdue — highlighting only.
- Attachments (S-07); any change to lifecycle/feed behavior (S-05).
- Performance work beyond POC volumes (hundreds of tickets, NFR-PERF-01).
