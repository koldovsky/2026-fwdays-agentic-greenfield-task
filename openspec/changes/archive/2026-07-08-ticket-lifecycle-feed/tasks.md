# Tasks: ticket-lifecycle-feed (S-05)

## 1. Data layer

- [x] 1.1 Add `TicketFeedItemType` / `TicketEventField` enums and the `TicketFeedItem` model to `api/prisma/schema.prisma` per design D1 (BigInt id, `ticket_id` FK Cascade, `author_id` FK Cascade, type discriminator, nullable `text` for notes, nullable `field`/`old_value`/`new_value` VarChar(255) for events, `created_at`, no `updatedAt` — append-only, `@@index([ticketId, id])`, `@@map("ticket_feed_item")`)
- [x] 1.2 Create the Prisma migration (two enums + `ticket_feed_item` table + FKs) and regenerate the client; migration applies cleanly on the local MySQL

## 2. API — transitions

- [x] 2.1 Add `ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]>` const to the tickets service — the single source of the PRD §5.1 table (terminal `CLOSED`/`REJECTED` → empty arrays); add error codes `TICKET_TRANSITION_FORBIDDEN` (409), `TICKET_STATUS_INVALID` (400) to `ticket-errors.ts`
- [x] 2.2 Implement `POST /api/tickets/:id/transition` (body `{ to }`) per design D3: validate `to` is a real status (400) → owner-scoped read (404 parity) → table check (409) → inside one Prisma transaction: status-guarded `updateMany` (`id AND user_id AND status = current`; count 0 → same 409, stale-request guard) + STATUS feed event insert (old → new, author = session user)
- [x] 2.3 Extend the `GET /api/tickets/:id` card payload with `allowedTransitions: TicketStatus[]` computed from the same const (empty for terminal statuses)
- [x] 2.4 API unit tests: every §5.1-legal move succeeds and writes the event; representative illegal set (terminal escapes, `Нова → Виконана` skip, self-transition) → 409 with no event; stale-guard branch (updateMany count 0) → 409; invalid `to` → 400; foreign/missing ticket → 404 parity; `allowedTransitions` per status

## 3. API — feed and field-change events

- [x] 3.1 Implement `GET /api/tickets/:id/feed`: owner-scoped (404 parity), full feed ordered by id, `Number(id)` serialization, items expose `type`, author, `createdAt`, and `text` (notes) or `field/oldValue/newValue` (events)
- [x] 3.2 Implement `POST /api/tickets/:id/notes` (body `{ text }`): owner-scoped (404 parity); trimmed non-empty text ≤ sanity cap → else `TICKET_NOTE_INVALID` (400); stores author + timestamp; no update/delete routes for feed items (append-only, FR-FEED-01)
- [x] 3.3 Extend `updateTicket` per design D4: diff the five tracked fields (house, category, priority, executor, dueDate) against the loaded row, skip same-value writes, insert one EVENT per changed field in the same transaction as the UPDATE; values serialized locale-free (enum keys, `YYYY-MM-DD`/empty for dueDate, house **name snapshots** — old and new names read in the transaction); untracked fields (title, description, requester) produce no events; status untouched (attribute change keeps status, PRD §5.1)
- [x] 3.4 API unit tests: note validation (empty/whitespace → 400, trim); feed ordering and owner scoping; updateTicket event diff — changed field → event with old/new, same-value write → no event, untracked field → no event, dueDate set/clear both produce events, house change snapshots both names, multi-field PATCH → one event per field

## 4. Web — card actions, feed, note form (ADR-0009, /web-conventions, mobile-first)

- [x] 4.1 Extend `tickets-api.ts` (`transition(id, to)`, `getFeed(id)`, `addNote(id, text)`) and `tickets-facade.ts` (feed signal + loading/error, `allowedTransitions` from the card payload, `transition`/`addNote` actions that reload ticket + feed per design D5; keep the S-04 `reset()` discipline so a previous ticket's feed never flashes)
- [x] 4.2 Extend `ticket-labels.ts`: §5.1 transition action labels («взято в роботу», «не виконуємо», «роботу завершено», «повторне відкриття», «підтверджено й закрито») and Ukrainian event-sentence composition from `field/oldValue/newValue` (enum keys → labels, dates, empty-value wording)
- [x] 4.3 Presentational `ticket-actions`: buttons rendered only from server-provided `allowedTransitions` with action labels; terminal status → no buttons; pending state while a transition runs; styles with `var(--mat-sys-*)` tokens only (В-04)
- [x] 4.4 Presentational `ticket-feed` + `ticket-note-form`: chronological list with notes and system events visually distinct (each with author and date-time); note input with Ukrainian empty-note validation hint, submit disabled while pending
- [x] 4.5 Wire the three components into `ticket-card-page` (container loads ticket + feed; transition/note actions update card and feed without manual reload); map the new `TICKET_*` error codes to Ukrainian snackbar copy
- [x] 4.6 Web unit tests: facade (feed load, transition/addNote reload, reset); ticket-actions (buttons from allowedTransitions, empty for terminal); ticket-feed kind-dependent rendering; labels/event-sentence mapping

## 5. Slice-level verification (DoD order)

- [x] 5.1 All task checkboxes above are `[x]`
- [x] 5.2 `npm run verify` passes (format, lint, typecheck, design:check, fallow audit, openspec validate, tests, build) — runs as the pre-commit hook on every slice commit
- [x] 5.3 Smoke test on the real local MySQL with two users: full lifecycle `Нова → В роботі → Виконана → Закрита` with feed events after each step; reopen `Виконана → В роботі`; `Закрита → В роботі` → 409 and no feed growth; PATCH executor+dueDate → two events, no-op PATCH → none; note append + empty-note 400; foreign ticket transition/feed/note → 404 parity
- [x] 5.4 api-e2e suite: lifecycle pass with feed assertions (author, from → to), forbidden transitions (terminal escape + skip) → 409, reopen path, stale/status-guard behavior, field-change events (incl. due-date set/clear and house name snapshot), no-op PATCH, note happy path + validation, feed append-only (no update/delete routes), two-user isolation for all three endpoints, 401 without cookie
- [x] 5.5 Playwright e2e (web-e2e), from the plan acceptance scenarios: full lifecycle via card buttons with system events appearing in the feed (хто/коли/звідки/куди); reopen from `Виконана`; terminal card shows no transition buttons; edit executor/термін → system events visible in the feed; add a note from the card
- [x] 5.6 Adversarial review by `slice-reviewer` (ADR-0010): freeze the range at an explicit end SHA (never `..HEAD`), no commits until the verdict; critical/high fixed + re-verify, medium/low dispositions recorded for the retro; validate any suggested fix against the slice's tests before adopting (S-04 precedent)
- [x] 5.7 Launch-and-look: walk the slice happy path by eye (card → взято в роботу → … → Закрита with the feed updating; note add; mobile viewport 390×844 pass) and note the fact in current-state
- [x] 5.8 Archive the change (`/opsx:archive`), confirm `npx openspec list` is empty, then `npx prettier --write openspec/specs/**/*.md` (the CLI writes synced specs unformatted)
- [x] 5.9 Update `docs/current-state.md` (phase/done/next/blockers) and `docs/traceability-matrix.md` (FR-STATUS-01…03, FR-FEED-01/02, FR-TICKET-03, FR-DUE-01 rows → spec/test/demo; FR-ACCESS-01 gains the feed/transition isolation tests)
- [x] 5.10 Session retrospective via `/slice-retro` → `docs/cycles/S-05.md` — immediately after the archive commit
