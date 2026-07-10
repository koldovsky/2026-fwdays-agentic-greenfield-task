## Context

S-04/S-05 delivered the ticket entity, its card and the full lifecycle, but
deliberately no list route (`tickets.controller.ts` documents "the list
arrives in S-06"). The SPA reaches tickets only via direct URLs; the home
page links to «Нова заявка» and «Будинки». The `ticket` table has a single
`@@index([userId])`.

Existing idioms this design must follow:

- Owner scoping on every query, 404-parity for foreign/missing ids
  (FR-ACCESS-01, house-directory idiom).
- Locale-free `{ code, message }` error contract (S-02 D6,
  `ticket-errors.ts`).
- Domain rules live server-side, the SPA renders what the API computed —
  S-05 precedent: the card ships `allowedTransitions`, the SPA owns no
  transition table.
- Web: ADR-0009 — zoneless + OnPush, container/presentational, signals +
  facade, Material tokens only.

## Goals / Non-Goals

**Goals:**

- One list endpoint covering FR-LIST-01…04 (filters, LIKE search, sorting,
  pagination) and FR-DUE-02 (overdue flag), fast at POC volumes
  (NFR-PERF-01) via composite indexes.
- Mobile-first list screen (NFR-COMPAT-01) that becomes the main ticket
  entry point.
- Overdue highlighting on the card as well as the list.

**Non-Goals:**

- Full-text search, saved filters, export, overdue filter/auto-actions.
- Cursor pagination or virtualized lists — POC volumes are hundreds of rows.
- Any change to create/update/transition/feed behavior.

## Decisions

### D1. One `GET /api/tickets` endpoint with query params

`GET /api/tickets?status=&houseId=&category=&priority=&q=&sort=&order=&page=&pageSize=`
on the existing tickets controller/service. All filters combine with AND
(FR-LIST-02). Response is a page envelope:

```
{ items: TicketListItemDto[], total: number, page: number, pageSize: number }
```

`TicketListItemDto` is a slim projection of exactly the FR-LIST-01 columns:
`id` (number #N), `title`, `houseName`, `category`, `priority`, `status`,
`dueDate`, `isOverdue`, `createdAt`. No `description`/`allowedTransitions` —
the card DTO stays the detail view. _Alternative:_ reuse `TicketDto` —
rejected: drags card-only fields (and a per-row transitions computation)
into every row.

### D2. Status filter accepts concrete statuses and the `ACTIVE` preset

`status` takes a comma-separated list of `TicketStatus` values, or the
single token `ACTIVE`, which the server expands to `NEW,IN_PROGRESS`
(PRD §5.1 «Активні»). A shared `ACTIVE_STATUSES` constant drives both the
preset and the overdue rule (D3), so «which statuses are active» exists in
one place, server-side — consistent with the S-05 `allowedTransitions`
precedent. _Alternative:_ let the SPA translate the preset into two
statuses — rejected: duplicates the §5.1 activity rule into the client.

### D3. `isOverdue` is computed server-side, on list rows and the card

Overdue per PRD §5.4: due date set AND in the past AND status ∈
`ACTIVE_STATUSES`. The service computes `isOverdue` for every list row, and
`toTicketDto` gains the same field so the card highlight (FR-DUE-02) reuses
it — the SPA only styles the flag. "Past" compares the `YYYY-MM-DD` due
date against the current date in the `Europe/Kyiv` timezone (the product is
single-market; the server runs in UTC on Railway, and a plain UTC "today"
would flip the highlight 2–3 hours late for Ukrainian users).
_Alternative:_ compute in the SPA from `dueDate`+`status` — rejected: moves
the §5.4 activity rule client-side and skips API-level tests.

### D4. LIKE search via Prisma `contains` OR

`q` (trimmed, non-empty) becomes
`OR [title|description|requesterName|requesterPhone|executor] contains q`
inside the owner-scoped `where` (FR-LIST-03; «заявник» on a ticket is the
name+phone pair, so both fields participate). The schema's
`utf8mb4_unicode_ci` collation (see the `ticket` migration) makes LIKE
case-insensitive — no extra work. LIKE wildcards (`%`, `_`) in the term are
escaped before the query — the user searches literal text (review finding).
No index can serve a `%q%` scan; at POC volumes the scan is bounded by the
user's own rows (D6 indexes narrow the candidates first).

### D5. Sorting: `createdAt` (default desc) and `dueDate`, nulls last, stable

`sort` ∈ `createdAt | dueDate` (FR-LIST-04), `order` ∈ `asc | desc`;
default `createdAt desc` (newest first). For `dueDate`, rows without a due
date go last regardless of direction (Prisma `nulls: 'last'`). Every order
gets a deterministic `id desc` tie-break so pagination never shuffles equal
keys.

### D6. Offset pagination + «Показати ще» in the UI; composite indexes

`page` (1-based) / `pageSize` (default 20, max 100); the envelope carries
`total` so the UI knows when to stop. The SPA renders a «Показати ще»
load-more button that appends the next page — infinite-scroll UX on mobile
without IntersectionObserver machinery (BC-PRIN-01), and it satisfies
FR-LIST-04's "pagination or infinite scroll from ~50 records".
_Alternative:_ cursor pagination — rejected: `total` and page math get
harder, and offset drift is harmless at POC scale.

Prisma migration adds `@@index([userId, status])` and
`@@index([userId, houseId])` (the plan's indexes for the two hottest
filters) and drops the now-redundant `@@index([userId])` — the
`userId+status` composite is a superset prefix and keeps satisfying the FK
index requirement (NFR-PERF-01).

### D7. Invalid query values fail with a 400 code, not silently

Unknown enum values, malformed numbers or out-of-range paging in query
params answer `400` with a new `TICKET_QUERY_INVALID` code in the existing
`TicketError` contract — same testable, locale-free shape as the rest;
the SPA maps it like any other code. _Alternative:_ silently ignore bad
filters — rejected: masks client bugs and is untestable.

### D8. List screen: URL-synced filters, facade-owned state

New `TicketListPage` container at the `tickets` index route (`/tickets`),
with presentational `ticket-list` (rows) and `ticket-filters` (status
preset chips + selects + search + sort) components. Filter/search/sort state
lives in the URL query params (deep-linkable, browser-back works,
Playwright can navigate straight to a filtered list); the load-more page
depth is deliberately NOT in the URL — a reloaded `page=3` cannot honestly
restore three appended pages, so reload starts at page 1. The facade
translates route params → API query and exposes `items/total/loading/error`
signals, following the existing tickets facade idiom. Search input is debounced in
the component before it touches the URL. The home page nav gains a
«Заявки» link to `/tickets`; the list screen carries the «Нова заявка»
action. Overdue rows/card use a visual state built from Material tokens
(`--mat-sys-error*`) — no hardcoded colors (В-04 gate).

## Risks / Trade-offs

- [LIKE over 5 columns can't use an index] → acceptable: owner-scoped
  candidates first (composite indexes), POC volume is hundreds of rows
  (NFR-PERF-01 headroom is large).
- [Hardcoded `Europe/Kyiv` for the overdue boundary] → single-market POC
  assumption; an off-by-hours highlight for a traveling user is cosmetic
  (FR-DUE-02 is visual-only). Revisit only if multi-TZ ever appears.
- [Offset pagination drifts when rows are inserted between «Показати ще»
  clicks] → worst case a duplicate row appears once; stable `id desc`
  tie-break keeps it deterministic; harmless at POC scale.
- [Dropping `@@index([userId])`] → covered by the `[userId, status]`
  prefix; MySQL FK requirement stays satisfied. Verified in the migration
  SQL during implementation.

## Migration Plan

Single additive Prisma migration (two new composite indexes, one index
drop) — no data changes, applies online at POC table sizes. Deploy is the
usual Railway image; rollback = revert the commit (the old code never sees
the new indexes, dropping them is optional).

## Open Questions

- None blocking. (If review wants search over the house name too, that is a
  scope add beyond FR-LIST-03 — punt unless requested.)
