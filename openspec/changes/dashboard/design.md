## Context

The baseline spec (`openspec/specs/dashboard/spec.md`) and ADR-0001 §2 already
settle *what* this capability does: real-time AG-UI events over SSE drive a
conversation panel, a live request card, a pending queue with a
`DecisionBar`, and a concert-hall week map (`HallMap`), plus a delete-lead
admin action. What is left open — because the baseline spec deliberately
stays implementation-agnostic — is *how* the AG-UI events actually get from
the bot process to a browser tab, what the client looks like, and where the
`lib/` seams for a Next.js dashboard without a live booking-decision path
(S4 not built yet) live. Those are the decisions below. As with S1/S2, no
requirement *text* changes; this change implements the already-accepted
baseline against real code.

## Goals / Non-Goals

**Goals:**
- Get real AG-UI events from the one process that actually produces them
  (the bot's agent loop, ADR-0001) to the dashboard without moving the agent
  into the Next server and without breaking S2's already-archived, tested
  pipeline behavior.
- Make the transport layer (ingest + SSE fan-out) and the rendering layer
  (client-side event reducer + components) each testable without a live
  Telegram chat or a live Anthropic call — seeded DB rows + injected events
  stand in for the parts of the flow (`propose_slots`/`request_hold`) that
  S4 has not wired yet.
- Keep every pure derivation (HallMap status precedence, the week grid,
  JSON-Patch apply) in framework-free `lib/`, per TC-PURE-01 — never
  duplicated ad hoc inside a React component.

**Non-Goals:**
- The admin decision POST handlers, booking state transitions, calendar
  sync, and lead notifications (`booking-hitl`, S4) — this slice renders the
  `DecisionBar`, it does not wire its buttons to a real transition.
- The Question inbox (`kb-learning`, S5) — it renders on the same page
  later but is not part of this capability.
- The raw AG-UI developer panel (FR-DASH-02, Future) and lead-facing seat
  picking on the HallMap (FR-WEB-01, Future).
- CopilotKit as a dependency (see Decision 2) — not installed, not used.

## Decisions

### Decision 1 (LOCKED — human + orchestrator): AG-UI event source is "Bot → Next ingest → SSE"

The bot is the agent host (ADR-0001) and is the only process that actually
runs the agent loop and produces real AG-UI-shaped moments (a run starting, a
reply forming, a field being saved). The bot therefore **publishes** AG-UI
events to a localhost Next.js ingest route, `POST /api/agui/ingest`, via a
thin **injected publisher port** on the pipeline — the same seam pattern
`ModelPort`/`CalendarPort` already use (design.md precedent from S1/S2) —
and this port is a **no-op when not configured**, so a bot process run
without a dashboard listening behaves identically to the already-archived S2
pipeline (protected by a regression test, see Decision 5 / tasks.md §2).

```ts
// packages/bot/src/agui-publisher.ts (shape; the implementer verifies the
// exact event payloads against tools.ts/loop.ts before coding)
export interface AguiPublisher {
  publish(event: AguiEvent): Promise<void>;
}

// No-op default — used whenever AGUI_INGEST_URL is unset. Behaves exactly
// like "no publisher configured" for S2's own tests.
export const noopAguiPublisher: AguiPublisher = {
  async publish(): Promise<void> {},
};
```

The Next server keeps an **in-memory pub/sub** (a single process, single
teacher, `NFR-LOCAL-01` — no cross-process durability is needed) and fans
each ingested event out to every connected dashboard tab over SSE,
`GET /api/agui/stream`. On (re)connect the server sends a `STATE_SNAPSHOT`
**rebuilt from SQLite** — a server-side read, which the baseline spec
explicitly allows ("the dashboard SHALL NOT poll the database" governs the
CLIENT, not this one snapshot-on-connect read the server performs to answer
"what's the current truth"). Rejected alternatives:

- **(a) SQLite-derived SSE** — the server watches row changes and derives
  events instead of the bot publishing them. Rejected: it cannot stream
  agent text mid-turn (there is no `text` column to poll), and it decouples
  "what the agent is actually doing" from "what changed in a table",
  contradicting FR-DASH-01's "real time" language for a `TEXT_MESSAGE_*`
  moment that has no row at all.
- **(b) Moving the agent into the Next server** (the CopilotKit-canonical
  shape, where the agent and the AG-UI endpoint are the same process) —
  rejected: it contradicts ADR-0001's two-surface architecture (Telegram bot
  + localhost dashboard as separate processes) and would mean rewriting the
  already-archived S2 pipeline's entrypoint.

**Streaming-honesty note (record verbatim, this is load-bearing for how the
demo is narrated):** our reply text is largely **code-generated**
(`packages/agent/src/loop.ts`'s `assembleReply` — a deterministic
acknowledgement plus the next question from `questions.ts`, per S2's own
conversational-flow bugfix) and `ClaudeAgentModelPort` captures the model's
`tool_use` via `canUseTool` and **aborts** rather than letting the model
stream free-form tokens. So `TEXT_MESSAGE_CONTENT` chunks this slice emits
are **one or a few chunks of the already-assembled final reply string, not
per-model-token streaming**. The baseline spec (FR-DASH-01's requirement
text, "Live conversation view with streamed agent text") is explicit that
streaming is a *dashboard-rendering* concern: emitting
`TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT(reply) → TEXT_MESSAGE_END` and
rendering it incrementally on the client satisfies the requirement text and
its scenarios (which only assert chunks arrive and the view grows
incrementally, not that chunks are token-granular). Do not claim real
token-level model streaming in the demo recording's narration — say
"streamed reply rendering," not "token streaming."

### Decision 2 (LOCKED — human + orchestrator): client is a lean AG-UI/SSE client, not CopilotKit

The dashboard client is native `EventSource` (`apps/dashboard/lib/agui-client.ts`
or similar client-only module) plus a typed AG-UI event reducer — no
CopilotKit package is installed or imported. Rationale: nothing CopilotKit
provides is installed today, and the dashboard is a bespoke teacher control
panel (conversation panel + pending queue + HallMap) rather than a copilot
chat sidebar — CopilotKit's own component model (a chat UI over an agent) is
not the shape this UI needs. This still honors TC-PROTO-01's core intent,
"AG-UI over SSE," while dropping CopilotKit specifically as the client
library.

**Advisory deviation, recorded here and in `proposal.md`:** TC-PROTO-01's
literal text also names "CopilotKit on the frontend." This is a deliberate
deviation, not an oversight — flagged for `docs/requirements.md`/the spec to
be updated with a TC note in a later documentation pass; this change does
not edit `docs/requirements.md` itself.

```ts
// apps/dashboard/lib/agui-client.ts (illustrative shape only)
export type AguiEvent =
  | { type: "RUN_STARTED"; threadId: string; runId: string }
  | { type: "RUN_FINISHED"; threadId: string; runId: string }
  | { type: "RUN_ERROR"; threadId: string; message: string }
  | { type: "TEXT_MESSAGE_START"; messageId: string; threadId: string }
  | { type: "TEXT_MESSAGE_CONTENT"; messageId: string; delta: string }
  | { type: "TEXT_MESSAGE_END"; messageId: string }
  | { type: "STATE_SNAPSHOT"; snapshot: DashboardState }
  | { type: "STATE_DELTA"; delta: JsonPatchOp[] }
  | { type: "CUSTOM"; name: "BOOKING_PENDING"; value: BookingPendingPayload };

export function connectAgui(onEvent: (event: AguiEvent) => void): () => void {
  const source = new EventSource("/api/agui/stream");
  source.onmessage = (message) => {
    const parsed = safeParseAguiEvent(message.data); // drops unparseable/unknown, never throws
    if (parsed !== null) onEvent(parsed);
  };
  return () => source.close();
}
```

### Decision 3: pure derivations for HallMap and STATE_DELTA live in `lib/src/dashboard/`

Per TC-PURE-01, three functions are framework-free with colocated
`*.test.ts`:

- `hallSeatStatus(bookingsForSeat: SeatBooking[]): SeatStatus` — the
  precedence rule from the baseline spec's HallMap requirement:
  `confirmed` > `pending` > `cancelled`/`declined` > free. A seat whose only
  bookings this week are released renders `cancelled` (slate), never
  reverting to free.
- `weekSeatGrid(weekStart: string): SeatCoordinate[]` — Mon–Fri rows,
  10:00–19:00 hourly-start seats (BC-SCHEDULE-01), pure given a week-start
  date (injected, not `Date.now()`-derived, so it is deterministically
  testable for any week).
- `applyJsonPatch(state: DashboardState, ops: JsonPatchOp[]): DashboardState`
  — RFC 6902 `add`/`remove`/`replace`/`move`/`copy`/`test`, discarding (not
  throwing on) an operation whose `path` targets a field absent from the
  card's state model, per the baseline spec's "delta patching a nonexistent
  field is discarded" scenario. `test` failures also discard just that
  operation, never crash the reducer.

```ts
// lib/src/dashboard/hall-status.ts (shape)
export type SeatStatus = "free" | "pending" | "confirmed" | "cancelled";

export function hallSeatStatus(bookings: { status: BookingStatus }[]): SeatStatus {
  if (bookings.some((b) => b.status === "confirmed")) return "confirmed";
  if (bookings.some((b) => b.status === "pending")) return "pending";
  if (bookings.some((b) => b.status === "cancelled" || b.status === "declined")) return "cancelled";
  return "free";
}
```

Server-only glue (reading `bookings`/`requests` rows and mapping them onto
`SeatBooking[]`/`DashboardState`) stays in `apps/dashboard`, never in
`lib/` (TC-PURE-01's "no `next/*`, no DOM, no SDKs" line).

### Decision 4: `DecisionBar` renders in a read-only/disabled-action state; wiring is S4's

Per the scope boundary (`proposal.md`), the `DecisionBar` component renders
all three actions (Confirm / Propose another time / Decline) with real
labels, real focus states, and real `--status-pending` styling — this is
part of what FR-DASH-01's "queue... renders the DecisionBar" scenario
requires and what the axe/vision-verify gates check. The buttons' `onClick`
posts to a placeholder route (`/api/decisions/:requestId` — the exact path
`booking-hitl` will implement) that this slice stubs to return a
deterministic "not yet available" response rather than omitting the handler
entirely (so the button is not silently dead — clicking it surfaces "Ще не
підключено" rather than a raw 404/500, keeping the "never a raw 500" rule
even for an intentionally-unfinished action). S4 replaces the stub route
with the real transition handler; the component itself does not change.

### Decision 5: testing seams — seeded SQLite rows + an injectable event source, no live hold flow

Because `propose_slots`/`request_hold` are still pass-through no-ops in the
S2 loop (S4 wires them), there is no live path to a `pending` booking today.
This slice's integration tests therefore seed `pending` bookings/requests
**directly into SQLite** (mirroring the row shapes `booking-hitl` will
produce) and separately **inject** a `BOOKING_PENDING`/`STATE_SNAPSHOT`/
`STATE_DELTA` event onto the SSE fan-out to prove the client renders it —
two independent seams, not one simulated end-to-end hold:

- **`FakeAguiPublisher`** (mirrors `FakeModelPort`/`FakeCalendarPort`): an
  in-test double for the bot-side publisher port, used to assert the
  no-op-if-absent regression (Decision 1) and, separately, to assert real
  events reach the real ingest route when configured.
- **Real ingest + real SSE stream in integration tests**: a test starts the
  actual Next route handlers (or an equivalent in-process harness), POSTs a
  crafted AG-UI event to `/api/agui/ingest`, and asserts a connected
  `EventSource`-equivalent test client receives it and the reducer updates
  as expected — this is the "real AG-UI/SSE stream" test layer named in
  `docs/mvp-capability-plan.md` §S3.
- **Seeded SQLite for queue/HallMap/delete-lead tests**: `openDatabase(":memory:")`
  (or a temp file) with `leads`/`requests`/`bookings` rows inserted directly
  via `@kamerton/db`'s existing row helpers (S1/S2 precedent) — no bot, no
  Anthropic call needed to prove the queue renders a `pending` row or that
  delete-lead cascades correctly.

**Test layers** (mirrors `docs/mvp-capability-plan.md` §S3):
1. **Unit** (`lib/src/dashboard/`, Vitest): `hallSeatStatus` precedence
   table, `weekSeatGrid` Mon–Fri × 10:00–19:00 shape, `applyJsonPatch`
   add/remove/replace/discard-unknown-path cases.
2. **Integration** (real SQLite + real ingest/SSE routes): conversation
   panel reflects a published streamed reply; queue reflects a seeded
   `pending` request; `STATE_SNAPSHOT`-on-reconnect converges without
   duplication; delete-lead cascades `leads`/`requests`/`bookings` and calls
   `CalendarPort.deleteEvent` for a seeded pending booking's tentative
   event.
3. **E2E** (chrome-devtools MCP, TC-TEST-03): dashboard loads on
   `127.0.0.1:3000`; empty-state screenshot; populated-state screenshot
   (seeded queue + HallMap with a `pending` seat).
4. **Rendered-UI gates**: axe `check-a11y` light+dark; a `vision-judge`
   pass (via the vision-verify workflow) on the settled populated-state
   still; a recording manifest citing FR-DASH-01 + FR-DASH-03.

## Risks / Trade-offs

- **[Risk]** The streaming-honesty gap (Decision 1) could be mis-narrated in
  the demo recording as "real token streaming," which is not what happens.
  → **Mitigation:** the note above is copied verbatim into the recording
  manifest's description and reviewed at the recording-quality-bar step;
  narration says "streamed reply rendering."
- **[Risk]** An in-memory pub/sub in the Next server means a Next server
  restart drops all connected clients' in-flight state until the next
  `STATE_SNAPSHOT` — acceptable for a single-teacher localhost tool, but
  worth naming. → **Mitigation:** the baseline spec's own "SSE reconnect
  without state loss" requirement already mandates a snapshot-on-reconnect,
  which covers exactly this case; no additional durability is needed for
  MVP.
- **[Risk]** Dropping CopilotKit (Decision 2) is a deviation from
  TC-PROTO-01's literal text and could be read as scope drift if not
  flagged. → **Mitigation:** recorded explicitly here and in `proposal.md`;
  `tasks.md`'s final section notes it should be reflected back to
  `docs/requirements.md` in a later documentation pass.
- **[Risk]** Rendering a `DecisionBar` whose buttons are intentionally
  inert (Decision 4) could look like a bug to a tester clicking Confirm
  before S4 ships. → **Mitigation:** the stubbed response text ("Ще не
  підключено") is explicit and Ukrainian, never a silent no-op or a raw
  error; `proposal.md`'s scope section and the demo recording's narration
  both call this out as an intentional S3/S4 boundary.
- **[Risk]** Seeding `pending` rows directly into SQLite for tests (Decision
  5) instead of driving a live hold means a real S4-era bug in
  `propose_slots`/`request_hold`'s eventual wiring would not be caught by
  this slice's tests. → **Mitigation:** this is the same ownership boundary
  the signed slice DAG already draws (S4 depends on S3, not the reverse);
  S4's own test suite is responsible for the live hold round trip.
