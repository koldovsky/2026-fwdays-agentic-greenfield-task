# Design: ticket-crud (S-04)

## Context

S-03 established the domain-CRUD pattern: owner-scoped Prisma model, service
with in-service validation and locale-free `{ code, message }` errors, the
one-query owner check (`WHERE id AND user_id` → identical 404 for foreign and
missing), signals-facade SPA feature (ADR-0009). S-04 applies that pattern to
the core entity `ticket` and adds what S-03 could not test: the house→ticket
FK behind FR-HOUSE-02 (archived S-03 design D3). `HouseErrorCode` already
reserves `HOUSE_HAS_TICKETS` (409). Constraints: BC-PRIN-01, ADR-0001/0002
stack, ADR-0009 web conventions, Material tokens only (В-04), mobile-first
from this slice on (TC-UI-01).

## Goals / Non-Goals

**Goals:**

- `ticket` table + enums + migration; create/get/update API scoped to the
  session owner, reusing the S-03 owner-check idiom for the ticket **and**
  for the `houseId` it references.
- FR-HOUSE-02 enforced end-to-end: FK `Restrict` + service check + refusal
  test.
- Ticket form (create/edit) and ticket card in the SPA, mobile-first.

**Non-Goals:**

- Status transitions, feed, system events, attachments, ticket list —
  S-05…S-07 (proposal Non-goals).
- List-filter indexes (`user_id+status`, `user_id+house_id`) — added in
  S-06 with the queries that need them.

## Decisions

### D1. Data model

```prisma
enum TicketCategory {
  PLUMBING          // Сантехніка
  HEATING           // Опалення / теплопостачання
  ELECTRICITY       // Електропостачання
  ELEVATOR          // Ліфт
  ROOF_FACADE       // Покрівля та фасад
  COMMON_AREAS      // Під'їзд і МЗК
  GROUNDS           // Прибудинкова територія / благоустрій
  ACCESS_SYSTEMS    // Домофон / шлагбаум / відеоспостереження
  OTHER             // Інше
}

enum TicketPriority {
  EMERGENCY // Аварійна
  HIGH      // Висока
  NORMAL    // Звичайна (default)
}

enum TicketStatus {
  NEW         // Нова
  IN_PROGRESS // В роботі
  DONE        // Виконана
  CLOSED      // Закрита
  REJECTED    // Відхилена
}

model Ticket {
  id             BigInt         @id @default(autoincrement())
  userId         BigInt         @map("user_id")
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  houseId        BigInt         @map("house_id")
  house          House          @relation(fields: [houseId], references: [id], onDelete: Restrict)
  title          String         @db.VarChar(255)
  description    String?        @db.Text
  category       TicketCategory
  priority       TicketPriority @default(NORMAL)
  status         TicketStatus   @default(NEW)
  requesterName  String?        @map("requester_name") @db.VarChar(255)
  requesterPhone String?        @map("requester_phone") @db.VarChar(32)
  executor       String?        @db.VarChar(255)
  dueDate        DateTime?      @map("due_date") @db.Date
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  @@index([userId])
  @@map("ticket")
}
```

- Enums at schema level (PRD §9.2), **English keys** in DB/API — the API
  stays locale-free like the error contract; Ukrainian labels live only in
  the SPA. Alternative rejected: Ukrainian enum values in MySQL — couples
  the wire format to locale and breaks the S-02 D6 principle.
- `id` doubles as number #N (PRD §9.1) — no separate counter.
- `onDelete: Restrict` on `house` is the DB backstop for FR-HOUSE-02; the
  user relation stays `Cascade` like other tables (no user-deletion path
  exists in the app, the theoretical cascade-vs-restrict conflict is
  acceptable at POC scale).
- `dueDate` is `@db.Date` — a calendar date without time (PRD §5.4), which
  avoids all timezone drift; the wire format is `YYYY-MM-DD`.
- `requesterPhone` is free text (PRD §4: manual requester, no normalization
  like auth phones); 32 chars is a sanity cap, not a format rule.

### D2. API shape

New `tickets` module behind the global guard, S-03 idioms throughout
(`Number(id)` serialization, service-side validation, `TicketError` with
`{ code, message }`):

- `POST /api/tickets` — create; body `{ title, houseId, category, priority?,
description?, requesterName?, requesterPhone?, executor?, dueDate? }`.
- `GET /api/tickets/:id` — the card payload (includes the house name for
  display — one joined read, no client-side stitching).
- `PATCH /api/tickets/:id` — partial update of any FR-TICKET-01 field;
  `dueDate: null` clears the date; absent fields stay untouched; `status`
  is not part of the DTO and is ignored if sent (transitions are S-05's
  endpoint). No `DELETE` route and no list route (FR-TICKET-04 / S-06).

Owner checks, both via the one-query idiom:

- ticket by id: `WHERE id = :id AND user_id = :sessionUserId` → zero rows =
  `TICKET_NOT_FOUND` (404), identical for foreign and missing.
- `houseId` on create and on update-with-houseId: resolve the house with
  `WHERE id = :houseId AND user_id = :sessionUserId` → zero rows =
  `TICKET_HOUSE_NOT_FOUND` (404). Alternative rejected: reusing
  `HOUSE_NOT_FOUND` — cross-module error reuse muddies which endpoint
  failed; codes are namespaced per module like S-02/S-03.

Error codes: `TICKET_TITLE_INVALID`, `TICKET_DESCRIPTION_INVALID`,
`TICKET_CATEGORY_INVALID`, `TICKET_PRIORITY_INVALID`,
`TICKET_REQUESTER_INVALID`, `TICKET_EXECUTOR_INVALID`,
`TICKET_DUE_DATE_INVALID`, `TICKET_HOUSE_INVALID` (400 — missing or
malformed `houseId` is a shape error per the spec, unlike a well-formed
but foreign/missing one) · `TICKET_HOUSE_NOT_FOUND`, `TICKET_NOT_FOUND`
(404).

### D3. FR-HOUSE-02 enforcement in houses.service

`deleteHouse` gains a ticket-count check before the delete: count tickets
by `house_id`; nonzero → `HouseError('HOUSE_HAS_TICKETS', …)` (409, code
reserved in S-03). The FK `Restrict` remains the race backstop: a ticket
created between the count and the delete makes Prisma throw P2003, which
the service maps to the same `HOUSE_HAS_TICKETS`. Rationale: the explicit
check gives the deterministic, testable path; the FK closes the TOCTOU
window without a transaction (BC-PRIN-01).

### D4. Web feature structure (ADR-0009)

```
web/src/app/features/tickets/
  tickets.routes.ts       # lazy; /tickets/new, /tickets/:id, /tickets/:id/edit (authGuard)
  tickets-api.ts          # HttpClient service, /api/tickets
  tickets-facade.ts       # signals: ticket, loading, error; create/load/update
  ticket-labels.ts        # single source of Ukrainian labels for the enums
  ticket-form-page/       # container: create + edit modes (route-driven)
  ticket-card-page/       # container: loads and shows one ticket
  ticket-card/            # presentational card (number, status chip, attributes)
```

- One form component serves create and edit (edit preloads via the facade);
  after a successful submit the user navigates to `/tickets/:id`. Full-page
  routes, not dialogs — the ticket form is too large for a dialog on mobile
  (mobile-first starts here), unlike the two-field house form.
- House select options come from the existing houses API through the
  facade; an empty directory renders the hint + link to «Будинки» (spec
  scenario) instead of a dead select.
- `ticket-labels.ts` maps enum keys → Ukrainian (categories §5.2,
  priorities §5.3, statuses §5.1) and is the only place the mapping lives;
  card and form both consume it.
- Home navigation gains «Нова заявка»; the houses screen already maps
  `HOUSE_HAS_TICKETS` — verify the message reads well now that it can
  actually trigger.

### D5. Due-date handling

Wire format `YYYY-MM-DD` (string) both ways; the API validates the shape
and stores `@db.Date`; the SPA uses the Material datepicker and converts
to/from the string at the api-service boundary. `PATCH` distinguishes
`undefined` (untouched) from `null` (clear) — the DTO normalizer only maps
fields present in the body. Alternative rejected: ISO datetime — invites
off-by-one dates across timezones for a value that is a calendar date.

### D6. Testing strategy

- **api unit:** tickets service — validation matrix (title/category/
  priority/dueDate), owner scoping, houseId check, status immutability via
  PATCH; houses service — delete refusal path (count > 0 and P2003 both →
  `HOUSE_HAS_TICKETS`).
- **api-e2e:** CRUD happy path (create → get → patch → get); defaults
  (`NORMAL`, `NEW`, number #N present); two-user isolation for tickets
  (GET/PATCH) and for `houseId` (create with A's house as B); due-date
  set/clear; FR-HOUSE-02: delete house with ticket → 409
  `HOUSE_HAS_TICKETS`, delete house without tickets still works; 401
  without cookie; DELETE /api/tickets/:id → 404/405.
- **web unit:** facade; form mapping (labels, date conversion, null-clear).
- **Playwright:** the three plan acceptance scenarios — create from UI →
  card with #N and «Нова»; edit executor + due date from the card; plus
  the house-with-ticket delete refusal on the houses screen.

## Risks / Trade-offs

- [Enum drift between Prisma keys and SPA labels] → `ticket-labels.ts` is
  the single mapping; api-e2e asserts wire values are the English keys, the
  Playwright specs assert Ukrainian labels render.
- [BigInt ids in JSON] → keep the established `Number(id)` serialization;
  safe at POC scale (S-03 risk note carried over).
- [Date off-by-one across timezones] → date-only wire format + `@db.Date`
  (D5); e2e asserts the stored date round-trips unchanged.
- [S-05 needs status transitions this slice deliberately blocks] → the
  PATCH DTO ignoring `status` is documented in the spec delta; S-05 adds a
  dedicated transition endpoint instead of loosening PATCH.

## Migration Plan

One additive Prisma migration: three enums + `ticket` table + FK to
`house` (`Restrict`) and `user` (`Cascade`). No changes to existing
tables; migrations run on start as before. Rollback = revert commits; the
table is unused by older code. The FK makes previously-deletable houses
with tickets undeletable — that is the intended FR-HOUSE-02 behavior, not
a regression.

## Open Questions

- None blocking. Exact card layout and form field order are implementation
  details within ADR-0009 and the mobile-first requirement.
