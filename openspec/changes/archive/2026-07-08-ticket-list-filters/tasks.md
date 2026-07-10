## 1. DB — indexes (design D6)

- [x] 1.1 Prisma schema: add `@@index([userId, status])` and `@@index([userId, houseId])` to `Ticket`, drop the redundant `@@index([userId])`; generate the migration and check the SQL keeps the FK satisfied (design D6)

## 2. API — list endpoint

- [x] 2.1 Query parsing/validation in the tickets module: `status` (comma list of statuses or `ACTIVE` preset), `houseId`, `category`, `priority`, `q`, `sort`/`order`, `page`/`pageSize` (default 20, max 100); invalid values → 400 `TICKET_QUERY_INVALID` in `ticket-errors.ts` (design D1/D2/D7)
- [x] 2.2 Shared `ACTIVE_STATUSES` constant + `isOverdue` computation (due date set, before "today" in Europe/Kyiv, status active — §5.4); extend `toTicketDto` with `isOverdue` so the card reuses it (design D2/D3)
- [x] 2.3 Service `list(userId, query)`: owner-scoped `where` with AND-combined filters, LIKE `contains` OR over title/description/requesterName/requesterPhone/executor, orderBy with `nulls: 'last'` for due date and `id desc` tie-break, `skip/take` + `count` in one place; controller `GET /tickets` returning `{ items, total, page, pageSize }` with slim `TicketListItemDto` (design D1/D4/D5)
- [x] 2.4 API unit tests: filter combinations incl. `ACTIVE` expansion, search fields and case-insensitivity, sort defaults and nulls-last, paging bounds, `isOverdue` truth table (active/terminal × past/today/none), 400 on bad query, owner isolation

## 3. Web — list screen (read /web-conventions first)

- [x] 3.1 Facade/API layer: `TicketListItem` + page envelope model, `list(query)` in `tickets-api.ts`, facade list state (items accumulation for load-more, total, loading/error) driven by URL query params (design D8)
- [x] 3.2 `TicketListPage` container at the `tickets` index route (`/tickets`): reads/writes URL query params, debounced search input; home nav gains «Заявки» link; «Нова заявка» action on the list screen (design D8)
- [x] 3.3 Presentational `ticket-filters` (status chips with «активні» preset, house/category/priority selects, search, sort switch) and `ticket-list` (FR-LIST-01 columns, rows link to the card, overdue highlight via `--mat-sys-error*` tokens, «Показати ще», Ukrainian empty state) — mobile-first (design D8)
- [x] 3.4 Card overdue highlight from the DTO `isOverdue` flag (ticket-crud delta, FR-DUE-02)
- [x] 3.5 Web unit tests: facade query-param→request mapping and load-more accumulation, filters/list components (overdue row styling, empty state), card highlight

## 4. E2E and closing the slice

- [x] 4.1 api-e2e: list happy path, `ACTIVE`+house combination, search by requester surname, pagination page 2, overdue flags, foreign-user isolation, 400 on bad query
- [x] 4.2 Playwright (web-e2e) from the S-06 acceptance scenarios: combined filters «активні»+будинок, overdue row highlighted while closed twin is not, search finds by requester, load-more, filtered URL reload
- [x] 4.3 All checkboxes above `[x]`, then `npm run verify` passes
- [x] 4.4 Smoke test on real MySQL: seed tickets across statuses/houses/due dates, exercise filters/search/sort/paging, check invariants and NFR-PERF-01 headroom
- [x] 4.5 Adversarial review by `slice-reviewer` (ADR-0010): freeze range at an explicit end SHA, no commits until the verdict; fix critical/high + re-verify, log medium/low dispositions
- [x] 4.6 Launch-and-look: walk the S-06 happy path by eye (mobile viewport), note the fact in current-state
- [x] 4.7 Archive: `npx openspec validate ticket-list-filters --strict` → `/opsx:archive` → `npx openspec list` empty → `npx prettier --write openspec/specs/**/*.md`
- [x] 4.8 Update `docs/current-state.md` and `docs/traceability-matrix.md` (FR-LIST-01…04, FR-DUE-02, NFR-PERF-01, NFR-COMPAT-01 → spec → tests → demo check)
- [x] 4.9 Session retro via `/slice-retro` → `docs/cycles/S-06.md`
