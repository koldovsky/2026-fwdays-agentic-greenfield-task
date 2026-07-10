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
import { TOOLS, TOOL_NAMES } from "./tools.ts";
import { ANTHROPIC_UNAVAILABLE_APOLOGY, QUESTION_LOGGING_UNAVAILABLE_APOLOGY } from "./apology.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { transition } from "@kamerton/lib/src/intake/state-machine.ts";
// Reused rather than duplicated (review-gate finding #4): the exact
// deterministic Ukrainian "couldn't reach the calendar/schedule" apology S1
// `slots/propose.ts` already ships (NFR-REL-01, BC-LANG-01, BC-BRAND-01) is
// also the right copy for a Calendar failure surfacing through this loop's
// own `cancel_request` booking-release orchestration.
import { CALENDAR_UNAVAILABLE_APOLOGY } from "@kamerton/lib/src/slots/propose.ts";
// Conversational-flow bugfix (live Telegram testing, S2 intake): one model
// call per user message, and `ClaudeAgentModelPort` captures the model's
// first tool_use via `canUseTool` and aborts BEFORE the model ever narrates
// a follow-up question — a bare `save_*`/`skip_*`/`amend_field` tool-use
// response therefore (almost) never carries accompanying text. The CODE, not
// the model, must own asking the next question so the conversation can never
// stall on "Дякую, я це записала." with nothing to answer next. See
// `assembleReply`, below, for the reply-assembly rule this drives.
import { DEFAULT_ACK_COPY, nextLeadFacingStep } from "@kamerton/lib/src/intake/questions.ts";
// booking-hitl design.md Decision 2's sub-decision (tasks.md C.3): the model
// re-extracts a structured weekdays/timeWindow value into the propose_slots
// tool call; this validator is the code-side defense-in-depth check that
// runs BEFORE ports.slots.proposeSlots is ever called, exactly like
// save_format's schema-plus-validator pattern.
import { validatePreferences } from "@kamerton/lib/src/booking/validate-preferences.ts";
import type {
  AmendableField,
  CandidateFormat,
  ConversationState,
  Detour,
  GoalTag,
  IntakeEvent,
  IntakeFields,
  IntakeState,
  OfferedSlot,
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

/** booking-hitl design.md Decision 2 (tasks.md C.2, TYPE CONTRACT ONLY —
 *  `applyToolUse`'s `propose_slots` branch is wired in tasks.md C.3's green
 *  half, not here). The seam this loop uses for the `propose_slots` tool —
 *  wraps S1's `proposeSlots`, pre-bound to a concrete `CalendarPort` and the
 *  request's own horizon by the caller (`packages/bot/src/pipeline.ts`), so
 *  this package never imports the slots `CalendarPort` type (unchanged
 *  rule, verified: `input`/the result both use plain structural shapes —
 *  `OfferedSlot`, never `CalendarPort`). `validatePreferences`
 *  (`@kamerton/lib/src/booking/validate-preferences.ts`) runs BEFORE this
 *  port is ever called (defense in depth, same shape as `save_format`'s
 *  schema-plus-validator pattern). */
export interface SlotsPort {
  proposeSlots(input: {
    weekdays: string[];
    timeWindow: { start: string; end: string };
    /** A concrete "YYYY-MM-DD" the lead named (e.g. "завтра" resolved against
     *  today). When present, slots are proposed for THAT day; the adapter
     *  (pipeline) validates it against today's horizon and ignores an
     *  invalid/out-of-range value, falling back to `weekdays`. */
    date?: string;
  }): Promise<
    | { status: "ok"; slots: OfferedSlot[] }
    | { status: "no_free_times" }
    | { status: "unavailable"; apology: string }
  >;
}

/** booking-hitl design.md Decision 2 (tasks.md C.2, TYPE CONTRACT ONLY — see
 *  `SlotsPort`'s own comment above). The seam this loop uses for the
 *  `request_hold` tool — wraps S1's `holdWithRecovery` PLUS the
 *  pending-booking DB insert (with `request_id`) as one atomic-from-the-
 *  caller's-view step. Deliberately a SEPARATE interface from
 *  `BookingStorePort` (cancel-only, unchanged) — this is an INSERT of a new
 *  `pending` row, never a confirm, so inspecting `BookingStorePort` alone
 *  still proves "no create/confirm method exists on it"
 *  (`@trace FR-GUARD-01`'s structural assertion is unchanged by this port's
 *  existence). */
export interface HoldStorePort {
  holdSlot(
    slotIndex: number,
    offeredSlots: OfferedSlot[],
  ): Promise<
    { status: "held"; bookingId: number } | { status: "collision" } | { status: "unavailable"; apology: string }
  >;
}

/** kb-learning design.md Decision 4 (tasks.md C.7, TYPE CONTRACT ONLY — the
 *  `applyToolUse` `answer_faq`/`log_question` branches that actually CALL
 *  this port are wired in tasks.md C.9's GREEN half, not here). The seam
 *  this loop uses for the two logging-only KB tools: a question can be
 *  asked in ANY `conversationState`, so this is dispatched in
 *  `applyToolUse`, NOT `transition()` — mirrors `SlotsPort`/`HoldStorePort`'s
 *  own "narrow port, pre-bound by the caller to the current turn's row
 *  context" shape. Deliberately carries NO answer/content parameter on
 *  either method — the model's own narrated reply text is what may contain
 *  the answer; these methods only ever receive the LEAD'S question text,
 *  never anything the model claims as an answer (`@trace FR-GUARD-06`). */
export interface QuestionsPort {
  /** The lead's question was answered from the KB this turn (`answer_faq`
   *  tool call) — logs a `questions` row with `answer_source = 'kb'`. */
  logAnsweredFromKb(question: string): Promise<void>;
  /** The lead's question was NOT covered by the KB this turn (`log_question`
   *  tool call) — logs a `questions` row with `answer_source =
   *  'unanswered'`, `status = 'open'`. */
  logUnanswered(question: string): Promise<void>;
}

/** Every external dependency `runIntakeTurn` needs for one turn, bundled so
 *  the function signature stays a clean `(state, message, ports)` shape
 *  rather than an ever-growing positional-argument list. */
export interface LoopPorts {
  model: ModelPort;
  persistence: PersistencePort;
  bookingStore: BookingStorePort; // UNCHANGED — still cancel-only (`@trace FR-GUARD-01`)
  releaseHold: ReleaseHoldFn;
  slots: SlotsPort; // NEW — booking-hitl design.md Decision 2 (tasks.md C.2)
  holdStore: HoldStorePort; // NEW — booking-hitl design.md Decision 2 (tasks.md C.2)
  // kb-learning design.md Decision 4 (tasks.md C.7) — OPTIONAL so every
  // existing caller/test (which never constructs a QuestionsPort) keeps
  // compiling unchanged; `applyToolUse`'s C.9 GREEN half is the only place
  // that will ever read it.
  questions?: QuestionsPort;
}

export interface LoopInput {
  state: IntakeState;
  message: string;
  ports: LoopPorts;
  // kb-learning design.md Decision 1 (tasks.md C.5's KB-read-wiring choice):
  // OPTIONAL, defaulting to `""` — every existing caller/test that never
  // passes this field keeps compiling and behaving byte-for-byte identically
  // (`buildSystemPrompt(state, "")`, an explicitly-empty KB block, exactly
  // this module's pre-kb-learning behaviour). The PRODUCTION caller
  // (`packages/bot/src/pipeline.ts`) is the one that actually calls
  // `readKnowledgeBaseText(DEFAULT_KNOWLEDGE_BASE_PATH)` fresh, once per
  // turn, and threads the result in here — NOT this module itself. Reading
  // the real repo-root `knowledge/school.md` path directly inside this
  // package's own `runIntakeTurn` would make `loop.test.ts` non-deterministic
  // (its outcome would silently depend on whatever that file's on-disk
  // content happens to be at test-run time, including a file that does not
  // exist yet today but will after tasks.md E.9 seeds one) — threading the
  // text in from the caller keeps this package's own unit tests hermetic
  // while still satisfying design.md Decision 1's "fresh per turn, no bot
  // restart needed" requirement at the one place (`pipeline.ts`) that owns
  // real filesystem I/O for this concern.
  kbText?: string;
  // Conversation-history slice: the recent prior turns (oldest-first),
  // replayed to the model BEFORE this turn's `message`. OPTIONAL, defaulting
  // to `[]` — every existing caller/test that never passes it keeps behaving
  // byte-for-byte identically (a single current-turn user message). The
  // PRODUCTION caller (`packages/bot/src/pipeline.ts`) reads the tail of the
  // `messages` table for the current request and threads it in here; this
  // package's own unit tests stay hermetic (empty history unless a test
  // supplies one explicitly). This is what lets the model accumulate facts a
  // lead gives across several terse turns (the experienceComfort two-fact
  // loop) instead of re-asking a field it already asked.
  history?: ModelMessage[];
  // Date awareness (FR-SLOT-02): today's Europe/Kyiv "YYYY-MM-DD", threaded
  // into `buildSystemPrompt` so the model can resolve a relative/absolute day
  // the lead names ("завтра", "у пʼятницю", "14 липня") into a concrete date
  // for `propose_slots`'s `date`. OPTIONAL, defaulting to "" — the pure core
  // takes no clock (TC-PURE-01); the production caller (`pipeline.ts`) supplies
  // it, unit tests stay hermetic (no date block unless supplied).
  today?: string;
}

/** How a single tool-use block resolved once run through the reducer
 *  (defense in depth: a syntactically valid tool call is not automatically
 *  an applied one).
 *
 *  `"logged"` (kb-learning design.md Decision 4, tasks.md C.7) — deliberately
 *  NOT `"applied"`: `runIntakeTurn`'s reply-assembly rule
 *  (`hasAppliedToolCall || stateAdvanced`) overrides the model's own
 *  narrated text with the deterministic ack+next-question composer whenever
 *  ANY tool call in the turn was `"applied"`. An `answer_faq`/`log_question`
 *  call never reaches `transition()` at all (no state/field mutation to
 *  "apply") and a PURE FAQ turn's whole point is the OPPOSITE of the ack
 *  composer: the model's own KB-grounded narration IS the reply. Naming
 *  this outcome `"logged"` keeps a pure FAQ turn's `hasAppliedToolCall`
 *  `false`, so its `reply` stays the model's verbatim narration — see
 *  `applyToolUse`'s (not-yet-written, tasks.md C.9) `answer_faq`/
 *  `log_question` branches for the dispatch that will produce this value. */
export type ToolCallOutcome = "applied" | "rejected" | "detour" | "pass_through" | "logged";

/** booking-hitl design.md Decision 2 (tasks.md C.2/C.3): the reducer's own
 *  closed `TransitionErrorCode` set, widened by exactly one loop-layer-only
 *  signal — `"SLOT_COLLISION"`, produced when `ports.holdStore.holdSlot`
 *  resolves `{status:"collision"}` (a hold-race, never a `transition()`
 *  rejection — `transition()`/`pick_slot` is never even called on this path,
 *  see `applyToolUse`'s `request_hold` branch) — so a `request_hold` tool
 *  call's log entry can carry a machine-readable "the pipeline layer can
 *  react to this" signal (tasks.md C.3's own wording) without widening the
 *  pure reducer's own error vocabulary for a concern (calendar collision)
 *  the reducer itself never touches. */
export type LoopErrorCode =
  | TransitionErrorCode
  | "SLOT_COLLISION"
  // Loop-layer guardrails outside the pure reducer's vocabulary (CodeRabbit
  // review batch): a tool name outside the offered `TOOLS` set, and a
  // propose_slots time window that is provided but malformed (start >= end).
  | "UNKNOWN_TOOL"
  | "INVALID_TIME_RANGE";

/** One deterministic log entry per tool-use block the model's response
 *  contained, appended by the loop itself (ADR-0001 §5 analog) —
 *  independent of the model's own narration. */
export interface ToolCallLogEntry {
  tool: string;
  input: unknown;
  outcome: ToolCallOutcome;
  detour?: Detour | null;
  error?: LoopErrorCode;
}

export interface LoopResult {
  reply: string;
  state: IntakeState;
  toolCalls: ToolCallLogEntry[];
}

/** Review-gate finding (Fix 4): a marker error `applyToolUse`'s
 *  `answer_faq`/`log_question` branches rethrow when their own
 *  `ports.questions` call rejects — recognized by the shared catch in
 *  `runIntakeTurn` to select `QUESTION_LOGGING_UNAVAILABLE_APOLOGY` instead
 *  of the default `CALENDAR_UNAVAILABLE_APOLOGY`, without changing the
 *  wording of any other dispatch-failure path (Calendar/booking-release
 *  failures still fall through unchanged). */
class QuestionLoggingFailure extends Error {
  readonly cause: unknown;
  constructor(cause: unknown) {
    super("Kamerton: QuestionsPort failure while logging a question");
    this.name = "QuestionLoggingFailure";
    this.cause = cause;
  }
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
  const { state, message, ports, kbText = "", history = [], today = "" } = input;
  // The model receives TWO layers of prior-turn context every turn:
  //   1. the deterministic `IntakeState` (conversationState + validator-
  //      approved `fields`), turned into the dynamic system block by
  //      `buildSystemPrompt` — the persisted `requests` row IS the durable,
  //      validated memory (design.md Decision 1/4); and
  //   2. `history` — the recent verbatim transcript tail (the lead's own
  //      words + the replies they saw), replayed as real `messages` BEFORE
  //      the current turn's user message.
  // Layer 2 was originally a documented deferred TODO ("each turn is
  // context-free"); the conversation-history slice added it because the state
  // summary alone is NOT sufficient for a field that needs several facts the
  // lead supplies one-per-turn (experience + comfort): without the earlier
  // turn replayed, the model can never hold both facts at once to fill the
  // two-field `save_experience_comfort` tool, and loops re-asking forever.
  // The `messages` table (packages/db/src/messages.ts) is that log; the
  // production caller (`pipeline.ts`) threads its tail in via `history`.
  const system = buildSystemPrompt(state, kbText, today);
  const messages: ModelMessage[] = [...history, { role: "user", content: message }];

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
      //
      // Review-gate finding (Fix 4): a `QuestionLoggingFailure` marker (a
      // `ports.questions` rejection inside the `answer_faq`/`log_question`
      // branches) gets its OWN question-appropriate apology — every other
      // dispatch failure (Calendar/booking-release) keeps the existing
      // wording, unchanged.
      const reply =
        error instanceof QuestionLoggingFailure
          ? QUESTION_LOGGING_UNAVAILABLE_APOLOGY
          : CALENDAR_UNAVAILABLE_APOLOGY;
      return { reply, state: currentState, toolCalls };
    }
    currentState = applied.state;
    toolCalls.push(applied.logEntry);
  }

  // Conversational-flow bugfix: the CODE, not the model, owns asking the
  // next question — see the import comment above and `assembleReply`'s own
  // header comment for the full rule. Only a genuinely field-recording/
  // advancing turn (an "applied" outcome, OR a conversationState move —
  // e.g. the AGE_BELOW_MIN guardrail, which is logged "rejected" yet still
  // moves the state to the terminal `soft_decline`) gets the deterministic
  // ack+question/closing treatment; a detour/rejected-with-no-state-change/
  // pass-through turn's reply is left as the model's own (possibly empty)
  // narration, unchanged from this loop's pre-existing behaviour — those
  // outcomes already have their own deterministic guardrail-copy override
  // one layer up, in `packages/bot/src/pipeline.ts`'s `guardrailOverrideFor`.
  const stateAdvanced = currentState.conversationState !== state.conversationState;
  const hasAppliedToolCall = toolCalls.some((call) => call.outcome === "applied");
  const reply =
    hasAppliedToolCall || stateAdvanced
      ? assembleReply(
          // Keep the model's narration as the ack ONLY when this turn also
          // logged a FAQ (answer_faq/log_question) — then the narration is the
          // lead's KB answer, not a re-asked next question. A pure save_* turn
          // passes "" so the ack is the deterministic DEFAULT_ACK_COPY (no
          // within-bubble double-question).
          toolCalls.some((call) => call.outcome === "logged") ? narratedText : "",
          currentState,
        )
      : narratedText;

  return { reply, state: currentState, toolCalls };
}

/** Assembles the deterministic lead-facing reply for a turn whose tool-use
 *  dispatch actually recorded a field or advanced/ended the conversation
 *  (see the call site's comment for exactly which outcomes qualify). The CODE
 *  owns the next question deterministically: a warm `DEFAULT_ACK_COPY` ack
 *  plus the Ukrainian question for the NEXT needed field of the RESULTING
 *  state (`nextLeadFacingStep`, `@kamerton/lib/src/intake/questions.ts`).
 *
 *  `ackText` is the acknowledgement prefix: the caller passes the model's own
 *  narration ONLY for a turn that also LOGGED a FAQ (answer_faq/log_question),
 *  where that narration is the lead's actual KB answer and must survive; for a
 *  pure save_* turn it passes `""`, so the ack falls back to the deterministic
 *  `DEFAULT_ACK_COPY`. This is deliberate: on a plain save turn the model
 *  usually narrates its OWN follow-up question ("Записала: Саша. А скільки
 *  років?"), which doubled with `step.text` — the same question twice in one
 *  message (a within-bubble duplicate seen on the live bot). When the
 *  resulting state has no next field (reached `proposing`, or a terminal/
 *  `awaiting_admin` state), the closing copy is used standalone. */
function assembleReply(ackText: string, resultState: IntakeState): string {
  const step = nextLeadFacingStep(resultState);
  if (step.kind === "closing") {
    return step.text;
  }
  const ack = ackText.trim().length > 0 ? ackText.trim() : DEFAULT_ACK_COPY;
  return `${ack} ${step.text}`;
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
/** Coerces an `amend_field` `studentAge` tool-call value to a number when it
 *  is a numeric string (e.g. `"7"`, `" 7 "`) — the seam this loop uses to
 *  stop a stringly-typed model tool call from ever reaching `validateAge`'s
 *  `typeof age !== "number"` guard as a string. A value that does not parse
 *  to a finite number is returned UNCHANGED (never coerced to `NaN` or some
 *  other bogus number) so the existing AGE_BELOW_MIN guardrail still rejects
 *  it exactly as before — this is a narrow type fix-up, not new leniency. */
/** Reads the `question` string off an `answer_faq`/`log_question` tool-use
 *  block's input — the ONLY field either tool's schema exposes (tools.ts's
 *  own guardrail: no answer/content payload, `@trace FR-GUARD-06`). Falls
 *  back to `""` for a malformed/missing value rather than throwing — a
 *  syntactically-valid-per-schema call from the real API always carries this
 *  field, but defense in depth costs nothing here. */
function readQuestionInput(block: ToolUseBlock): string {
  // Review-gate finding (Fix 5, MINOR): defensive guard — a `null`/
  // `undefined`/non-object `input` (never expected from the real API, but
  // cheap to guard) would otherwise throw reading `.question` off it.
  const input = block.input;
  if (typeof input !== "object" || input === null) {
    return "";
  }
  const question = (input as { question?: unknown }).question;
  return typeof question === "string" ? question : "";
}

function coerceAmendedAge(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return value;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
}

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
    case "amend_field": {
      // The per-field discriminated `AmendEvent` shape is enforced at
      // runtime by `transition()`'s own field-by-field handling (and, for
      // `studentAge`, `validateAge`) — defense in depth, same as
      // `save_format`'s schema-enum-plus-validator pattern (tasks.md 4.4's
      // second bullet). The model's own tool schema enum already constrains
      // `field` to a real `AmendableField`.
      const field = input.field as AmendableField;
      // Live-Telegram bug fix (docs/qa/intake-manual-smoke.md scenario 4,
      // CRITICAL): `amend_field.value` carries no type constraint in
      // tools.ts, so the model reliably sends a numeric-STRING age
      // correction (e.g. `value: "7"`), reproduced 6/6 even when explicitly
      // asked for a number. Left as a string, that value reaches
      // `validateAge`'s defensive `typeof age !== "number"` guard (a
      // deliberate, KEPT review-gate fix — never loosened here) and is read
      // as "not a number" -> AGE_BELOW_MIN, soft-declining a compliant lead.
      // The fix coerces a numeric string to a number at this tool -> event
      // boundary, ONLY for the `studentAge` field, BEFORE the event ever
      // reaches `transition()`/`validateAge`. A value that does not parse to
      // a finite number (e.g. "не пам'ятаю") is left untouched — the
      // existing AGE_BELOW_MIN guardrail still rejects it, unchanged.
      const value = field === "studentAge" ? coerceAmendedAge(input.value) : input.value;
      return { type: "amend", field, value } as unknown as IntakeEvent;
    }
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
  // FR-GUARD-01 closed-tool discipline: only a tool actually offered this
  // turn may execute. A name outside the current `TOOLS` set — the
  // dropped-from-MVP `save_goal`/`skip_goal`/`save_tastes`/`skip_tastes`/
  // `save_experience_comfort`, or any hallucinated/compromised name — is
  // rejected WITHOUT dispatch, so it never reaches `toIntakeEvent`'s dormant
  // profiling branches or mutates a dormant field (CodeRabbit finding).
  if (!TOOL_NAMES.includes(block.name)) {
    return {
      state,
      logEntry: { tool: block.name, input: block.input, outcome: "rejected", error: "UNKNOWN_TOOL" },
    };
  }
  // booking-hitl design.md Decision 2 (tasks.md C.3): `propose_slots`/
  // `request_hold` need the `ports.slots`/`ports.holdStore` seams and an
  // async round trip BEFORE any `transition()` call, so they are handled as
  // their own branches ahead of the synchronous `toIntakeEvent` mapping
  // below (which still returns `null` for both tool names — `transition()`
  // itself never sees a `propose_slots`/`request_hold` tool-use block).
  if (block.name === "propose_slots") {
    return applyProposeSlots(block, state, ports);
  }
  if (block.name === "request_hold") {
    return applyRequestHold(block, state, ports);
  }
  // kb-learning design.md Decision 4 (tasks.md C.9): `answer_faq`/
  // `log_question` are LOGGING-ONLY dedicated tools — mirrors
  // `explain_scope`/`explain_format`'s own shape (no `transition()` call, no
  // state/field mutation), except these two also await a `ports.questions`
  // call. `outcome: "logged"` (NOT "applied") is deliberate: a PURE FAQ turn
  // (no other tool call) must leave `hasAppliedToolCall` false so the reply
  // stays the model's own KB-grounded narration, unoverridden by the
  // deterministic ack+next-question composer (see `ToolCallOutcome`'s own
  // header comment, and `runIntakeTurn`'s reply-assembly rule below). A
  // `ports.questions` rejection propagates to `runIntakeTurn`'s EXISTING
  // try/catch around this call, which returns the shared
  // `CALENDAR_UNAVAILABLE_APOLOGY` with state preserved — no new
  // error-handling code needed (design.md Decision 4's own flag, disposition
  // deferred to the I.1 review-gate stage).
  // Review-gate finding (Fix 4, MAJOR/tone): the shared `applyToolUse`
  // dispatch catch in `runIntakeTurn` returns `CALENDAR_UNAVAILABLE_APOLOGY`
  // for ANY dispatch failure — right for a Calendar/booking-release failure,
  // but wrong-toned for a `QuestionsPort` (DB-write) failure while logging an
  // FAQ question, which has nothing to do with the calendar
  // (BC-BRAND-01/BC-LANG-01 kind-tone: a lead who asked a question should
  // never be told the SCHEDULE is broken). Each branch below wraps its own
  // `ports.questions` call in its OWN try/catch and rethrows a
  // `QuestionLoggingFailure` marker on rejection — the outer shared catch in
  // `runIntakeTurn` recognizes this marker and swaps in the question-
  // appropriate apology instead, while every other dispatch failure
  // (Calendar/booking-release) keeps its existing, unchanged wording.
  if (block.name === "answer_faq") {
    try {
      await ports.questions?.logAnsweredFromKb(readQuestionInput(block));
    } catch (error) {
      throw new QuestionLoggingFailure(error);
    }
    return { state, logEntry: { tool: block.name, input: block.input, outcome: "logged" } };
  }
  if (block.name === "log_question") {
    try {
      await ports.questions?.logUnanswered(readQuestionInput(block));
    } catch (error) {
      throw new QuestionLoggingFailure(error);
    }
    return { state, logEntry: { tool: block.name, input: block.input, outcome: "logged" } };
  }

  const event = toIntakeEvent(block);
  if (event === null) {
    // Live-Telegram bug fix (docs/qa/intake-manual-smoke.md scenario 3,
    // MAJOR): `explain_scope`/`explain_format` are stateless/deterministic
    // explanations that never reach `transition()` — but a scope/format
    // question routed through these DEDICATED tools (rather than through
    // `save_format("instrument"|"unsure")`) used to be logged as a bare
    // `outcome: "pass_through"` with NO `detour`, so `packages/bot/src/
    // pipeline.ts`'s `guardrailOverrideFor` never saw a `scope_violation`/
    // `format_unsure` detour and fell back to the generic "Дякую, я це
    // записала." copy instead of `SCOPE_EXPLANATION_COPY`/
    // `FORMAT_UNSURE_COPY`. These two tools now dispatch straight to the
    // EXISTING detour vocabulary/pipeline override — still no reducer call,
    // no state/field mutation, only the log entry's `outcome`/`detour`
    // change.
    if (block.name === "explain_scope") {
      return {
        state,
        logEntry: { tool: block.name, input: block.input, outcome: "detour", detour: "scope_violation" },
      };
    }
    if (block.name === "explain_format") {
      return {
        state,
        logEntry: { tool: block.name, input: block.input, outcome: "detour", detour: "format_unsure" },
      };
    }
    // Review-gate finding #5 (MINOR): `propose_slots`/`request_hold` (and
    // any tool this pinned `LoopPorts` contract does not yet wire an event
    // for) never reach `transition()` at all — nothing was ever offered to
    // the reducer to accept or reject, so this is NOT "applied" (that label
    // is reserved for a genuine reducer-approved mutation). "pass_through"
    // names what actually happened: the tool call was logged and passed
    // straight through.
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

/** booking-hitl design.md Decision 2 (tasks.md C.3): the `propose_slots`
 *  tool-use branch. `validatePreferences` runs FIRST, defense in depth
 *  (same shape as `save_format`'s schema-plus-validator pattern) — an
 *  invalid input never reaches `ports.slots.proposeSlots` at all, state
 *  unchanged (SAME reference). A `{status:"unavailable"}` port result is
 *  turned into a THROW so `runIntakeTurn`'s own try/catch around
 *  `applyToolUse` (the existing "Calendar/DB failure during dispatch"
 *  boundary) produces the deterministic `CALENDAR_UNAVAILABLE_APOLOGY` reply
 *  with the prior state preserved — the same recovery path a `cancel_request`
 *  Calendar failure already uses, not a second bespoke mechanism. */
async function applyProposeSlots(
  block: ToolUseBlock,
  state: IntakeState,
  ports: LoopPorts,
): Promise<AppliedToolUse> {
  const rawInput = block.input as { weekdays?: unknown; timeWindow?: unknown; date?: unknown };
  // A concrete date the model resolved from the lead's "завтра"/"у пʼятницю"/
  // "14 липня" (system prompt supplies today). Only a well-formed YYYY-MM-DD is
  // carried through; the pipeline re-validates it against today's horizon
  // (guardrail: code decides, model only proposes).
  const date =
    typeof rawInput.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawInput.date) ? rawInput.date : undefined;
  const input = {
    weekdays: Array.isArray(rawInput.weekdays) ? (rawInput.weekdays as string[]) : [],
    timeWindow:
      typeof rawInput.timeWindow === "object" && rawInput.timeWindow !== null
        ? (rawInput.timeWindow as { start: string; end: string })
        : { start: "", end: "" },
    ...(date !== undefined ? { date } : {}),
  };

  // When the lead named a concrete day, `date` IS the weekday constraint and
  // `weekdays` may be filler — so the full weekday+time validator is skipped
  // for that path. But the time-of-day still must be valid (CodeRabbit): a
  // named date replaces the weekday constraint, not time validation. An
  // EMPTY window ({"",""}) is the legitimate "any time that day" signal (the
  // lead said only "завтра") — the pipeline fills the full teaching day — so
  // only a PROVIDED-but-malformed window (start >= end) is rejected here.
  if (date === undefined) {
    const validation = validatePreferences(input);
    if (!validation.ok) {
      return {
        state,
        logEntry: { tool: block.name, input: block.input, outcome: "rejected" },
      };
    }
  } else {
    const tw = input.timeWindow;
    const windowProvided = tw.start !== "" || tw.end !== "";
    if (windowProvided && tw.start >= tw.end) {
      return {
        state,
        logEntry: { tool: block.name, input: block.input, outcome: "rejected", error: "INVALID_TIME_RANGE" },
      };
    }
  }

  const result = await ports.slots.proposeSlots(input);
  if (result.status === "unavailable") {
    // Never let a Calendar apology propagate as anything but the shared
    // NFR-REL-01 recovery path — see this function's header comment.
    throw new Error("Kamerton: calendar unavailable during propose_slots");
  }

  // design.md Decision 2: `{status:"no_free_times"}` is still recorded via
  // `offer_slots` with an empty list — the reducer does not special-case
  // emptiness; the "no free times" message composition is a reply-assembly
  // concern one layer up, not this dispatch's job.
  const slots = result.status === "ok" ? result.slots : [];
  const transitionResult = transition(state, { type: "offer_slots", slots });
  if (transitionResult.error !== undefined) {
    return {
      state,
      logEntry: { tool: block.name, input: block.input, outcome: "rejected", error: transitionResult.error },
    };
  }

  await ports.persistence.saveFields({ offeredSlots: slots });

  return {
    state: transitionResult.state,
    logEntry: { tool: block.name, input: block.input, outcome: "applied" },
  };
}

/** booking-hitl design.md Decision 2 (tasks.md C.3): the `request_hold`
 *  tool-use branch. Bounds-checks `slotIndex` against
 *  `state.fields.offeredSlots` FIRST — an out-of-range (or missing-offer)
 *  index is rejected `INVALID_SLOT_INDEX` WITHOUT ever calling
 *  `ports.holdStore.holdSlot` (mirrors `transition()`'s own `pick_slot`
 *  bounds check, kept here too since `ports.holdStore.holdSlot` must never
 *  be called with a bogus index). A `{status:"collision"}` result never
 *  reaches `transition()` at all — `state` stays the SAME reference, logged
 *  `"rejected"` with the loop-layer-only `"SLOT_COLLISION"` signal so the
 *  pipeline layer can react (baseline `slots` spec's hold-race scenario). A
 *  `{status:"unavailable"}` result throws, same shared NFR-REL-01 recovery
 *  path `applyProposeSlots` uses above. */
async function applyRequestHold(
  block: ToolUseBlock,
  state: IntakeState,
  ports: LoopPorts,
): Promise<AppliedToolUse> {
  const rawInput = block.input as { slotIndex?: unknown };
  const slotIndex = typeof rawInput.slotIndex === "number" ? rawInput.slotIndex : Number(rawInput.slotIndex);
  const offeredSlots = state.fields.offeredSlots;

  if (
    offeredSlots === undefined ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= offeredSlots.length
  ) {
    return {
      state,
      logEntry: { tool: block.name, input: block.input, outcome: "rejected", error: "INVALID_SLOT_INDEX" },
    };
  }

  // Preflight the PURE pick_slot transition BEFORE creating any external
  // hold (CodeRabbit critical): a valid index but a wrong conversation state
  // — e.g. a repeated hold after the booking already reached `awaiting_admin`
  // (a stale slot button tapped twice) — must reject WITHOUT a side effect.
  // Running `holdSlot()` first and only then discovering the transition
  // rejects would leave an orphaned tentative calendar event + pending
  // booking. The transition is pure/idempotent, so running it as a preflight
  // and again after the hold is free and safe.
  const preflight = transition(state, { type: "pick_slot", slotIndex });
  if (preflight.error !== undefined) {
    return {
      state,
      logEntry: { tool: block.name, input: block.input, outcome: "rejected", error: preflight.error },
    };
  }

  const result = await ports.holdStore.holdSlot(slotIndex, offeredSlots);
  if (result.status === "unavailable") {
    throw new Error("Kamerton: calendar unavailable during request_hold");
  }
  if (result.status === "collision") {
    return {
      state,
      logEntry: { tool: block.name, input: block.input, outcome: "rejected", error: "SLOT_COLLISION" },
    };
  }

  // {status: "held"} — the preflight already proved the pick_slot transition
  // (proposing -> awaiting_admin) succeeds, so commit its result.
  await ports.persistence.saveState(preflight.state.conversationState);

  return {
    state: preflight.state,
    logEntry: { tool: block.name, input: block.input, outcome: "applied" },
  };
}
