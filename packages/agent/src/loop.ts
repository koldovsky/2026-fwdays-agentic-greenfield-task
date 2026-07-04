// TYPED THROWING STUB — red state for tasks.md section 4 (4.4's red half).
// The signatures and types below are the CONTRACT pinned by loop.test.ts;
// the body is implemented in tasks.md section 4's green half. No logic
// lives here yet — `runIntakeTurn`'s body is a single Not-implemented
// throw (same convention as the section-2/3 red rounds: age.ts, format.ts,
// state-machine.ts before their own green passes).
//
// PINNED LOOP CONTRACT (design.md Decisions 1-3, ADR-0001 §5 analog):
//
//   Inputs: `LoopInput = { state: IntakeState, message: string, ports:
//   LoopPorts }`.
//     - `state`: the CURRENT `IntakeState` (conversationState + fields) for
//       this `requests` row, as produced by
//       `@kamerton/lib/src/intake/state-machine.ts`'s `transition()` /
//       `initialIntakeState()` (owned by a parallel slice, section 2/3 —
//       already green). This module never constructs its own `IntakeState`
//       shape; it composes the reducer.
//     - `message`: the lead's raw free-text Telegram message for this turn.
//       The BOT layer (design.md Decision 3) is the one that decides
//       whether a turn reaches this loop at all — a button-callback update
//       resolves without ever calling `runIntakeTurn` (Decision 3's
//       "resolve without an agent call"). By the time this function is
//       called, the caller has already committed to a model round trip.
//     - `ports.model`: a `ModelPort` (model-port.ts) — `AnthropicModelPort`
//       in production, `FakeModelPort` (testing/fake-model-port.ts) in
//       tests. This loop calls `ports.model.send(messages, TOOLS,
//       MODEL_CONFIG)` — ALWAYS with the fixed `MODEL_CONFIG` (thinking
//       disabled, claude-sonnet-5, `@trace TC-STACK-02`,
//       `@trace NFR-UX-01`) and ALWAYS with `tools.ts`'s closed `TOOLS`
//       list — never a subset, never an ad hoc list assembled per call.
//     - `ports.persistence`: a `PersistencePort` — the one seam this loop
//       uses to make a validator-approved field save or conversation-state
//       move durable (design.md Decision 1's `requests` row), independent
//       of what the model's accompanying text claims happened (ADR-0001
//       §5's "question logging is deterministic, not model-discretionary"
//       principle, applied here to field-saving: EVERY successful
//       `transition()` call this loop makes is followed by the matching
//       `ports.persistence` write, unconditionally).
//     - `ports.bookingStore`: a `BookingStorePort` — the seam this loop uses
//       to find and update the `bookings` row backing the CURRENT request's
//       hold, needed only by the `cancel_request` tool (FR-INTAKE-07: a
//       lead's cancellation must also release the calendar hold and mark
//       the booking `cancelled`, not just move the conversation state to
//       `done`).
//     - `ports.releaseHold`: a `ReleaseHoldFn` — a holdWithRecovery-like
//       release function `(calendarEventId: string) => Promise<void>`, the
//       loop's only way to delete a tentative calendar event (mirrors
//       `@kamerton/lib/src/slots/hold.ts`'s `releaseHold(port, eventId)`
//       shape, but pre-bound to a concrete `CalendarPort` by the caller so
//       this package never imports the slots `CalendarPort` type directly —
//       booking/calendar concerns stay behind the two named ports).
//
//   Output: `LoopResult = { reply: string, state: IntakeState, toolCalls:
//   ToolCallLogEntry[] }`.
//     - `reply`: the Ukrainian reply TEXT ONLY — no keyboard/buttons. The
//       bot pipeline (design.md Decision 3, packages/bot, a later slice)
//       decides whether to wrap this text in an inline keyboard for the
//       current state (slot chips at `proposing`, format/goal option
//       buttons at `qualifying`/`profiling`) — this loop must not assume a
//       callback is the only path back in, and never renders Telegram
//       markup itself.
//     - `state`: the resulting `IntakeState` AFTER this turn — the same
//       `IntakeState` the reducer returned (or, for the off-topic
//       pass-through case, the SAME REFERENCE as the input `state`, since
//       `transition()` is never called at all for it — tasks.md 4.4's third
//       bullet, `@trace FR-GUARD-05`).
//     - `toolCalls`: the DETERMINISTIC tool-call log for this turn — one
//       `ToolCallLogEntry` per tool-use block the model's response
//       contained, appended REGARDLESS of the model's accompanying text
//       (tasks.md 4.4's first bullet, ADR-0001 §5 analog). A plain-text
//       (no tool-use) response produces an EMPTY `toolCalls` array, not an
//       absent one.
//
//   Behavioural contract this stub pins for loop.test.ts (4.4) to assert
//   against, once implemented:
//     1. A `save_name` tool-use block always calls `transition()` with a
//        `save_name` event and appends a `ToolCallLogEntry` with
//        `outcome: "applied"` — regardless of what the response's `text`
//        block (if any) narrates.
//     2. A `save_format` tool-use block carrying `"instrument"` (a model
//        that ignores its own schema enum, or a compromised call) is STILL
//        rejected by `transition()`'s own `validateFormat` call before any
//        state mutation reaches `ports.persistence` — defense in depth
//        (`@trace FR-INTAKE-02`, `@trace BC-SCOPE-01`, `@trace BC-SCOPE-02`).
//        The resulting `ToolCallLogEntry.outcome` is `"detour"`, carrying
//        `detour: "scope_violation"`.
//     3. A plain-text (no tool-use) response is passed straight through to
//        `reply`; `transition()` is NEVER invoked; `state` in the result is
//        the SAME REFERENCE as the input `state` (`@trace FR-GUARD-05`).
//        This is how off-topic steering is proven structurally, per
//        design.md Decision 1: no mutation call happened, rather than
//        "returned to the same state" being asserted by value only.
//     4. A `cancel_request` tool-use block drives BOTH: (a) a `transition()`
//        call with a `cancel` event, moving `conversationState` to `done`;
//        AND (b) the booking-release orchestration —
//        `ports.bookingStore.findPendingBookingForCurrentRequest()`, then
//        (if one exists) `ports.releaseHold(calendarEventId)` followed by
//        `ports.bookingStore.markBookingCancelled(bookingId)`
//        (`@trace FR-INTAKE-07`).
//     5. An `amend_field` tool-use block (e.g. `studentAge` 6 -> 7) calls
//        `transition()` with the matching `amend` event AND, once the
//        reducer accepts the new value, calls
//        `ports.persistence.saveFields({ studentAge: 7 })` — the persisted
//        row reflects only the validator-approved value, never the model's
//        raw claim (`@trace FR-INTAKE-07`).
//     6. Every `ports.model.send()` call this loop makes carries
//        `MODEL_CONFIG` (thinking disabled, `claude-sonnet-5`) as its third
//        argument, unconditionally (`@trace TC-STACK-02`,
//        `@trace NFR-UX-01`).
//     7. When `ports.model.send()` REJECTS (an Anthropic API failure), this
//        function does NOT let the rejection propagate: it returns
//        `{ reply: APOLOGY, state: <the SAME input state, unchanged>,
//        toolCalls: [] }`, where `APOLOGY` is `apology.ts`'s
//        `ANTHROPIC_UNAVAILABLE_APOLOGY` constant (tasks.md 4.5,
//        `@trace NFR-REL-01`) — no crash, the lead's turn is not lost, the
//        conversation resumes exactly where it left off on the next
//        message.

import type { ModelConfig, ModelPort } from "./model-port.ts";
import type {
  ConversationState,
  Detour,
  IntakeFields,
  IntakeState,
  TransitionErrorCode,
} from "@kamerton/lib/src/intake/state-machine.ts";

/** The seam this loop uses to make a validator-approved field save or
 *  conversation-state move durable (design.md Decision 1's `requests` row).
 *  The concrete implementation (a later, non-`lib/` task) maps `saveFields`
 *  onto `@kamerton/db/src/requests.ts`'s `updateRequestFields` (camelCase ->
 *  snake_case column mapping happens at THAT boundary, not in this loop) and
 *  `saveState` onto `updateRequestState`. Kept as a narrow port rather than
 *  a direct `@kamerton/db` dependency so `loop.test.ts` never touches SQLite
 *  (design.md Decision 5's testing-seam discipline, mirrored from
 *  `CalendarPort`). */
export interface PersistencePort {
  /** Persist a partial field patch — the exact validator-approved values
   *  `transition()` just accepted (a `save_*` completion or a successful
   *  `amend`), never the model's raw, unvalidated claim. */
  saveFields(patch: Partial<IntakeFields>): Promise<void>;
  /** Persist a new `conversationState` (a `transition()` result). */
  saveState(state: ConversationState): Promise<void>;
}

/** The minimal shape of a `pending` booking row this loop needs to drive the
 *  `cancel_request` orchestration — a narrow projection of
 *  `@kamerton/db/src/bookings.ts`'s `BookingRow`, not that type itself (same
 *  "no direct `@kamerton/db` dependency from this package" discipline as
 *  `PersistencePort`). */
export interface PendingBooking {
  id: number;
  calendarEventId: string | null;
}

/** The seam this loop uses to find and update the `bookings` row backing the
 *  CURRENT request's hold (FR-INTAKE-07's cancellation path only — this
 *  loop never creates or confirms a booking; that guardrail is structural,
 *  not just a naming convention, per FR-GUARD-01). */
export interface BookingStorePort {
  /** The pending booking tied to the request this loop turn is running
   *  against, if the lead ever reached a hold (`undefined` if not — a
   *  `cancel_request` before `awaiting_admin` is still a valid
   *  conversation-state `cancel`, just with no booking to release). */
  findPendingBookingForCurrentRequest(): Promise<PendingBooking | undefined>;
  /** Moves the given booking row to `cancelled` (FR-INTAKE-07) — this port
   *  intentionally exposes no other status transition; `confirmed`/
   *  `declined` belong to the dashboard's admin handler only
   *  (`@trace FR-GUARD-01`, ADR-0001 §3). */
  markBookingCancelled(bookingId: number): Promise<void>;
}

/** A holdWithRecovery-like release function, pre-bound by the caller to a
 *  concrete `CalendarPort` (mirrors
 *  `@kamerton/lib/src/slots/hold.ts`'s `releaseHold(port, eventId)` shape
 *  with the port already partially applied) — this package never imports
 *  the slots `CalendarPort` type directly. */
export type ReleaseHoldFn = (calendarEventId: string) => Promise<void>;

/** Every external dependency `runIntakeTurn` needs for one turn, bundled so
 *  the function signature stays a clean `(state, message, ports)` shape
 *  rather than an ever-growing positional-argument list. */
export interface LoopPorts {
  model: ModelPort;
  persistence: PersistencePort;
  bookingStore: BookingStorePort;
  releaseHold: ReleaseHoldFn;
}

export interface LoopInput {
  state: IntakeState;
  message: string;
  ports: LoopPorts;
}

/** How a single tool-use block resolved once run through the reducer
 *  (defense in depth: a syntactically valid tool call is not automatically
 *  an applied one). */
export type ToolCallOutcome = "applied" | "rejected" | "detour";

/** One deterministic log entry per tool-use block the model's response
 *  contained, appended by the loop itself (ADR-0001 §5 analog) —
 *  independent of the model's own narration. */
export interface ToolCallLogEntry {
  tool: string;
  input: unknown;
  outcome: ToolCallOutcome;
  detour?: Detour | null;
  error?: TransitionErrorCode;
}

export interface LoopResult {
  reply: string;
  state: IntakeState;
  toolCalls: ToolCallLogEntry[];
}

/** Re-exported purely so tests can reference the exact config type this
 *  loop's `ModelPort.send()` calls are pinned to (tasks.md 4.4's final
 *  bullet) without importing `model-port.ts` twice under two names. */
export type { ModelConfig };

/**
 * Runs one turn of the intake conversation: sends the lead's message (plus
 * whatever transcript/tool-result history the caller maintains) to the
 * model via `ports.model.send()` with the closed `TOOLS` list and the fixed
 * `MODEL_CONFIG`, dispatches any tool-use blocks in the response through
 * `@kamerton/lib/src/intake/state-machine.ts`'s `transition()` (never
 * trusting the model's own narration over the reducer's verdict), persists
 * validator-approved changes via `ports.persistence`, orchestrates
 * `cancel_request`'s booking-release side effect via `ports.bookingStore`/
 * `ports.releaseHold`, and returns the Ukrainian reply text, the resulting
 * `IntakeState`, and the deterministic tool-call log for this turn.
 *
 * See this file's header comment for the full pinned contract (tasks.md
 * 4.4's six behavioural bullets) — this is a TYPED THROWING STUB; the body
 * is implemented in tasks.md section 4's green half.
 */
export async function runIntakeTurn(input: LoopInput): Promise<LoopResult> {
  void input; // referenced only to keep the pinned signature lint-clean while unimplemented
  throw new Error("Not implemented");
}
