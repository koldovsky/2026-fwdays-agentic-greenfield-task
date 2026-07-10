# Tasks: ticket-crud (S-04)

## 1. Data layer

- [x] 1.1 Add `TicketCategory` / `TicketPriority` / `TicketStatus` enums and the `Ticket` model to `api/prisma/schema.prisma` per design D1 (BigInt id = number #N, `user_id` FK cascade, `house_id` FK **Restrict**, title VarChar(255), description Text nullable, `priority @default(NORMAL)`, `status @default(NEW)`, requester name/phone + executor nullable, `due_date @db.Date` nullable, timestamps, `@@index([userId])`, `@@map("ticket")`)
- [x] 1.2 Create the Prisma migration (enums + `ticket` table + FKs) and regenerate the client; migration applies cleanly on the local MySQL

## 2. API — tickets create/get/update with owner isolation

- [x] 2.1 Scaffold `api/src/app/tickets/` module (controller, service, `ticket-errors.ts`) wired into `AppModule`; no `@Public()` — behind the global `SessionGuard`
- [x] 2.2 Service-side validation per design D2: title required/trimmed/≤255, description ≤ Text sanity cap, category/priority must be valid enum keys, requester name ≤255 / phone ≤32, executor ≤255, dueDate must be `YYYY-MM-DD` — 400-style `TicketError` codes, locale-free `{ code, message }`
- [x] 2.3 Implement `POST /api/tickets`: resolve `houseId` with the one-query owner check (`id AND user_id`) → `TICKET_HOUSE_NOT_FOUND` (404) for foreign/missing; create with defaults `NORMAL`/`NEW`; response serializes ids via `Number(id)` and includes the house name
- [x] 2.4 Implement `GET /api/tickets/:id` and `PATCH /api/tickets/:id` with the single-query owner check → `TICKET_NOT_FOUND` (404), identical body for missing and foreign (FR-ACCESS-01, NFR-SEC-03); PATCH updates only fields present in the body, `dueDate: null` clears the date, `status` is not read from the body; re-check `houseId` ownership when it changes; no DELETE and no list route (FR-TICKET-04)
- [x] 2.5 FR-HOUSE-02 in `houses.service.deleteHouse` per design D3: ticket count check → `HOUSE_HAS_TICKETS` (409) + map Prisma P2003 from the FK backstop to the same error
- [x] 2.6 API unit tests: tickets validation matrix, owner scoping (ticket + houseId), status immutability via PATCH, dueDate set/clear; houses delete refusal (count path and P2003 path)

## 3. Web — ticket form and card (ADR-0009, /web-conventions, mobile-first)

- [x] 3.1 Scaffold `web/src/app/features/tickets/` per design D4 (layout per /web-conventions): lazy `tickets.routes.ts` under `authGuard` (`/tickets/new`, `/tickets/:id`, `/tickets/:id/edit`), `tickets-api.ts` (HttpClient, date↔string conversion at the boundary), `tickets-facade.ts` (signals: ticket/loading/pending/error + create/load/update), `ticket-labels.ts` (single source of Ukrainian labels for the three enums)
- [x] 3.2 Ticket form page (container, create + edit modes route-driven): house select fed from the houses API, category/priority selects from `ticket-labels.ts`, Material datepicker for the due date (clearable), text inputs for the rest; Ukrainian validation messages; empty house directory → hint linking to «Будинки» instead of a dead select; styles with `var(--mat-sys-*)` tokens only (В-04)
- [x] 3.3 Ticket card page (container) + presentational card: number #N, status chip, all FR-TICKET-01 attributes with Ukrainian labels, edit action → form; no transition/feed/attachment UI
- [x] 3.4 After successful create/edit navigate to `/tickets/:id`; API errors surfaced via snackbar in Ukrainian (map the new `TICKET_*` codes); verify the houses screen message for `HOUSE_HAS_TICKETS` reads well now that it can trigger
- [x] 3.5 Add «Нова заявка» navigation entry on the home screen and register the `/tickets` routes in `app.routes.ts`
- [x] 3.6 Web unit tests: tickets facade (create/load/update, error state), date conversion and null-clear mapping in the api service

## 4. Slice-level verification (DoD order)

- [x] 4.1 All task checkboxes above are `[x]`
- [x] 4.2 `npm run verify` passes (format, lint, typecheck, design:check, fallow audit, openspec validate, tests, build) — runs as the pre-commit hook on every slice commit
- [x] 4.3 Smoke test on the real local MySQL: create/edit a ticket via the running API with two users — defaults (`NEW`/`NORMAL`), number #N, 404 parity for foreign ticket and foreign houseId, due-date set/clear round-trip, house-with-ticket delete → 409, house-without-tickets delete still works
- [x] 4.4 api-e2e suite: CRUD happy path, defaults + #N, two-user isolation (GET/PATCH foreign ticket; create with a foreign houseId), dueDate set/clear, status ignored on PATCH, FR-HOUSE-02 refusal (409) and successful delete without tickets, 401 without cookie, DELETE /api/tickets/:id not exposed
- [x] 4.5 Playwright e2e (web-e2e), from the plan acceptance scenarios: create ticket from UI (house from directory) → card with #N and «Нова»; edit executor + due date from the card → card updated; houses screen refuses deleting the house with the ticket
- [x] 4.6 Adversarial review by `slice-reviewer` (ADR-0010): freeze the range at an explicit end SHA (never `..HEAD`), no commits until the verdict; critical/high fixed + re-verify, medium/low dispositions recorded for the retro
- [x] 4.7 Launch-and-look: walk the slice happy path by eye (home → «Нова заявка» → create → card → edit → card; empty-directory hint; mobile viewport pass) and note the fact in current-state
- [x] 4.8 Archive the change (`/opsx:archive`), confirm `npx openspec list` is empty, then `npx prettier --write openspec/specs/**/*.md` (the CLI writes synced specs unformatted)
- [x] 4.9 Update `docs/current-state.md` (phase/done/next/blockers) and `docs/traceability-matrix.md` (FR-TICKET-01/02/04 rows; FR-HOUSE-02 test column flips from "S-04" to the actual test; FR-ACCESS-01 gains the tickets isolation test)
- [x] 4.10 Session retrospective via `/slice-retro` → `docs/cycles/S-04.md` — immediately after the archive commit
