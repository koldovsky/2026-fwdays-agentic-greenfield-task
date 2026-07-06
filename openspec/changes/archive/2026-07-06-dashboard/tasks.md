## 1. Dependencies and database schema

- [x] 1.1 Confirm `better-sqlite3` row access for `leads`/`requests`/`bookings`
      is already available via `@kamerton/db` (it is, per S1/S2) — this slice
      is **read-only** against the existing schema plus one new write path
      (delete-lead cascade, already a schema fact via `ON DELETE CASCADE` on
      `requests.lead_id`, `packages/db/src/schema.ts`). No new tables, no
      migration task.
- [x] 1.2 Add a `deleteLeadCascade(db, leadId)` helper to
      `packages/db/src/leads.ts` (mirrors `insertLead`/`findLeadByTelegramUserId`'s
      style): deletes the `leads` row (cascade removes its `requests`/
      `bookings` rows per the schema's `ON DELETE CASCADE`/existing FKs) and
      returns the ids of any `bookings` rows that were `pending` with a
      non-null `calendar_event_id` **before** the delete, so the caller can
      delete their tentative calendar events (`@trace NFR-PRIV-02`). Write
      `packages/db/src/leads.test.ts` additions FIRST (red: seed a lead with
      a `pending` booking + a `confirmed` booking + a sibling `requests` row;
      assert all rows gone after the call, and the returned pending-booking
      list contains exactly the one seeded `pending` row's event id). Confirm
      red, then implement to green.
- [x] 1.3 Confirm/add root `devDependencies`: `@playwright/test` and
      `@axe-core/playwright` (both already resolve via `package-lock.json`
      but are not declared in `package.json` — declare them explicitly so
      `npm ci` on a clean checkout installs them, needed by
      `scripts/check-a11y.mjs` and `npm run test:e2e`).
- [x] 1.4 Add `apps/dashboard` dependencies DESIGN.md requires that are not
      yet installed: `lucide-react` (icons, `Icon` component) and the
      self-hosted Golos Text + JetBrains Mono font files under
      `apps/dashboard/public/fonts/` (or via `next/font/local`) — confirm via
      `ctx7` against the installed Next.js 16 docs for the current
      `next/font/local` API shape before wiring `app/layout.tsx` (AGENTS.md:
      "verify against ctx7 before writing integration code").
- [x] 1.5 Confirm `apps/dashboard/package.json`'s `dev`/`start` scripts
      already bind to `127.0.0.1` (they do) — add a one-line assertion in the
      E2E setup (section 8) that the server is unreachable on `0.0.0.0`/the
      machine's LAN address, not just reachable on loopback (NFR-LOCAL-01).

## 2. Domain logic (`lib/src/dashboard/`) — write failing unit tests FIRST (red)

- [x] 2.1 `lib/src/dashboard/hall-status.test.ts`: `hallSeatStatus([])` is
      `"free"`; a seat with only a `cancelled` or only a `declined` booking is
      `"cancelled"` (never reverts to free); a seat with both `cancelled` and
      `pending` bookings is `"pending"`; a seat with `pending` and `confirmed`
      is `"confirmed"` — the full precedence table `confirmed` > `pending` >
      `cancelled`/`declined` > free (`@trace FR-DASH-03`). Confirm red.
- [x] 2.2 `lib/src/dashboard/week-grid.test.ts`: `weekSeatGrid(weekStartIso)`
      returns exactly 5 rows (Mon–Fri) × 10 seats (10:00 through 19:00
      hourly starts) for a known week; Saturday/Sunday are never present
      regardless of the input `weekStartIso`'s own weekday (`@trace
      FR-DASH-03`, `@trace BC-SCHEDULE-01`). Confirm red.
- [x] 2.3 `lib/src/dashboard/json-patch.test.ts`: `applyJsonPatch` correctly
      applies `add`/`remove`/`replace` at known paths; a `replace`/`add`/
      `remove` targeting a path not present in the state model's known field
      set is discarded (state unchanged for that op, valid ops in the same
      batch still applied); a `test` op that fails discards only that op,
      never throws (`@trace TC-PROTO-01`, baseline spec's "delta patching a
      nonexistent field is discarded" scenario). Confirm red.
- [x] 2.4 Run `npm run test:run` and confirm 2.1–2.3 fail (red) before
      writing any implementation.

## 3. Domain logic — implement to green

- [x] 3.1 Implement `lib/src/dashboard/hall-status.ts` (`hallSeatStatus`) to
      pass 2.1.
- [x] 3.2 Implement `lib/src/dashboard/week-grid.ts` (`weekSeatGrid`,
      `SeatCoordinate`) to pass 2.2.
- [x] 3.3 Implement `lib/src/dashboard/json-patch.ts` (`applyJsonPatch`,
      `JsonPatchOp`) to pass 2.3 — pure, no dependency on any JSON-Patch
      npm package (TC-PURE-01: keep `lib/` dependency-free where the op set
      is this small: `add`/`remove`/`replace`/`move`/`copy`/`test`).
- [x] 3.4 Export the new `dashboard/` modules from `lib/src/index.ts`.
- [x] 3.5 Run `npm run test:run` and confirm 2.1–2.3 are now green with no
      regressions in S1 `slots`/S2 `intake` suites.

## 4. Publisher seam — `packages/bot` (red → green, protects the archived S2 pipeline)

- [x] 4.1 Write `packages/bot/src/agui-publisher.ts` tests FIRST
      (`agui-publisher.test.ts`): the `AguiEvent` union type (`RUN_STARTED`,
      `RUN_FINISHED`, `RUN_ERROR`, `TEXT_MESSAGE_START/CONTENT/END`,
      `STATE_SNAPSHOT`, `STATE_DELTA`, `CUSTOM` with `name: "BOOKING_PENDING"`
      — the exact wire shapes design.md's AG-UI contract section pins,
      re-verified against `context7`'s `/ag-ui-protocol/ag-ui` docs before
      coding); `noopAguiPublisher.publish()` resolves without throwing and
      without any side effect (`@trace TC-PROTO-01`). Confirm red, implement
      to green.
- [x] 4.2 Write `packages/bot/src/testing/fake-agui-publisher.ts`: a
      `FakeAguiPublisher` recording every published event in order, for
      pipeline tests.
- [x] 4.3 Write `packages/bot/src/pipeline.test.ts` additions FIRST (red):
      - **Regression guard:** with `deps.publisher` set to
        `noopAguiPublisher` (or omitted, defaulting to it), every existing
        S2 `pipeline.test.ts` scenario still passes byte-for-byte — proves
        S2's committed behavior is unchanged when no dashboard is running
        (this is the single most important test in this section).
      - With a `FakeAguiPublisher` injected, a free-text turn publishes, in
        order: `RUN_STARTED` → `TEXT_MESSAGE_START` → one or more
        `TEXT_MESSAGE_CONTENT` (carrying the already-assembled final reply
        string — see design.md Decision 1's honesty note, NOT per-model-token)
        → `TEXT_MESSAGE_END` → a `STATE_DELTA` (or `STATE_SNAPSHOT` on the
        very first turn for a request) reflecting the fields `runIntakeTurn`
        persisted → `RUN_FINISHED` (`@trace FR-DASH-01`).
      - A button-callback turn publishes the same run-boundary + state-update
        events, WITH `TEXT_MESSAGE_*` wrapping its own deterministic reply
        text too (the callback branch still computes a real `replyText` and
        sends it to the lead, so the dashboard's ChatStream must render it —
        review-gate correction recorded in `pipeline.test.ts`'s own callback
        scenario comment): the actual distinction a callback turn draws is
        narrower than "no `TEXT_MESSAGE_*`" — it NEVER calls
        `ModelPort.send()` (design.md Decision 3 of the `intake` change),
        so there is simply no model call for any `TEXT_MESSAGE_*` content
        to be "about".
      - A `ModelPort.send()` rejection (the existing NFR-REL-01 apology path)
        still publishes `RUN_STARTED` → `RUN_ERROR` → `RUN_FINISHED` (never a
        silent gap in the run boundary the dashboard is watching).
      Confirm every new case red, then wire `pipeline.ts`'s `handleUpdate` to
      call `deps.publisher` at each of the above points (new optional
      `publisher?: AguiPublisher` field on `HandleUpdateDeps`, defaulting to
      `noopAguiPublisher`).
- [x] 4.4 Wire `packages/bot/src/index.ts` to construct a real HTTP-POSTing
      `AguiPublisher` (posts to `AGUI_INGEST_URL`, e.g.
      `http://127.0.0.1:3000/api/agui/ingest`, env-optional — absent env
      means `noopAguiPublisher`, never a crash) and pass it into
      `handleUpdateSafely`'s deps.
- [x] 4.5 Run `npm run test:run`; confirm 4.1–4.3 green with zero regressions
      in the S2 `intake` suites (the regression guard from 4.3 is the gate
      that matters most here).

## 5. Services — AG-UI ingest + SSE stream + delete-lead route (red → green)

- [x] 5.1 Write `apps/dashboard/lib/agui-hub.test.ts` FIRST (red): an
      in-memory pub/sub (`publish(event)`, `subscribe(onEvent) -> unsubscribe`)
      fans one published event out to all current subscribers, in order; a
      subscriber that unsubscribes stops receiving further events; publishing
      with zero subscribers does not throw. Confirm red, implement
      `apps/dashboard/lib/agui-hub.ts` to green.
- [x] 5.2 Write `apps/dashboard/lib/dashboard-state.test.ts` FIRST (red): a
      pure `buildStateSnapshot(rows)` function assembling a `DashboardState`
      (active-ish requests, the pending queue, the HallMap's week-of-bookings
      input) from raw `leads`/`requests`/`bookings` row arrays — no I/O
      itself, so it is testable with plain fixture arrays even though its
      caller (5.3) does the actual `better-sqlite3` read. Confirm red,
      implement to green.
- [x] 5.3 Write `apps/dashboard/app/api/agui/ingest/route.test.ts` FIRST
      (red, against a real Next route-handler test harness or an equivalent
      in-process call): `POST` with a well-formed AG-UI event body publishes
      it to the hub (assert via a subscribed test listener) and responds
      `200`; a malformed JSON body responds `400` without touching the hub
      (never a raw 500). Confirm red, implement
      `apps/dashboard/app/api/agui/ingest/route.ts` to green.
- [x] 5.4 Write `apps/dashboard/app/api/agui/stream/route.test.ts` FIRST
      (red): `GET` opens an SSE response whose FIRST frame is a
      `STATE_SNAPSHOT` built from the real (temp-file or `:memory:`, per
      Next's route-handler process constraints — document whichever this
      route actually requires) SQLite database via `dashboard-db.ts`
      (5.5), reflecting whatever `leads`/`requests`/`bookings` rows are
      seeded; subsequent hub-published events are forwarded verbatim in
      order; closing the client connection unsubscribes from the hub (no
      leak — assert `agui-hub`'s subscriber count drops). Confirm red,
      implement `apps/dashboard/app/api/agui/stream/route.ts` to green.
- [x] 5.5 Write `apps/dashboard/lib/dashboard-db.test.ts` FIRST (red, real
      SQLite via `openDatabase(":memory:")` + `@kamerton/db` row helpers to
      seed fixtures): `readDashboardSnapshot(db)` returns the rows
      `buildStateSnapshot` (5.2) needs — active requests, `pending` requests
      with their fields + compiled first-lesson brief
      (`compileFirstLessonBrief`, reused from `packages/bot/src/pipeline.ts`,
      not duplicated), and the current week's bookings for the HallMap.
      Confirm red, implement to green.
- [x] 5.6 Write `apps/dashboard/app/api/leads/[id]/route.test.ts` FIRST (red,
      real SQLite + a `FakeCalendarPort`): `DELETE` on a lead with a
      `pending` booking (tentative calendar event) cascades the DB delete
      (via 1.2's `deleteLeadCascade`) AND calls
      `calendar.deleteEvent(eventId)` for each returned pending-booking event
      id, then publishes a state-removal event to the hub so connected
      dashboards drop the lead without a reload; a second `DELETE` for an
      already-deleted lead id responds with a deterministic "not found"
      error, never a raw 500; a simulated `calendar.deleteEvent` rejection
      surfaces a deterministic inline-error-shaped JSON response (the DB
      delete may already have happened — document the ordering chosen and
      why, e.g. calendar-delete-before-DB-delete so a failure never leaves an
      orphaned tentative event) (`@trace NFR-PRIV-02`). Confirm red, implement
      `apps/dashboard/app/api/leads/[id]/route.ts` to green.
- [x] 5.7 Write `apps/dashboard/app/api/decisions/[requestId]/route.test.ts`
      FIRST (red): `POST` to the stub decision route responds with a
      deterministic, Ukrainian, non-500 "не підключено" payload (design.md
      Decision 4) — never a 404/500 a real user action could be confused
      with a bug. Confirm red, implement the stub to green.
- [x] 5.8 Run `npm run test:run`; confirm 5.1–5.7 green with no regressions
      (these dashboard route/db tests run under `test:run` — real
      `better-sqlite3` but plain `vitest run`, per `vitest.config.ts`'s own
      documented `include` shape; `npm run test:integration` re-bases onto
      `tests/integration/` and does not pick up any `apps/dashboard/**`
      test files at all).

## 6. UI — tokens, `components/ds/`, the SSE client, and pages

- [x] 6.1 Add `apps/dashboard/styles/tokens/` (colors, type, spacing, radius,
      motion per DESIGN.md's token table, including the four
      `--status-{pending,confirmed,declined,cancelled}-{bg,fg,solid}` role
      sets) and wire them into `app/globals.css`'s Tailwind 4 `@theme inline`
      bridge; add `data-theme="dark"` support on `<html>`. No requirement
      text to test here (design tokens are structurally verified in section
      8's axe/vision-verify gates, not a unit test).
- [x] 6.2 Write `apps/dashboard/lib/agui-client.test.ts` FIRST (red, jsdom or
      a fake `EventSource`): `safeParseAguiEvent` returns `null` (never
      throws) for non-JSON data and for a recognized-shape-but-unknown
      `type`; `applyAguiEvent(state, event)` reducer cases — `STATE_SNAPSHOT`
      replaces wholesale; `STATE_DELTA` routes through `applyJsonPatch`
      (lib/, section 3); `TEXT_MESSAGE_START/CONTENT/END` append to the right
      `threadId`'s stream and never bleed into another thread's (baseline
      spec's "multiple concurrent conversations" scenario); `BOOKING_PENDING`
      for an unknown request id is dropped without crashing or corrupting
      existing state (`@trace TC-PROTO-01`). Confirm red, implement
      `apps/dashboard/lib/agui-client.ts` to green.
- [x] 6.3 Build `components/ds/` core primitives (`Button`, `IconButton`,
      `Input`, `Badge`, `Card`, `Chip`, `Icon` via `lucide-react`) per
      DESIGN.md — thin, token-driven, no business logic, so no dedicated
      test beyond a smoke render in section 8's E2E pass.
- [x] 6.4 Build `StatusBadge` (+ `statusTone`) as the single source of truth
      mapping `pending/confirmed/declined/cancelled` → icon + color — write
      `StatusBadge.test.tsx` FIRST (red, React Testing Library or an
      equivalent already-available test runner) asserting the four
      status→token mappings, then implement to green.
- [x] 6.5 Build `ChatStream` (streamed text + typing shimmer,
      `prefers-reduced-motion`-safe per DESIGN.md), `RequestCard` +
      `LessonBrief` (fields fill in live; oversized/long-text fields
      line-clamped or scrollable per the baseline spec's "Oversized and
      atypical field content" requirement — write a focused test asserting a
      multi-thousand-character field does not grow the card's own bounding
      box), `SlotChip`, `EmptyState`, and a `ConnectionIndicator` (visible
      "disconnected" state per the baseline spec's reconnect requirement).
- [x] 6.6 Build `DecisionBar` per design.md Decision 4 — all three actions
      rendered, `onClick` posts to `/api/decisions/:requestId` (section 5.7's
      stub), surfaces the stub's "не підключено" response inline rather than
      silently — write `DecisionBar.test.tsx` FIRST (red) asserting the three
      buttons render and the stub response renders inline, not as a thrown
      error. Confirm red, implement to green.
- [x] 6.7 Build `HallMap` — write `HallMap.test.tsx` FIRST (red, given a
      fixture week of bookings via `lib/src/dashboard`'s pure functions):
      exactly 5 rows × 10 seats render; each seat's rendered status-token
      class matches `hallSeatStatus`'s verdict; clicking a `pending` seat
      opens the corresponding request card with `DecisionBar` visible;
      clicking a free seat opens nothing (`@trace FR-DASH-03`,
      `@trace BC-SCHEDULE-01`). Confirm red, implement to green.
- [x] 6.8 Build the "Delete lead" confirmation flow on the lead/request card
      (an explicit two-step confirm, never a single click) — write a test
      FIRST (red) asserting a single click does not call the delete route,
      confirming does, and dismissing the confirmation leaves the lead
      exactly as before (`@trace NFR-PRIV-02`). Confirm red, implement to
      green.
- [x] 6.9 Wire `apps/dashboard/app/page.tsx`: connects via `connectAgui`
      (6.2), renders the conversation panel (`ChatStream` + `RequestCard`),
      the pending queue (empty state when zero, per the baseline spec),
      `HallMap`, and the `ConnectionIndicator` — hydrated on load from the
      server-rendered initial snapshot (`dashboard-db.ts`, 5.5) so the page
      never shows a blank flash before the first SSE frame arrives.
- [x] 6.10 Run `npm run test:run`; confirm 6.2/6.4/6.6/6.7/6.8 green with no
      regressions.

## 7. E2E, accessibility, and demo-proof recording

- [x] 7.1 Start the dashboard (`npm run dev` in `apps/dashboard`, bound to
      `127.0.0.1:3000` per 1.5) against a seeded SQLite fixture (empty DB for
      the empty-state pass; a DB seeded with an active conversation + a
      `pending` request + a mixed-status week of bookings for the populated
      pass).
- [x] 7.2 chrome-devtools MCP (TC-TEST-03): navigate to
      `http://127.0.0.1:3000`, capture the empty-state still (no
      conversations, zero-count queue, all-free HallMap) and the
      populated-state still (queue entry with `DecisionBar`, at least one
      seat of each status color, a rendered `ChatStream` message). Assert in
      the recording script that the flow's own DOM assertions passed before
      counting the clip as evidence (`check:recordings`' "asserted" field).
- [x] 7.3 Run `node scripts/check-a11y.mjs` (light + dark) against the
      populated-state route; fix any serious/critical violation before
      proceeding — pay particular attention to status-badge contrast in dark
      mode (DESIGN.md's explicit AA-in-both-themes claim).
- [x] 7.4 Launch a fresh `vision-judge` pass (maker ≠ checker — never the
      agent that built the UI) on the settled populated-state still, judging
      whether it visibly demonstrates FR-DASH-01 (a real streamed message,
      real request-card fields, a real pending queue entry) and FR-DASH-03
      (five weekday rows, seat colors matching each status). Record `met`/
      `readable`/`notes` in the recording manifest; a `not met`/`not
      readable` verdict blocks this task until fixed and re-recorded.
- [x] 7.5 Write the recording manifest (`docs/qa/dashboard/manifest.json`,
      `scripts/record-demos.mjs`'s contract) citing `FR-DASH-01` and
      `FR-DASH-03`, with the empty-state and populated-state clips/stills and
      the vision verdict from 7.4 attached.
- [x] 7.6 Run `node scripts/check-recordings.mjs`; confirm the manifest's
      claims are backed by real files on disk.

## 8. Validation, review gate, and archive prep

- [x] 8.1 Run `npm run lint`.
- [x] 8.2 Run `npm run test:run` (all unit tests green, lib/ + component
      tests).
- [x] 8.3 Run `npm run test:integration` (sections 4/5's real-SQLite/real-SSE
      suites green, including the S2 pipeline regression guard).
- [x] 8.4 Run `npm run test:e2e` (chrome-devtools/Playwright pass from
      section 7).
- [x] 8.5 Run `npm run build` (root `tsc --noEmit` and `apps/dashboard`'s
      Next build).
- [x] 8.6 Run `npx openspec validate dashboard --strict`.
- [x] 8.7 Run `npx openspec validate --all --strict` (baseline specs stay
      green, this change validates).
- [x] 8.8 Run `node scripts/check-traceability.mjs` (FR-DASH-01/03,
      NFR-LOCAL-01, NFR-PRIV-02, TC-PROTO-01, BC-SCHEDULE-01, BC-BRAND-01
      show implemented coverage, 0 failures).
- [x] 8.9 Run `node scripts/check-a11y.mjs` and `node scripts/check-recordings.mjs`
      one more time against the final build (not just the dev server used
      mid-implementation).
- [x] 8.10 **Review gate — run BEFORE archive** (S1/S2 process lesson,
      `docs/current-state.md`): a fresh reviewer pass (maker ≠ checker) over
      the full diff against `openspec/specs/dashboard/spec.md`, this change's
      `design.md` (both locked decisions, the streaming-honesty note, the
      S3/S4 `DecisionBar` boundary), and AGENTS.md's guardrail rules —
      confirm no confirm-booking or KB-write capability was accidentally
      introduced anywhere in this slice. Record findings (confirmed/
      contested/fixed) in `openspec/changes/dashboard/review-findings.json`,
      same shape as the archived `slots`/`intake` changes' files. Fix or
      explicitly disposition every confirmed finding before proceeding.
- [x] 8.11 Manual real-DB smoke test (scripted + rerunnable, mirroring
      `scripts/qa/manual-smoke-intake.mjs`'s convention as
      `scripts/qa/manual-smoke-dashboard.mjs`, transcript
      `docs/qa/dashboard-manual-smoke.md`):
      1. From a clean SQLite file, start the real bot (`packages/bot`) with
         `AGUI_INGEST_URL` pointed at a running dashboard and the real
         dashboard dev server (`127.0.0.1:3000`); confirm the dashboard shows
         the empty state.
      2. Send a real Telegram message to the bot; confirm the dashboard's
         conversation panel shows a run indicator, then the streamed reply
         text, without a page reload.
      3. Continue the conversation to a state where fields are collected;
         confirm the `RequestCard` fills in live, field by field.
      4. Seed a `pending` booking directly into the SQLite file for that
         lead's request (per design.md Decision 5 — no live hold path yet);
         confirm the queue shows it and the card's `DecisionBar` renders;
         click Confirm and confirm the "не підключено" stub response
         appears inline, not an error page.
      5. Confirm the HallMap shows the seeded `pending` seat amber and that
         clicking it opens the same request card.
      6. Restart the dashboard dev server mid-session; confirm the client
         shows the disconnected indicator, then reconnects and re-renders
         the same state via `STATE_SNAPSHOT`, with no duplicate queue entry.
      7. Use the Delete lead action on the seeded lead; confirm the
         confirmation step, then the actual deletion — the lead disappears
         from the queue/HallMap without a reload, its `requests`/`bookings`
         rows are gone from the SQLite file, and the tentative calendar
         event (if using the real DEMO calendar for this step) is gone from
         the calendar UI.
      8. Kill the bot process only (dashboard still running) and confirm the
         dashboard itself keeps serving its last known state without
         crashing (NFR-LOCAL-01's "dashboard is a separate process" holds).
      Confirm `=== 8.11 SMOKE PASSED (all checks) ===` before proceeding.
- [x] 8.12 Update `docs/current-state.md` (date/time, Europe/Kyiv; S3
      COMPLETE+ARCHIVED summary; note the TC-PROTO-01 CopilotKit deviation
      as a flagged-but-not-yet-applied documentation follow-up; next slice =
      S4 `booking-hitl` or S5 `kb-learning`, per the DAG's "fan out in
      parallel" note).
- [x] 8.13 Only after 8.1–8.12 all pass: `npx openspec archive dashboard
      --yes`. Gates before archive: all unit/integration/E2E green, lint +
      build clean, openspec 2/2 strict (`dashboard` + `--all`), traceability
      0 failures, a11y 0 serious/critical violations, recordings backed by
      real files, review-findings clean, manual smoke passed.
