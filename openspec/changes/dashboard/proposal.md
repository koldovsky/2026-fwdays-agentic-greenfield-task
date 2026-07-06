## Why

`dashboard` is Slice S3 of the signed Phase 3 plan (`docs/mvp-capability-plan.md`
§S3): the human-in-the-loop control surface that lets the administrator see
real leads and real requests as they happen. It depends on S2 `intake`
(archived `openspec/changes/archive/2026-07-06-intake/`) for real
`leads`/`requests` rows and a real conversation pipeline — an empty dashboard
built against fixtures first would need to be re-verified against the real
event shape anyway, so `dashboard` goes third. The baseline spec
(`openspec/specs/dashboard/spec.md`) already passed G2; this change implements
it, unchanged, against real code, a real AG-UI/SSE transport, and a real
SQLite file.

## What Changes

- A thin **publisher port** added to `packages/bot`'s pipeline (design.md
  Decision 1): the bot publishes AG-UI events (`RUN_STARTED/FINISHED`,
  `TEXT_MESSAGE_*`, `STATE_SNAPSHOT/DELTA`, custom `BOOKING_PENDING`) to a
  local ingest endpoint. **No-op when not configured** — S2's committed
  pipeline behavior is provably unchanged when no dashboard is running.
- `apps/dashboard/app/api/agui/ingest` (`POST`) — an in-memory pub/sub that
  fans events out to connected dashboards; `apps/dashboard/app/api/agui/stream`
  (`GET`, SSE) — sends a `STATE_SNAPSHOT` rebuilt from SQLite on every
  (re)connect, then live events.
- A lean, native-`EventSource` AG-UI client (design.md Decision 2 — no
  CopilotKit) with a typed event reducer: `ChatStream` (streamed conversation
  text), `RequestCard` (live intake fields), the pending queue + `DecisionBar`
  (rendering only — see Scope below), `HallMap` (the concert-hall week view),
  a connection-status indicator, and explicit empty states.
- New framework-free `lib/src/dashboard/` modules (TC-PURE-01): the
  `HallMap` status-token precedence function (`confirmed` > `pending` >
  `cancelled`/`declined` > free), the Mon–Fri × 10:00–19:00 week-seat grid,
  and a pure JSON-Patch (RFC 6902) apply helper for `STATE_DELTA`.
  Colocated `*.test.ts`.
- The **Delete lead** admin action (NFR-PRIV-02): cascade-deletes a lead's
  `leads`/`requests`/`bookings` rows and deletes any tentative calendar event
  for a `pending` booking, via the existing `CalendarPort` (reused from S1).
  Requires an explicit confirmation step; surfaces inline errors, never a raw
  500.

No requirement text in `openspec/specs/dashboard/spec.md` changes as a result
of this slice; this change carries a `MODIFIED` delta (`specs/dashboard/spec.md`)
with the full, unedited baseline content, matching the precedent set by the
archived `slots` and `intake` changes.

## Capabilities

### Modified Capabilities

- `dashboard`: no requirement *text* changes. The change carries a `MODIFIED`
  delta with the full baseline content so the archive step maps cleanly onto
  the existing requirement names in `openspec/specs/dashboard/spec.md`.

## Scope boundary — S3 vs S4 (`booking-hitl`)

S3 owns **rendering + the transport**. S4 owns the decision POST handlers,
the booking state transitions, calendar sync on Confirm/Decline, and lead
notifications. `propose_slots`/`request_hold` are still pass-through no-ops
in the S2 loop today (deferred to S4), so there is **no live path to a
`pending` booking yet**. Consequently:

- The pending queue, `DecisionBar` rendering, HallMap `pending` seats, and
  the delete-of-a-pending-lead path are built and TESTED against **seeded DB
  rows + injected `BOOKING_PENDING`/`STATE_*` events**, not a live hold flow.
- The `DecisionBar` renders its three actions (Confirm / Propose another time
  / Decline) and exists on the card, but the buttons' POST target is stubbed
  or rendered in a read-only/disabled-action state — wiring them to real
  transitions is S4's job.
- Delete-lead IS fully owned and functional here (it only needs a seeded
  `pending` booking + the calendar adapter, not the live hold round trip).

## Impact

- **Packages touched:** `lib/` (new `lib/src/dashboard/` module tree),
  `packages/bot` (publisher port added to the pipeline, no-op-if-absent),
  `packages/agent`/`packages/db` (read-only — no schema changes),
  `apps/dashboard` (new API routes, SSE client, `components/ds/` domain
  components per DESIGN.md, `app/page.tsx`).
- **Test layers added:** Vitest unit tests in `lib/src/dashboard/*.test.ts`
  (status-token precedence, week grid, JSON-Patch apply); integration tests
  against real SQLite + a real AG-UI/SSE stream (conversation panel reflects
  a streamed reply, queue reflects a seeded `pending` row, `STATE_SNAPSHOT`
  reconnect convergence, delete-lead cascade incl. tentative-event delete);
  E2E via chrome-devtools MCP (TC-TEST-03, empty + populated state); axe
  `check-a11y` (light+dark) + a `vision-verify` pass on the settled still.
- **Non-goals for this slice:** the admin decision handlers and booking
  state transitions (`booking-hitl`, S4), the Question inbox (`kb-learning`,
  S5), the raw AG-UI developer panel (FR-DASH-02, Future), lead-facing seat
  picking on the HallMap (FR-WEB-01, Future), authentication/multi-user
  access (intentionally unsupported — localhost binding is the boundary).
- **Advisory deviation to flag back to `docs/requirements.md`:** TC-PROTO-01
  names "AG-UI over SSE (CopilotKit on the frontend)"; this slice implements
  AG-UI over SSE with a bespoke lean client instead of CopilotKit (design.md
  Decision 2). Recorded here and in design.md; not edited into
  `docs/requirements.md` by this change.
