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

import type {
  ContentBlock,
  ModelConfig,
  ModelMessage,
  ModelPort,
  TextBlock,
  ToolUseBlock,
} from "./model-port.ts";
import { MODEL_CONFIG } from "./model-port.ts";
import { TOOLS } from "./tools.ts";
import { ANTHROPIC_UNAVAILABLE_APOLOGY } from "./apology.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { transition } from "@kamerton/lib/src/intake/state-machine.ts";
// Reused rather than duplicated (review-gate finding #4): the exact
// deterministic Ukrainian "couldn't reach the calendar/schedule" apology S1
// `slots/propose.ts` already ships (NFR-REL-01, BC-LANG-01, BC-BRAND-01) is
// also the right copy for a Calendar failure surfacing through this loop's
// own `cancel_request` booking-release orchestration.
import { CALENDAR_UNAVAILABLE_APOLOGY } from "@kamerton/lib/src/slots/propose.ts";
import type {
  AmendableField,
  CandidateFormat,
  ConversationState,
  Detour,
  GoalTag,
  IntakeEvent,
  IntakeFields,
  IntakeState,
  TransitionErrorCode,
  TransitionResult,
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
export type ToolCallOutcome = "applied" | "rejected" | "detour" | "pass_through";

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
 * 4.4's six behavioural bullets, implemented below).
 */
export async function runIntakeTurn(input: LoopInput): Promise<LoopResult> {
  const { state, message, ports } = input;
  // Review-gate remediation ("the model never receives a system prompt or
  // any conversation context — each turn is context-free", CRITICAL): the
  // ONLY thing this loop currently threads through as prior-turn history is
  // the deterministic `IntakeState` (conversationState + validator-approved
  // `fields`) it was handed — the persisted `requests` row IS this slice's
  // conversation memory, per design.md Decision 1/4. `buildSystemPrompt`
  // (system-prompt.ts) turns that state into the model's dynamic context
  // EVERY turn, alongside the static voice/guardrail block. `messages`
  // itself stays a single current-turn user message: replaying a VERBATIM
  // prior-turn transcript on top of the state summary (e.g. the model's own
  // previous reply text) would need a message log this slice's schema does
  // not have (design.md Decision 4 has no such table) — that is a deferred
  // follow-up for a later hardening pass, not invented here. In practice
  // this is a low-risk deferral: the state summary already names exactly
  // which field is missing and what has been collected, so the model does
  // not need its own prior turn replayed to know what to ask next.
  const system = buildSystemPrompt(state);
  const messages: ModelMessage[] = [{ role: "user", content: message }];

  let response;
  try {
    // ALWAYS the closed TOOLS list and the fixed MODEL_CONFIG — never a
    // subset, never a call-site override (tasks.md 4.4's sixth bullet,
    // `@trace TC-STACK-02`, `@trace NFR-UX-01`) — and now ALWAYS the
    // state-derived `system` prompt (never omitted, never call-site
    // optional).
    response = await ports.model.send(messages, TOOLS, MODEL_CONFIG, system);
  } catch {
    // Only a model-port failure is caught here — validation errors are
    // results (TransitionResult.error), never exceptions, and are handled
    // below via the reducer's own return value, not a catch block
    // (`@trace NFR-REL-01`).
    return { reply: ANTHROPIC_UNAVAILABLE_APOLOGY, state, toolCalls: [] };
  }

  const toolUseBlocks = response.content.filter(isToolUseBlock);
  const narratedText = response.content.filter(isTextBlock).map((block) => block.text).join("\n");

  if (toolUseBlocks.length === 0) {
    // FR-GUARD-05: a plain-text (off-topic-shaped or otherwise) response
    // never reaches transition() — the SAME state reference is returned so
    // callers can prove structurally that no mutation happened at all.
    return { reply: narratedText, state, toolCalls: [] };
  }

  let currentState = state;
  const toolCalls: ToolCallLogEntry[] = [];
  for (const block of toolUseBlocks) {
    let applied: AppliedToolUse;
    try {
      // Review-gate finding #4 (CRITICAL/MAJOR): `applyToolUse` calls out to
      // `ports.persistence`/`ports.bookingStore`/`ports.releaseHold` — real
      // I/O in production (a DB write, a Google Calendar call during the
      // `cancel_request` booking-release orchestration). None of those are
      // guaranteed to succeed; letting a rejection here propagate out of
      // `runIntakeTurn` would crash the bot for every lead on a transient
      // Calendar/DB failure (`@trace NFR-REL-01`). Caught narrowly around
      // exactly this dispatch (never swallowing a `transition()` bug —
      // `transition()` itself is synchronous and never throws; only the
      // port calls this loop awaits can reject).
      applied = await applyToolUse(block, currentState, ports);
    } catch (error) {
      console.error("Kamerton: tool-use dispatch failed (persistence/booking-release)", error);
      // Bail out of the remaining tool-use blocks for this turn — the
      // caller's own DB writes for anything already applied earlier in this
      // loop stand (unaffected by this catch), and `currentState` (the
      // state as of the LAST successfully applied block, unchanged if this
      // is the first) is returned unmutated, so the conversation resumes
      // exactly where it last stood, same "state preserved" guarantee as
      // the `ports.model.send()` failure path above.
      return { reply: CALENDAR_UNAVAILABLE_APOLOGY, state: currentState, toolCalls };
    }
    currentState = applied.state;
    toolCalls.push(applied.logEntry);
  }

  return { reply: narratedText, state: currentState, toolCalls };
}

function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use";
}

function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === "text";
}

/** Maps one tool-use block onto the reducer's closed `IntakeEvent` set.
 *  `explain_scope`/`explain_format` (deterministic, stateless explanations)
 *  and any tool this loop's pinned `LoopPorts` does not yet wire a reducer
 *  event for (`propose_slots`/`request_hold` — they need a `CalendarPort`
 *  seam this contract does not expose, a later task) return `null`: they
 *  never reach `transition()`, by design, not by omission. */
function toIntakeEvent(block: ToolUseBlock): IntakeEvent | null {
  const input = block.input;
  switch (block.name) {
    case "save_name":
      return { type: "save_name", name: input.name as string };
    case "save_age":
      return { type: "save_age", age: input.age as number };
    case "save_format":
      return { type: "save_format", format: input.format as CandidateFormat };
    case "save_goal":
      return {
        type: "save_goal",
        goalTag: input.goalTag as GoalTag,
        goalText: input.goalText as string,
      };
    case "skip_goal":
      return { type: "skip_goal" };
    case "save_tastes":
      return {
        type: "save_tastes",
        tastes: input.tastes as string,
        ...(input.dreamSong !== undefined ? { dreamSong: input.dreamSong as string } : {}),
      };
    case "skip_tastes":
      return { type: "skip_tastes" };
    case "save_experience_comfort":
      return {
        type: "save_experience_comfort",
        experience: input.experience as string,
        comfort: input.comfort as string,
      };
    case "save_weekdays":
      return { type: "save_weekdays", weekdays: input.weekdays as string };
    case "save_time_range":
      return { type: "save_time_range", timeRange: input.timeRange as string };
    case "amend_field":
      // The per-field discriminated `AmendEvent` shape is enforced at
      // runtime by `transition()`'s own field-by-field handling (and, for
      // `studentAge`, `validateAge`) — defense in depth, same as
      // `save_format`'s schema-enum-plus-validator pattern (tasks.md 4.4's
      // second bullet). The model's own tool schema enum already constrains
      // `field` to a real `AmendableField`.
      return {
        type: "amend",
        field: input.field as AmendableField,
        value: input.value,
      } as unknown as IntakeEvent;
    case "cancel_request":
      return { type: "cancel" };
    default:
      return null;
  }
}

/** The validator-approved field patch to persist for a successfully applied
 *  event — always read back off the reducer's OWN resulting `fields`, never
 *  the model's raw tool input, so a persisted row can never reflect a value
 *  the reducer itself rejected or renormalized away from (design.md
 *  Decision 2's "deterministic tool-result logging"). Returns `null` for
 *  events with no field to persist (`skip_*`, `cancel`). */
function fieldPatchForEvent(event: IntakeEvent, fields: IntakeFields): Partial<IntakeFields> | null {
  switch (event.type) {
    case "save_name":
      return { studentName: fields.studentName };
    case "save_age":
      return { studentAge: fields.studentAge };
    case "save_format":
      return { format: fields.format };
    case "save_goal":
      return { goalTag: fields.goalTag, goalText: fields.goalText };
    case "save_tastes":
      return fields.dreamSong !== undefined
        ? { tastes: fields.tastes, dreamSong: fields.dreamSong }
        : { tastes: fields.tastes };
    case "save_experience_comfort":
      return { experience: fields.experience, comfort: fields.comfort };
    case "save_weekdays":
      return { preferredWeekdays: fields.preferredWeekdays };
    case "save_time_range":
      return { preferredTimeRange: fields.preferredTimeRange };
    case "amend":
      return { [event.field]: fields[event.field] } as Partial<IntakeFields>;
    default:
      return null;
  }
}

interface AppliedToolUse {
  state: IntakeState;
  logEntry: ToolCallLogEntry;
}

/** Runs one tool-use block through the reducer (or, for `explain_*`/
 *  not-yet-wired tools, past it entirely), persists validator-approved
 *  changes, and orchestrates `cancel_request`'s booking-release side effect
 *  — the loop's own deterministic tool-result log entry (ADR-0001 §5
 *  analog) is built here, independent of the model's narration. */
async function applyToolUse(
  block: ToolUseBlock,
  state: IntakeState,
  ports: LoopPorts,
): Promise<AppliedToolUse> {
  const event = toIntakeEvent(block);
  if (event === null) {
    // Review-gate finding #5 (MINOR): `explain_scope`/`explain_format`/
    // `propose_slots`/`request_hold` (and any tool this pinned `LoopPorts`
    // contract does not yet wire an event for) never reach `transition()`
    // at all — nothing was ever offered to the reducer to accept or reject,
    // so this is NOT "applied" (that label is reserved for a genuine
    // reducer-approved mutation). "pass_through" names what actually
    // happened: the tool call was logged and passed straight through.
    return {
      state,
      logEntry: { tool: block.name, input: block.input, outcome: "pass_through" },
    };
  }

  const result: TransitionResult = transition(state, event);
  const stateChanged = result.state.conversationState !== state.conversationState;
  if (stateChanged) {
    await ports.persistence.saveState(result.state.conversationState);
  }

  let outcome: ToolCallOutcome;
  if (result.error !== undefined) {
    outcome = "rejected";
  } else if (result.detour) {
    outcome = "detour";
  } else {
    outcome = "applied";
    const patch = fieldPatchForEvent(event, result.state.fields);
    if (patch !== null) {
      await ports.persistence.saveFields(patch);
    }
  }

  // FR-INTAKE-07: a successfully applied cancel also releases the calendar
  // hold and marks the booking cancelled — a conversation-state move alone
  // is not enough.
  if (event.type === "cancel" && outcome === "applied") {
    const pending = await ports.bookingStore.findPendingBookingForCurrentRequest();
    if (pending !== undefined) {
      if (pending.calendarEventId !== null) {
        await ports.releaseHold(pending.calendarEventId);
      }
      await ports.bookingStore.markBookingCancelled(pending.id);
    }
  }

  const logEntry: ToolCallLogEntry = {
    tool: block.name,
    input: block.input,
    outcome,
    ...(result.detour ? { detour: result.detour } : {}),
    ...(result.error !== undefined ? { error: result.error } : {}),
  };

  return { state: result.state, logEntry };
}
