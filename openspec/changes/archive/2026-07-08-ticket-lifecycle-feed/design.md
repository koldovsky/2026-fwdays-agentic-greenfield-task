# Design: ticket-lifecycle-feed (S-05)

## Context

S-04 landed the `ticket` entity with the S-03 idioms (one-query owner
check, locale-free `TicketError` codes, signals-facade SPA feature per
ADR-0009) and deliberately blocked `status` in create/PATCH — the S-04
design D2/Risks explicitly defer transitions to a dedicated S-05
endpoint. The `TicketStatus` enum already exists in Prisma. This slice
adds the lifecycle (PRD §5.1) and the single append-only feed (PRD §5.5)
on top, without touching the `ticket-crud` contract. Constraints:
BC-PRIN-01 (notebook-simple), ADR-0001/0002 stack, ADR-0009 web
conventions, Material tokens only (В-04), mobile-first (TC-UI-01),
S-02 D6 locale-free API error contract.

## Goals / Non-Goals

**Goals:**

- `ticket_feed_item` table + migration; append-only notes and system
  events in one chronological feed.
- Transition endpoint validating the PRD §5.1 table server-side; status
  stays immutable through create/PATCH.
- System events for status changes (FR-STATUS-03) and for tracked field
  changes through PATCH (FR-TICKET-03, FR-DUE-01).
- Card UI: transition buttons for exactly the allowed moves, feed with
  visually distinct notes/events, note input.

**Non-Goals:**

- Notifications, auto-transitions, SLA — plan Non-goals.
- Editing/deleting feed items — append-only by requirement.
- Attachment events (FR-FEED-02 mentions them) — arrive with
  attachments in S-07; the event mechanism built here is what S-07 plugs
  into.
- Ticket list/filters (S-06).

## Decisions

### D1. Data model — one table for both feed kinds

```prisma
enum TicketFeedItemType {
  NOTE  // user text note
  EVENT // system event
}

enum TicketEventField {
  STATUS
  HOUSE
  CATEGORY
  PRIORITY
  EXECUTOR
  DUE_DATE
}

model TicketFeedItem {
  id        BigInt              @id @default(autoincrement())
  ticketId  BigInt              @map("ticket_id")
  ticket    Ticket              @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  BigInt              @map("author_id")
  author    User                @relation(fields: [authorId], references: [id], onDelete: Cascade)
  type      TicketFeedItemType
  text      String?             @db.Text // NOTE only
  field     TicketEventField?   // EVENT only
  oldValue  String?             @map("old_value") @db.VarChar(255)
  newValue  String?             @map("new_value") @db.VarChar(255)
  createdAt DateTime            @default(now()) @map("created_at")

  @@index([ticketId, id])
  @@map("ticket_feed_item")
}
```

- **One table, type discriminator** — PRD §5.5 is explicit that this is
  a single feed; one table gives chronological ordering for free (`ORDER
BY id` — auto-increment is the tiebreaker for same-timestamp items).
  Alternative rejected: separate `note` + `event` tables need a UNION
  with heterogeneous columns for every read — complexity with no payoff
  (BC-PRIN-01).
- **Structured event columns, not free text** — events store
  `field/oldValue/newValue` as locale-free data (enum keys, `YYYY-MM-DD`
  dates, plain-text executor, house **name snapshot**); the SPA composes
  the Ukrainian sentence. Free-text event messages would bake locale
  into the DB and violate the S-02 D6 principle. House events snapshot
  the _name_, not the id: history must show what the house was called at
  the time of the change, and a name lookup on render would rewrite
  history after a rename.
- `authorId` is stored even though the personal workspace makes it
  always the owner today (FR-FEED-01 requires an author per item; the
  column keeps the data model honest and future-proof).
- No `updatedAt` — items are immutable by requirement (append-only).

### D2. API shape

Three additions to the `tickets` module, S-03/S-04 idioms throughout
(owner check via one query, `TicketError` `{ code, message }`,
`Number(id)` serialization):

- `POST /api/tickets/:id/transition` — body `{ to: TicketStatus }`.
  Validates `to` is a §5.1-legal move from the current status, applies
  it and records the STATUS event **in one transaction** (D3).
- `GET /api/tickets/:id/feed` — full chronological feed (notes +
  events). No pagination at POC scale (BC-PRIN-01); S-06 adds list
  machinery where the data volume actually lives. Alternative rejected:
  embedding the feed in `GET /tickets/:id` — the card needs independent
  feed refresh after transitions/notes without re-fetching the ticket.
- `POST /api/tickets/:id/notes` — body `{ text }`; trimmed non-empty
  text required.

`GET /api/tickets/:id` (existing) additionally returns
`allowedTransitions: TicketStatus[]` computed server-side from the
transition table. The SPA renders buttons from this list and never owns
transition rules — no duplicated table to drift (FR-STATUS-02 is
enforced in exactly one place; the UI merely reflects it). Alternative
rejected: a copy of the table in `web/` — two sources of truth for a
normative table.

New error codes: `TICKET_TRANSITION_FORBIDDEN` (409 — legal `to` value,
illegal move from the current status), `TICKET_STATUS_INVALID` (400 —
not a status at all), `TICKET_NOTE_INVALID` (400). Foreign/missing
ticket stays `TICKET_NOT_FOUND` (404) for all three endpoints.

### D3. Transition atomicity and the stale-request guard

The transition table is one const in the tickets service:
`ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]>`.

Flow inside a Prisma interactive transaction:

1. Read the ticket `WHERE id AND user_id` → zero rows = 404.
2. Check `to ∈ ALLOWED_TRANSITIONS[current]` → else 409.
3. `updateMany WHERE id AND user_id AND status = current` (the read
   status as a guard) → `count === 0` means a concurrent transition won
   the race → same 409 (`TICKET_TRANSITION_FORBIDDEN`), not a blind
   overwrite. This is the spec's "stale request is rejected".
4. Insert the STATUS feed event (old = `current`, new = `to`).

The transaction makes step 3+4 atomic — a status change without its
event (or vice versa) can never be observed (FR-STATUS-03). S-04 avoided
transactions for the FR-HOUSE-02 check; here two _writes_ must land
together, which is exactly what transactions are for — the deterministic
alternative (write status, hope the event insert succeeds) can lose
history.

### D4. Field-change events in updateTicket

`updateTicket` already loads the current ticket for the owner check; the
service diffs the tracked fields (house, category, priority, executor,
dueDate) of the applied patch against the loaded row, skipping same-value
writes, and inserts one EVENT per actually-changed field in the same
transaction as the UPDATE. Untracked fields (title, description,
requester) produce no events — FR-TICKET-03 lists exactly the tracked
five. Value serialization for events: enum keys as-is, dueDate as
`YYYY-MM-DD` or `null`→empty, executor plain text, house as the _new_
house's name snapshot (old = previous house's name — read in the same
transaction). A house change re-validates the new `houseId` ownership
exactly as today.

### D5. Web feature structure (ADR-0009, extends `features/tickets`)

```
web/src/app/features/tickets/
  tickets-api.ts          # + transition(), getFeed(), addNote()
  tickets-facade.ts       # + feed signal, allowedTransitions passthrough,
                          #   transition/addNote actions (reload ticket+feed)
  ticket-labels.ts        # + transition action labels, event sentence parts
  ticket-card-page/       # container: now also loads the feed
  ticket-card/            # presentational (unchanged card data)
  ticket-actions/         # presentational: buttons from allowedTransitions
  ticket-feed/            # presentational: chronological list, two visual kinds
  ticket-note-form/       # presentational: note input + submit
```

- Transition buttons render from the server-provided
  `allowedTransitions`, labeled via `ticket-labels.ts` with the §5.1
  action names («взято в роботу», «не виконуємо», «роботу завершено»,
  «повторне відкриття», «підтверджено й закрито»). Terminal statuses
  yield an empty list → no buttons, nothing hidden client-side.
- Event rendering composes Ukrainian sentences from `field/old/new` in
  the SPA (D1); notes and events get distinct visual treatment (icon +
  muted style for events vs. speech-bubble style for notes — exact
  styling within Material tokens, В-04).
- After a transition or note the facade reloads ticket + feed (two known
  GETs, no optimistic state) — S-04's review found stale-facade bugs;
  reload-on-mutation is the simple correct default (BC-PRIN-01).
- S-04 precedent: watch the facade `reset()` on route entry so a
  previously viewed ticket's feed doesn't flash on another card.

### D6. Testing strategy

- **api unit:** transition matrix — every §5.1-legal move succeeds,
  a representative illegal set (terminal escapes, skips, self-loops) →
  409; stale-guard branch (updateMany count 0) → 409; note validation;
  updateTicket event diff (changed / same-value / untracked / due-date
  set-clear / house name snapshot).
- **api-e2e:** full lifecycle pass with feed assertions after each step
  (author, from → to); `Закрита → В роботі` → 409 without feed growth;
  reopen path `Виконана → В роботі`; PATCH executor+dueDate → two
  events; no-op PATCH → no events; note append + empty note 400; feed
  isolation and transition isolation between two users (404-parity);
  attribute change keeps status.
- **web unit:** facade (feed load, transition/addNote reload, reset);
  ticket-actions (buttons from allowedTransitions, empty for terminal);
  ticket-feed (kind-dependent rendering); labels mapping.
- **Playwright:** the four plan acceptance scenarios — full lifecycle
  via card buttons with feed checks; reopen from `Виконана`; forbidden
  transition impossible via UI (no button) and card unchanged; edit
  executor/due → system events visible; plus note add happy path.

## Risks / Trade-offs

- [Feed grows unbounded, no pagination] → POC scale (BC-PRIN-01); the
  single-ticket feed is human-sized by nature; S-06 owns list-scale
  machinery. Revisit only if real usage disproves this.
- [Event value snapshots denormalize (house name)] → intentional: feed
  is history, not a view of current state; 255-char cap matches the
  house name cap.
- [Two clients transition simultaneously] → status-guarded `updateMany`
  inside the transaction (D3) makes one lose deterministically with 409.
- [SPA composes event sentences — wire format is a mini-contract] →
  covered by api-e2e asserting the `field/old/new` shape and web units
  asserting the rendering; enum keys already stable per S-04 D1.
- [allowedTransitions in the card payload couples card GET to lifecycle
  logic] → acceptable: one computed array from the same const the
  endpoint enforces; keeps the SPA rule-free.

## Migration Plan

One additive Prisma migration: two enums + `ticket_feed_item` with FKs
to `ticket` (Cascade) and `user` (Cascade). No changes to existing
tables. Migrations run on start as before; rollback = revert commits,
the table is unused by older code.

## Open Questions

- None blocking. Exact feed visual design is an implementation detail
  within ADR-0009 / Material tokens; event sentence wording is SPA copy,
  adjustable without API changes.
