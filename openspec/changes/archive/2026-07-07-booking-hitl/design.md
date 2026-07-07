## Context

The baseline spec (`openspec/specs/booking-hitl/spec.md`) and ADR-0001 §6
already settle *what* this capability does: three admin decisions on a
`pending` booking, each syncing the DEMO calendar and notifying the lead,
plus the structural guarantee that only this capability's code path can ever
set `bookings.status = 'confirmed'`. What the baseline spec deliberately does
NOT settle — because it starts from "a `pending` request appears on the
dashboard" as a given — is how a request GETS to `pending` in the first
place. That plumbing was consciously deferred by S2 `intake`
(`openspec/changes/archive/2026-07-06-intake/proposal.md`: "`propose_slots`/
`request_hold`... their real wiring... is owned by S4 `booking-hitl`") and
confirmed again by S3's review gate (`openspec/changes/archive/
2026-07-06-dashboard/review-findings.json`'s four `deferredWithOwner`
findings, all "owner: S4 booking-hitl"). This design therefore has two
halves: the baseline spec's own admin-decision semantics (Decisions 3-6
below), and the lead-side proposal/hold wiring the DAG assigned to this slice
by name (Decision 2). Neither half changes any requirement *text*: this
change's own `specs/booking-hitl/spec.md` delta is the full, unedited
baseline restated as `MODIFIED Requirements` (OpenSpec strict validation
requires at least one delta per change — the same mechanical requirement
S1/S2 already satisfied this way), not a substantive change. The
non-`booking-hitl` files this change touches belong to OTHER capabilities'
already-archived slices for a reason unrelated to any spec gap in them: S1
`slots`' spec already fully specifies FR-SLOT-01/02's "propose"/"hold"
behavior (this change only wires the previously-deferred tool dispatch to
it); S2 `intake`'s spec only names the `proposing`/`awaiting_admin`
conversation states, not the tool-dispatch mechanics; S3 `dashboard`'s spec
owns rendering, not decision semantics — none of their requirement text
changes either.

## Goals / Non-Goals

**Goals:**
- Keep the guardrail-critical facts — which transitions exist, which slots
  are valid, whether a decision is even legal right now — in pure `lib/`
  functions the dashboard route and the bot pipeline both call through,
  never a decision made by prompt wording or client-side JS alone
  (TC-PURE-01, mirroring S1/S2/S3's own discipline).
- Preserve the two existing structural guardrails byte-for-byte:
  `BookingStorePort` (agent loop) stays cancel-only — no create/confirm
  method is ever added to it; `packages/agent` never imports the slots
  `CalendarPort` type.
- Make the cross-process notification channel durable (survives a bot
  restart) rather than best-effort-in-memory, per the locked human decision.
- Discharge the four S3 carryovers with a named, evidenced mechanism each —
  not deferred again.

**Non-Goals:**
- Automatic hold expiry, rescheduling a confirmed lesson, payments (PRD "Out
  of scope", unchanged since S1).
- Group joins (`FR-GROUP-01`, Future) — this HITL loop is reused by it later,
  not built for it now.
- The Question inbox / `questions` table (`kb-learning`, S5) — independent
  of this slice per the DAG (`docs/mvp-capability-plan.md` §S4/§S5: "S4 and
  S5 do not depend on each other").
- Authentication on decision actions (baseline spec's own Exclusions,
  NFR-LOCAL-01 localhost trust model) — unchanged.

## Decisions

### Decision 1: the decision→lead-notification channel is a SQLite outbox drained by the bot (LOCKED)

**This is a human decision, recorded 2026-07-07 in `docs/current-state.md`
before this change folder existed, restated here verbatim in spirit, not
reopened.** The dashboard's decision route and the bot process are two
separate OS processes (ADR-0001 §1: the dashboard has no inbound listener
other than the bot's own AG-UI ingest POST; the bot never accepts inbound
HTTP). A decision made in the dashboard process therefore cannot call
`TelegramTransport.sendMessage` directly — it has no `TelegramTransport`
instance, and giving it one would mean either the dashboard talks to
Telegram directly (duplicating the bot's transport, `NFR-LOCAL-01`'s "one
bot process" assumption) or the two processes need a synchronous RPC.

Three options were considered:

| | A localhost bot HTTP listener (dashboard calls the bot) | A reverse AG-UI channel (bot subscribes to dashboard decisions over SSE/polling) | **A SQLite notification outbox, drained by the bot (chosen)** |
|---|---|---|---|
| Durability across a bot restart | N/A — a listener that's down loses the call | Ephemeral — a decision made while the bot is down/reconnecting is lost | Durable — a row sits in `notifications` until delivered, survives either process restarting |
| New inbound surface | The bot gains an inbound HTTP listener — breaches ADR-0001 §1's "no inbound" invariant | None (SSE is bot→dashboard already; this reverses the direction the bot would need to poll/subscribe) | None — the bot already polls Telegram; polling one more thing (its own DB) is free |
| Retry on delivery failure | Whatever the dashboard's HTTP client retries — ad hoc, no durable per-decision retry state | Whatever the reconnect logic does — not row-level, no per-decision retry state | `delivery_status` (`pending`/`delivered`/`failed`) is a durable per-decision retry state the drain loop AUTOMATICALLY retries every tick until it succeeds (auto-retry-only — LOCKED human decision 2026-07-07; see note below) |
| Consistency with existing patterns | New pattern | New pattern | Mirrors the already-accepted FR-KB-04/ADR-0001 §4 `questions.delivery_status` shape — same enum, same durable-retry contract |

**Chosen:** the dashboard decision route (`apps/dashboard/app/api/decisions/
[requestId]/route.ts`, currently the inert stub) validates admin input, syncs
the calendar (calendar-op-before-DB-commit — see Decision 5), calls the pure
`lib/src/booking/` transition, commits the DB change, then INSERTs one
`notifications` row (`delivery_status` starting `pending`). The bot's
`packages/bot/src/index.ts` gains a short-interval timer
(`setInterval`, alongside the existing `transport.start()` call — no timer
exists anywhere in the repo today) that drains deliverable rows, calls
`transport.sendMessage`, and marks each row `delivered` or `failed`. A
`failed` row is AUTOMATICALLY retried on the next drain tick (no backoff
needed at single-teacher volume — see Risks), so the guarantee is "recorded +
never silently dropped + auto-retried until delivered" — NOT a manual admin
retry affordance on the card. **Auto-retry-only (LOCKED human decision,
2026-07-07):** the review gate flagged that the dashboard does not read
`notifications.delivery_status` to render a per-decision "retry sending"
control, which an earlier draft of this decision and the baseline
NFR-REL-01 scenario implied. The human decided the automatic drain retry is
sufficient (and arguably better UX than a manual button) for the
single-teacher MVP; the change's own spec delta amends that scenario
accordingly (drops the "surfaced on the request card so the administrator can
retry" clause, keeps "durably recorded + automatically retried + never
silently dropped"). A manual retry surface is a deliberately-deferred future
enhancement, not an MVP gap. Rejected: (a) a localhost bot
HTTP listener — breaches ADR-0001 §1's no-inbound invariant for the bot
process; (b) a reverse AG-UI channel — ephemeral, no durable per-decision
retry state, and inverts the existing SSE direction for no benefit.

### Decision 2: lead-side proposal/hold wiring — two new narrow ports, never widening the existing guardrailed ones

**The real decision: where does hold-creation + the pending-booking INSERT
live, and how does it reach both a model tool call and a raw button tap
without breaking either existing structural guardrail?**

Two lead-facing paths must both end at the same hold-creation side effect:
(a) `request_hold` (a model tool, free text — the lead types "давайте
вівторок о 17:00" instead of tapping anything), and (b) a new inline-keyboard
slot-chip tap (`"slot:<n>"`, resolved by `packages/bot/src/pipeline.ts`'s
`parseCallbackEvent` WITHOUT an agent call, per S2 design.md Decision 3 —
this callback shape was a NAMED gap left for this slice: "a full
`request_hold` orchestration through this callback path... is a named gap
left for the `dashboard`/`booking-hitl` slices"). Duplicating the
orchestration in two places would risk them drifting (one path validating
the slot index, the other forgetting to).

**Chosen:** one pair of shared, `packages/bot`-owned async orchestration
functions — `performProposeSlots(deps, request)` and `performHoldSlot(deps,
request, slotIndex)` — called from BOTH `parseCallbackEvent`'s new
`"slot:<n>"` branch (via `applyCallbackEvent`, now `async`) and from two new
narrow ports on `LoopPorts` that `pipeline.ts` pre-binds to these SAME
functions, so `packages/agent/src/loop.ts`'s `applyToolUse` calls the
identical code the callback path calls:

```ts
// packages/agent/src/loop.ts (LoopPorts additions)
export interface SlotsPort {
  /** Wraps S1's proposeSlots, pre-bound to a concrete CalendarPort and the
   *  request's own preferences by the caller — this package never imports
   *  the slots CalendarPort type (unchanged rule). */
  proposeSlots(input: { weekdays: string[]; timeWindow: { start: string; end: string } }):
    Promise<{ status: "ok"; slots: OfferedSlot[] } | { status: "no_free_times" } | { status: "unavailable"; apology: string }>;
}
export interface HoldStorePort {
  /** Wraps S1's holdWithRecovery + the pending-booking DB insert (with
   *  request_id) as ONE atomic-from-the-caller's-view step. Deliberately a
   *  SEPARATE interface from BookingStorePort (cancel-only) — this is an
   *  INSERT of a new pending row, never a confirm, and inspecting
   *  BookingStorePort alone still proves "no create/confirm method exists
   *  on it" (FR-GUARD-01's structural assertion is unchanged). */
  holdSlot(slotIndex: number, offeredSlots: OfferedSlot[]):
    Promise<{ status: "held"; bookingId: number } | { status: "collision" } | { status: "unavailable"; apology: string }>;
}
export interface LoopPorts {
  model: ModelPort;
  persistence: PersistencePort;
  bookingStore: BookingStorePort; // UNCHANGED — still cancel-only
  releaseHold: ReleaseHoldFn;
  slots: SlotsPort;       // NEW
  holdStore: HoldStorePort; // NEW
}
```

Two new pure `IntakeEvent` variants on `lib/src/intake/state-machine.ts`
(owned by `proposing` in `OWNING_STATE`, same field-ownership gate every
other event already goes through):

```ts
export interface OfferedSlot { start: string; end: string } // Kyiv wall-clock, Slot's shape
// IntakeFields gains: offeredSlots?: OfferedSlot[]
export type IntakeEvent =
  | ...                                            // unchanged existing members
  | { type: "offer_slots"; slots: OfferedSlot[] }  // proposing -> proposing, records the offer
  | { type: "pick_slot"; slotIndex: number };      // proposing -> awaiting_admin, IF slotIndex is in range
```

`pick_slot` with an out-of-range `slotIndex` (a stale/replayed callback, or a
model hallucinating an index) is rejected with a new `TransitionErrorCode`
(`"INVALID_SLOT_INDEX"`), state/fields unchanged — the same "reject in code,
never trust the caller" shape `FIELD_NOT_OWNED_BY_STATE` already has.
`offer_slots` with an empty `slots` array (S1's `noFreeTimes` case) is still
recorded (the reducer does not special-case emptiness — the "no free times"
message-composition decision belongs to `pipeline.ts`/`loop.ts`'s reply
assembly, not the pure state).

**Sub-decision: `propose_slots`' tool schema gains structured parameters,
deviating from S2's own shipped comment.** `tools.ts`'s current schema is
parameterless (`input_schema: { type: "object", properties: {} }`), and its
header comment says the loop derives `ProposeRequest.preferences` itself
"from the already-collected `IntakeFields`". That cannot work as written:
`IntakeFields.preferredWeekdays`/`preferredTimeRange` are the lead's own
free-text sentences (FR-INTAKE-06, e.g. "вівторок і четвер ввечері"), while
S1's `Preferences` (`lib/src/slots/rank.ts`) needs a structured `{weekdays:
string[]; timeWindow: {start,end}}`. Two ways to bridge that gap:

| | Parse the free text in `lib/`/`packages/bot` (regex/keyword heuristics for Ukrainian weekday names and times of day) | **The model re-extracts a structured value into the tool call, code validates (chosen)** |
|---|---|---|
| Consistency with S2's own established pattern | None — S2 explicitly rejected hand-rolled NLU in `lib/` for exactly this reason (intake design.md Decision 1: "a hand-rolled Ukrainian numeral dictionary in `lib/` would duplicate what the model already does well") | Same pattern S2 already uses for `save_age` ("the model is responsible for extracting a candidate value before calling a tool") |
| Guardrail surface | A heuristic parser is itself untested surface that could silently mis-map "ввечері" to the wrong window with no test catching it | Schema enum (`weekdays` enum `Mon..Fri`) + a new pure `validatePreferences` guard in `lib/src/booking/` is checked twice, same defense-in-depth as every other enum-shaped tool param |
| TC-PURE-01 | Would add non-trivial branching logic to a "pure" module that is really doing linguistic inference | `lib/` stays a pure validator, zero inference |

**Chosen:** `propose_slots`' schema gains `weekdays: string[]` (enum
`["Mon","Tue","Wed","Thu","Fri"]`) and `timeWindow: {start: string; end:
string}` (HH:mm), which the model fills in by re-reading the lead's own
free-text weekday/time answer already visible in the conversation's dynamic
system-prompt block (`buildSystemPrompt`, unchanged) — exactly the same
"extract, don't invent" trust boundary `save_age` already relies on. A new
`validatePreferences(input)` pure guard (`lib/src/booking/`) rejects an empty
`weekdays` array, an out-of-enum weekday, or `start >= end` before
`ports.slots.proposeSlots(...)` is ever called — defense in depth, the model
cannot bypass it by ignoring its own schema.

`request_hold`'s existing schema (`slotIndex: integer`) needs no change — it
already expresses "pick from the list just offered", never inventing a slot.

### Decision 3: a new pure `lib/src/booking/` module owns the three admin transitions and admin-slot validation

Two new files, both TC-PURE-01 (no I/O, no `Date.now()`):

```ts
// lib/src/booking/transitions.ts
export type BookingDecision = "confirm" | "decline" | "propose_another_time";
export type BookingDecisionResult =
  | { ok: true; nextStatus: "confirmed" | "declined" | "cancelled" }
  | { ok: false; error: "NOT_PENDING" };
export function applyBookingDecision(currentStatus: BookingStatus, decision: BookingDecision): BookingDecisionResult;
```
Deliberately minimal: the ENTIRE guardrail this function embodies is "only a
`pending` booking may transition", which is exactly the baseline spec's
"Decision on a request no longer pending is rejected" scenario. It does not
touch the calendar or the DB — those are the caller's job (Decision 5),
kept separate so this function stays trivially, exhaustively unit-testable.

```ts
// lib/src/booking/validate-admin-slots.ts
export type AdminSlotValidationResult =
  | { ok: true }
  | { ok: false; code: "NO_SLOTS_SELECTED" }
  | { ok: false; code: "OFF_GRID"; slot: Slot }
  | { ok: false; code: "SLOT_UNAVAILABLE"; slot: Slot };
export function validateAdminProposedSlots(input: {
  slots: Slot[];
  busy: BusyInterval[];          // fresh Kyiv-local free/busy (converted at the CalendarPort boundary, same convention as hold.ts)
  otherPendingSlots: Slot[];     // other leads' pending holds, Kyiv-local
}): AdminSlotValidationResult;
```
Checks run in order (first violation wins, deterministic): empty selection →
grid membership (Mon–Fri, 60-minute, last start 19:00, via a new exported
`isSlotOnGrid(slot: Slot): boolean` added to `lib/src/slots/grid.ts` and
reused here — "one shared predicate, never re-derived", the same discipline
`hold.ts` already applies to `subtract.ts`'s `overlaps`) → free/busy and
other-pending overlap (reusing `overlaps` from `subtract.ts` directly, same
pattern `hold.ts`'s own collision check already uses). This is the exact
sequence the baseline spec's three "Admin-proposed slot" scenarios need,
each mapping onto one violation code.

`lib/src/booking/copy.ts` holds the three deterministic Ukrainian messages
(confirmation-with-date-and-time, kind-refusal-door-open, re-proposal — no
model composition, BC-BRAND-01/BC-LANG-01 — same "guardrail copy is code,
never the model" rule as `intake/copy.ts`), asserted by the same kind of
content-shape tests (`@trace BC-BRAND-01`: no exclamation marks/emoji on
decline and re-proposal; confirmation carries at most one `!` and one 🎵).

### Decision 4: DB seam additions

Four additions to `packages/db`, all idempotent per `initSchema()`'s existing
discipline:

1. **`notifications` table** (Decision 1's outbox):
   ```sql
   CREATE TABLE IF NOT EXISTS notifications (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
     telegram_chat_id TEXT NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('confirmed','declined','proposed_again')),
     payload TEXT NOT NULL,          -- JSON: { text, buttons? } (buttons only for proposed_again)
     delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','delivered','failed')),
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
     delivered_at TEXT
   );
   CREATE INDEX IF NOT EXISTS idx_notifications_deliverable
     ON notifications(delivery_status) WHERE delivery_status IN ('pending','failed');
   ```
   Mirrors the FR-KB-04/ADR-0001 §4 `delivery_status` pattern exactly, per
   the locked decision's own wording. `packages/db/src/notifications.ts`:
   `insertNotification`, `findDeliverableNotifications(db, limit)`,
   `markNotificationDelivered(db, id)`, `markNotificationFailed(db, id)`.
2. **`requests.offered_slots`** (TEXT, nullable, JSON array of
   `{start,end}`): added via the same `PRAGMA table_info` idempotency check
   `ensureBookingsRequestIdColumn` already established (a new
   `ensureRequestsOfferedSlotsColumn`, same file, same convention). Serves
   BOTH origins of "slots currently offered to this lead" — the agent's own
   `offer_slots` event AND the administrator's "Propose another time"
   slots — since both represent the identical fact the baseline spec names:
   "the administrator's suggested slot(s) offered as the new proposal" reuses
   the exact same field a lead-initiated proposal would have used. JSON
   (de)serialization happens at the `packages/db`/`packages/agent` boundary
   (`updateRequestFields`'s existing snake_case mapping gains one more
   column), never inside `lib/`'s pure reducer, which keeps working with a
   real `OfferedSlot[]` array.
3. **`bookings.insertBooking` persists `request_id`**: `InsertBookingInput`
   gains an optional `requestId?: number | null`, threaded into the existing
   `INSERT ... RETURNING *` — the documented gap the seam dossier names
   ("`insertBooking` does NOT persist `request_id`") is closed here, since
   `HoldStorePort.holdSlot` (Decision 2) is the first real caller that needs
   it (S1's own tests/fixtures never passed one — `requestId` stays optional
   so they keep compiling unchanged).
4. **`findBookingsByRequestId(db, requestId): BookingRow[]`** (new, plain
   `SELECT * FROM bookings WHERE request_id = ? ORDER BY id DESC`): replaces
   `pipeline.ts`'s inline raw SQL (`BookingStorePort`'s
   `findPendingBookingForCurrentRequest`) with a shared, tested helper, AND
   is what the decision route (Decision 5) and the idempotent-delete fix
   (Decision 6, item 2) both use to find every pending booking for a
   request/lead rather than assuming exactly one.

### Decision 5: decision route orchestration order

`POST /api/decisions/[requestId]` (`apps/dashboard/app/api/decisions/
[requestId]/route.ts`) replaces the inert stub, keeping its response shape's
discriminant convention (`{status, message}`) but widening `status` to
`"applied" | "stale" | "conflict" | "invalid"` (never a raw 4xx/5xx for a
real admin action, matching the stub's own documented "REQUEST handled
correctly, ACTION result varies" reasoning) plus `{action: "confirm" |
"decline" | "propose_another_time", slots?: {start, end}[]}` in the request
body (`slots` only for `propose_another_time`).

Fixed order, every step short-circuiting to a deterministic response on
failure — this is the literal calendar-op-before-DB-commit sequence the
baseline spec's NFR-REL-01 scenarios require:

1. **Parse/validate** the route params and body shape (non-integer
   `requestId`, unknown `action` → `400`, not the pinned decision shapes at
   all — a wire-format error, not a decision outcome).
2. **Resolve the current pending booking** via `findBookingsByRequestId`
   (Decision 4.4), filtered to `status === 'pending'`. Zero matches → `200
   {status:"stale", ...}` (baseline spec's "shows the administrator the
   request's current state instead of a raw error" scenario) — never `404`.
3. **`propose_another_time` only:** validate `slots` via
   `validateAdminProposedSlots` (Decision 3) against a FRESH
   `calendar.freeBusy` fetch — BEFORE any calendar write, DB write, or lead
   message, per the baseline spec's own ordering. Invalid → `200
   {status:"invalid", code, message}`, booking untouched.
4. **Calendar operation** (always before the DB commit):
   - `confirm`: fresh `calendar.freeBusy` re-check for a collision (same
     `overlaps` reuse as `hold.ts`'s own re-check), then
     `calendar.upgradeToConfirmed(eventId, compileFirstLessonBrief(request))`.
     A collision → `200 {status:"conflict", ...}`, no confirmed event, booking
     stays `pending`. A `CalendarError` from either call → `200
     {status:"unavailable", ...}`, booking stays `pending` (NFR-REL-01).
   - `decline` / `propose_another_time`: `calendar.deleteEvent(eventId)`
     (idempotent per Decision 6, item 2). A `CalendarError` → `200
     {status:"unavailable", ...}`, booking stays `pending`, slot NOT marked
     released (baseline spec's own wording).
5. **Pure transition**: `applyBookingDecision('pending', action)` (always
   succeeds at this point — step 2 already proved the booking is `pending`).
6. **DB commit**: `updateBookingStatus(db, bookingId, nextStatus)`. For
   `propose_another_time` ONLY, additionally: `updateRequestState(db,
   requestId, 'proposing')` and persist the admin's validated `slots` into
   `requests.offered_slots` (Decision 4.2) — the exact mechanism a
   lead-initiated proposal would have used, so the lead's next `pick_slot`
   tap/tool-call works unmodified.
7. **INSERT the notification row** (Decision 1) with `kind` matching the
   action and `payload` composed by `lib/src/booking/copy.ts` (Decision 3) —
   `proposed_again`'s payload includes the `buttons` array
   (`SendMessageOptions.buttons`, already supported by `TelegramTransport`
   and unused until now) so the drain loop (Decision 1) can render real
   slot-chip taps, closing S2's own named "inline-button rendering... owned
   by S4" gap for this message.
8. **Republish the dashboard-scoped `STATE_SNAPSHOT`** (Decision 6, items 1
   and 3) — a fresh `readDashboardSnapshot` + `publish({type:"STATE_SNAPSHOT",
   threadId:"dashboard", snapshot})` on the SAME in-process hub the SSE route
   already reads from (`apps/dashboard/lib/agui-hub.ts`), so every connected
   dashboard tab sees the HallMap/queue update without a reload.
9. **Respond** `200 {status:"applied", ...}`.

Every abort path (`stale`/`conflict`/`invalid`/`unavailable`) returns BEFORE
step 5 — no partial commit is ever possible, matching every one of the
baseline spec's "Calendar synchronization" scenarios one-to-one.

### Decision 6: the four S3 carryovers, each discharged by a named mechanism

Quoting each finding's own title verbatim from
`openspec/changes/archive/2026-07-06-dashboard/review-findings.json`:

1. **"BOOKING_PENDING for a request created AFTER the dashboard connected is
   dropped by the `knownRequestIds` gate"** — discharged WITHOUT any client
   reducer change. `apps/dashboard/lib/agui-client.ts` already replaces
   `state.dashboard` wholesale whenever a `STATE_SNAPSHOT` arrives with
   `threadId === "dashboard"` (verified: the SSE route's own on-connect
   frame already uses this exact sentinel). This change makes the ingest
   route (`apps/dashboard/app/api/agui/ingest/route.ts`) do the SAME
   re-read-and-republish whenever it forwards a `CUSTOM`/`BOOKING_PENDING`
   event — the bot's pipeline publishes `BOOKING_PENDING` the moment
   `HoldStorePort.holdSlot` succeeds (Decision 2), the ingest route forwards
   it AND calls `readDashboardSnapshot` + `publish({type:"STATE_SNAPSHOT",
   threadId:"dashboard", ...})` right after, so the new numeric request id
   is "known" the instant any connected dashboard tab re-renders — no new
   client-side registration logic to get wrong.
2. **"Delete-lead is not idempotent across >1 pending booking... a retry
   re-attempts the already-deleted event"** — `lib/src/slots/hold.ts`'s
   `releaseHold` (the ONE shared function every delete path already calls —
   the leads-delete route, the decision route's decline/re-propose path, and
   the cancel path) now catches a `CalendarApiError` whose `status` is `404`
   or `410` and treats it as an already-satisfied delete rather than a
   failure — verified against `packages/calendar/src/google-calendar.ts`'s
   `mapCalendarError`, which already threads the real HTTP status onto
   `CalendarApiError.status`. One fix, one call site, every caller benefits.
3. **"HallMap does not update a seat's color/clickability in real time...
   only... a full dashboard-scoped `STATE_SNAPSHOT`"** — discharged by the
   SAME mechanism as item 1, plus the decision route's own step 8
   (Decision 5): every live event that can change a `bookings.status`
   (a new hold, a confirm/decline/re-propose) now triggers exactly one
   dashboard-scoped `STATE_SNAPSHOT` republish, in-process for the decision
   route and via the ingest route for the bot's hold-creation event — no
   seat-level diffing needed, matching S3's own "replaced wholesale" design.
4. **"`dashboard-state.dateAndHourOf` slices `slot_start` assuming a
   Europe/Kyiv wall-clock offset... a UTC/Z-formatted `slot_start`... would
   mis-bucket HallMap seats"** — discharged by contract, not by changing
   `dashboard-state.ts`: `HoldStorePort.holdSlot` (Decision 2) is the FIRST
   live code that ever writes `bookings.slot_start`/`slot_end` (confirmed —
   no other caller exists yet), and it writes the `OfferedSlot`'s own
   `start`/`end` strings verbatim (already Kyiv wall-clock local, `Slot`'s
   own shape from `grid.ts`) — never converted to UTC. A new
   `bookings.test.ts`/integration assertion pins "`slot_start` written by
   `insertBooking` never carries a `Z` suffix or a numeric UTC offset" so a
   future regression fails loudly instead of silently mis-bucketing a seat.

## Risks / Trade-offs

- **[Risk]** The outbox drain timer polls on a fixed short interval rather
  than reacting instantly to a new row (unlike the AG-UI hub's push model).
  → **Mitigation:** single-teacher volume (a handful of decisions per day)
  makes a few seconds of latency invisible in practice; NFR-UX-01's own
  latency budget is about the intake conversation, not decision-to-notify.
  If the demo shows a visibly slow notification, tightening the interval is
  a one-line change, not a redesign.
- **[Risk]** `propose_slots`' schema change (Decision 2) deviates from S2's
  own shipped comment claiming a parameterless trigger is sufficient — a
  reviewer skimming only that old comment could flag this as scope creep.
  → **Mitigation:** recorded here explicitly with the concrete type
  mismatch that makes the original claim unworkable (`Preferences`' structured
  shape vs. free-text `IntakeFields` columns); `tasks.md` cites this decision
  by number at the exact task that edits `tools.ts`.
- **[Risk]** Two new `LoopPorts` members (`slots`, `holdStore`) grow the
  interface every `FakeModelPort`-based test must now satisfy.
  → **Mitigation:** both are narrow, single-purpose interfaces (one/two
  methods each) with obvious fakes (`FakeSlotsPort`/`FakeHoldStorePort`,
  mirroring `fake-calendar.ts`'s own shape) — no wider than
  `BookingStorePort` already is.
- **[Risk]** `requests.offered_slots` is the first JSON-in-TEXT column in
  this schema (every other column is a scalar) — a malformed/legacy-`NULL`
  value must never throw when read back.
  → **Mitigation:** the read-side helper defensively `JSON.parse`s inside a
  try/catch, treating a parse failure identically to `NULL` (no offered
  slots known) — never propagating a raw exception into `rowToIntakeState`.
- **[Risk]** The idempotent-delete fix (Decision 6, item 2) changes
  `releaseHold`'s contract for every existing caller (S1's own hold-cancel
  path, S3's leads-delete route), not just this slice's new ones.
  → **Mitigation:** the change is strictly *more* permissive (a 404/410 that
  used to throw now resolves), so no existing GREEN test that expects a
  successful delete can regress; a new `hold.test.ts` case pins the
  previously-untested 404/410 path explicitly, and the full S1/S3 suites are
  re-run as part of this slice's own validation gate before archive.
