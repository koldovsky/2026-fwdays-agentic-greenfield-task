// TYPED THROWING STUB — red state for tasks.md section 2 (2.5-2.14's red
// half). The types and the `transition()`/`initialIntakeState()` signatures
// below are the contract pinned by state-machine.test.ts; the body is
// implemented in tasks.md section 3 (3.5). No logic lives here yet — every
// function body is a single Not-implemented throw (same convention as the
// S1 `slots` red rounds: grid.ts, hold.ts, propose.ts).
//
// Framework-free pure core (TC-PURE-01): `transition()` is a pure,
// synchronous reducer — no I/O, no `Date.now()`-without-injection, no LLM
// call. It is deliberately SELF-CONTAINED: it does not import
// `validateAge`/`validateFormat`/`addressesParent` from sibling modules
// (age.ts/format.ts/audience.ts, tasks.md 2.1-2.3) even though design.md
// Decision 1 says the green implementation calls them — those modules are a
// different task's contract (owned by a parallel test-engineer pass) and
// are not yet guaranteed to exist while this file is red. The error-code
// string literals below ("AGE_BELOW_MIN", "FORMAT_UNSURE", etc.) mirror
// age.ts/format.ts's own vocabulary from design.md so the green
// implementation can wire the real validators in without changing this
// file's exported types.
//
// CONTRACT (design.md Decision 1, ADR-0001 §6):
//
//   ConversationState = "greeting" | "qualifying" | "profiling" |
//     "collecting" | "proposing" | "awaiting_admin" | "done" |
//     "soft_decline"
//     Terminal states: "done", "soft_decline". Every other state is
//     "non-terminal" (amend/cancel are accepted in any non-terminal state).
//
//   IntakeFields holds only validator-approved values, one property per
//   `requests` schema column this slice owns (design.md Decision 4).
//
//   IntakeState = { conversationState, fields } — the reducer's full state
//   shape. `initialIntakeState()` returns a FRESH, independent instance
//   every call (`conversationState: "greeting"`, `fields: {}`) — no shared
//   mutable default object, so two `initialIntakeState()` calls (simulating
//   two `requests` rows for the same lead, FR-INTAKE-08) never alias each
//   other's `fields`.
//
//   Field ownership per state (enforced by `transition()` rejecting an
//   out-of-state `save_*`/`skip_*` event with `error:
//   "FIELD_NOT_OWNED_BY_STATE"`, state/fields UNCHANGED):
//     - "qualifying" owns save_name, save_age, save_format
//     - "profiling" owns save_goal, skip_goal, save_tastes, skip_tastes,
//       save_experience_comfort
//     - "collecting" owns save_weekdays, save_time_range
//   `amend` is the one exception (FR-INTAKE-07): accepted in ANY
//   non-terminal state, re-running the same field's validator; if the new
//   value fails it (e.g. amended age < 4), it drives the same terminal
//   `soft_decline` transition a first-time violation would. `cancel` is
//   also accepted outside the state-ownership gate (FR-INTAKE-07 "before
//   the administrator's decision").
//
//   Once ALL fields owned by the current state are present and valid, the
//   reducer advances to the next state in the happy-path chain:
//   qualifying -> profiling -> collecting -> proposing. A guardrail
//   violation (age below 4) short-circuits straight to the terminal
//   "soft_decline" instead of advancing, from ANY state the violation is
//   detected in (first save, or a later amend) — spec.md "no request in
//   state `proposing` or later ever exists with age < 4".
//
//   Detours are a side-channel, never a real enum state (design.md Decision
//   1's chosen option): `save_format("instrument")` /
//   `save_format("unsure")` return `detour: "scope_violation"` /
//   `"format_unsure"` on `TransitionResult`, with `state.conversationState`
//   and `state.fields` BYTE-IDENTICAL to the input (still "qualifying",
//   `format` unset) — "resuming" a detour is a no-op by construction, since
//   the state never left. Off-topic steering (FR-GUARD-05) does not even
//   reach this reducer (design.md Decision 1) — there is no "off_topic"
//   detour value here; that is proven at the agent-loop layer (tasks.md
//   section 4), not this module.
//
//   Any `save_*`/`skip_*`/`amend` event against a TERMINAL `conversationState`
//   ("done" or "soft_decline") is rejected with `error: "TERMINAL_STATE"`,
//   state/fields unchanged (FR-INTAKE-08's "does not modify the terminal
//   request" rule, applied uniformly to both terminal shapes).
//
//   transition(state, event) -> TransitionResult
//     Pure, synchronous. Never mutates `state` or `event` in place — always
//     returns a new `IntakeState` inside the result (or the SAME reference
//     when nothing changed, e.g. a rejected event, so callers can cheaply
//     detect a no-op with `===`).
//
//   initialIntakeState() -> IntakeState
//     Returns `{ conversationState: "greeting", fields: {} }`, a fresh
//     object graph every call.

/** The seven-state-plus-terminal conversation machine (ADR-0001 §6). */
export type ConversationState =
  | "greeting"
  | "qualifying"
  | "profiling"
  | "collecting"
  | "proposing"
  | "awaiting_admin"
  | "done"
  | "soft_decline";

/** Predefined goal tags the reducer accepts on `save_goal` (FR-INTAKE-03). */
export type GoalTag = "karaoke" | "performance" | "confidence" | "hobby" | "other";

/** Only the two values a VALID format ever settles to; "unsure"/"instrument"
 *  never reach `fields.format` — they short-circuit to a `detour` instead
 *  (design.md Decision 1). */
export type ValidFormat = "individual" | "group";

/** The full candidate value space `save_format` may be called with — the
 *  model's tool schema enum is exactly this set (tasks.md 4.3), and
 *  `validateFormat` (format.ts, out of this file's scope) is what narrows
 *  it down to `ValidFormat` or a detour. */
export type CandidateFormat = ValidFormat | "unsure" | "instrument";

/**
 * Values the reducer has itself validated. One property per `requests`
 * schema column this slice owns (design.md Decision 4) — no field is ever
 * present here that a validator has not approved.
 */
export interface IntakeFields {
  studentName?: string;
  studentAge?: number;
  format?: ValidFormat;
  goalTag?: GoalTag;
  goalText?: string;
  tastes?: string;
  dreamSong?: string;
  experience?: string;
  comfort?: string;
  preferredWeekdays?: string;
  preferredTimeRange?: string;
}

/** The reducer's full state shape. */
export interface IntakeState {
  conversationState: ConversationState;
  fields: IntakeFields;
}

/** Every field `amend` may target, discriminated so `value`'s type follows
 *  `field` (e.g. `field: "studentAge"` forces `value: number`). */
export type AmendableField = keyof IntakeFields;

/** `{ type: "amend"; field: F; value: NonNullable<IntakeFields[F]> }` for
 *  every `F` in `IntakeFields`, unioned — a fully-typed per-field amend
 *  event (FR-INTAKE-07: "amend any collected field"). */
export type AmendEvent = {
  [F in AmendableField]: {
    type: "amend";
    field: F;
    value: NonNullable<IntakeFields[F]>;
  };
}[AmendableField];

/**
 * The closed event set the reducer accepts — one event per tool in
 * design.md Decision 2's closed tool list (`save_*`/`skip_*`/`amend_field`/
 * `cancel_request`), minus the tools that never reach this reducer at all
 * (`explain_scope`, `explain_format`, `propose_slots`, `request_hold` are
 * agent-loop/slots-layer concerns, tasks.md section 4).
 */
export type IntakeEvent =
  | { type: "save_name"; name: string }
  | { type: "save_age"; age: number }
  | { type: "save_format"; format: CandidateFormat }
  | { type: "save_goal"; goalTag: GoalTag; goalText: string }
  | { type: "skip_goal" }
  | { type: "save_tastes"; tastes: string; dreamSong?: string }
  | { type: "skip_tastes" }
  | { type: "save_experience_comfort"; experience: string; comfort: string }
  | { type: "save_weekdays"; weekdays: string }
  | { type: "save_time_range"; timeRange: string }
  | AmendEvent
  | { type: "cancel" };

/** The side-channel detour signal (design.md Decision 1's chosen option) —
 *  `conversationState` is never mutated for these; the caller reads this
 *  field to know a detour reply is owed instead of a state-advancing one. */
export type Detour = "scope_violation" | "format_unsure";

/** Error codes the reducer itself produces (mirrors age.ts/format.ts's own
 *  vocabulary from design.md so the green implementation's validator
 *  results plug straight through). */
export type TransitionErrorCode = "FIELD_NOT_OWNED_BY_STATE" | "AGE_BELOW_MIN" | "TERMINAL_STATE";

/**
 * `transition()`'s return shape. `state` is always the FULL resulting
 * `IntakeState` (fields included) — even on rejection, where it is the
 * SAME reference as the input `state` (never a shallow copy), so callers
 * can detect a no-op with `===` (spec.md's "state and fields preserved
 * intact" scenarios).
 */
export interface TransitionResult {
  state: IntakeState;
  detour: Detour | null;
  error?: TransitionErrorCode;
}

/**
 * A fresh, independent `IntakeState` — `conversationState: "greeting"`,
 * `fields: {}`. Two calls never share the same `fields` object graph
 * (FR-INTAKE-08: two `requests` rows for the same lead never alias each
 * other's profile).
 */
export function initialIntakeState(): IntakeState {
  throw new Error(
    "Not implemented — lib/src/intake/state-machine.ts initialIntakeState (tasks.md 3.5 green half)",
  );
}

/**
 * The pure, synchronous conversation-state reducer (design.md Decision 1).
 * See the file-level contract comment above for the full field-ownership /
 * guardrail / detour / terminal-state rules this function implements.
 */
export function transition(state: IntakeState, event: IntakeEvent): TransitionResult {
  void state;
  void event;
  throw new Error(
    "Not implemented — lib/src/intake/state-machine.ts transition (tasks.md 3.5 green half)",
  );
}
