# Proposal: ticket-lifecycle-feed (S-05)

## Why

S-04 delivered the core `ticket` entity, but every ticket is stuck in status
`Нова` and carries no history: the 5-status lifecycle (PRD §5.1) and the
single append-only feed (PRD §5.5) do not exist yet. Slice **S-05 «Життєвий
цикл і стрічка» (Е-4)** from `docs/mvp-capability-plan.md` closes this: the
ticket becomes a living object the user can move through its lifecycle,
with the full story — status changes, field changes, user notes — visible
in one chronological feed. FR-TICKET-03 was deliberately deferred from
S-04 to this slice because system events need the feed to land in.

## What Changes

- **Status transitions** (FR-STATUS-01…03): a dedicated transition API
  endpoint validates every request against the PRD §5.1 transition table —
  forbidden transitions answer with an error; `Закрита`/`Відхилена` are
  terminal. `PATCH /api/tickets/:id` keeps ignoring `status` (S-04 design
  D2 — the transition endpoint is added, PATCH is NOT loosened).
- **Ticket feed** (FR-FEED-01/02): new append-only `ticket_feed_item`
  table; user-written text notes and automatic system events live in the
  same chronological feed; no editing or deleting of feed items.
- **System events** (FR-STATUS-03, FR-TICKET-03): every status change
  (who, when, from → to) and every change of house, category, priority,
  executor or due date via PATCH is recorded automatically as a system
  event.
- **FR-DUE-01 completed**: due-date set/change/clear (already supported in
  S-04) now leaves a system-event trace.
- **UI in the ticket card** (mobile-first): action buttons for exactly the
  transitions allowed from the current status; the feed rendered under the
  card with notes and system events visually distinct; a note input field.

## Capabilities

### New Capabilities

- `ticket-lifecycle`: the 5-status lifecycle — allowed transitions per PRD
  §5.1 enforced at API and UI level, terminal statuses, status-change
  system events (FR-STATUS-01/02/03).
- `ticket-feed`: the single append-only chronological feed per ticket —
  user notes, automatic system events for field changes (FR-TICKET-03) and
  status changes, visual distinction in the UI (FR-FEED-01/02).

### Modified Capabilities

_None._ `ticket-crud` requirements stay intact: status immutability via
create/PATCH is unchanged (transitions get their own endpoint), and the
system-event side effect of PATCH is specified as a `ticket-feed`
requirement, not a change to the editing contract.

## Impact

- **DB**: one additive Prisma migration — `ticket_feed_item` table (FK to
  `ticket`, type discriminator note/system-event, payload).
- **API**: `tickets` module gains the transition endpoint, feed read
  endpoint and note-append endpoint; `updateTicket` gains system-event
  recording; new `TICKET_*` error codes for forbidden transitions and
  invalid notes (locale-free `{ code, message }`, S-02 D6 contract).
- **Web**: `features/tickets` gains transition buttons, feed display and
  note form in the ticket-card flow (ADR-0009 container/presentational,
  signals facade; Ukrainian labels only in the SPA).
- **Tests**: api unit (transition table matrix, event recording), api-e2e
  (full lifecycle pass, forbidden-transition errors, feed append-only,
  isolation), web unit (facade/presentational), Playwright for the plan's
  acceptance scenarios.
- **Docs after archive**: `docs/current-state.md`,
  `docs/traceability-matrix.md` rows for FR-STATUS-01…03, FR-FEED-01/02,
  FR-TICKET-03, FR-DUE-01.
