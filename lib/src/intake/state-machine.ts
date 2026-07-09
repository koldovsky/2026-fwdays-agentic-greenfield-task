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
//     - "collecting" owns save_weekdays, save_time_range
//     - "profiling" (DORMANT, dropped from the happy path 2026-07-09) still
//       nominally owns save_goal, skip_goal, save_tastes, skip_tastes,
//       save_experience_comfort — reachable only if a caller constructs a
//       `profiling` state by hand; the live flow never enters it.
//   `amend` is the one exception (FR-INTAKE-07): accepted in ANY
//   non-terminal state, re-running the same field's validator; if the new
//   value fails it (e.g. amended age < 4), it drives the same terminal
//   `soft_decline` transition a first-time violation would. `cancel` is
//   also accepted outside the state-ownership gate (FR-INTAKE-07 "before
//   the administrator's decision").
//
//   Once ALL fields owned by the current state are present and valid, the
//   reducer advances to the next state in the happy-path chain:
//   qualifying -> collecting -> proposing (the MVP is mandatory-only, 5 steps,
//   2026-07-09 — the former "profiling" stage collecting goal/tastes/
//   experience is DROPPED from the flow; the `profiling` state value and its
//   save_goal/skip_goal/save_tastes/skip_tastes/save_experience_comfort event
//   handling remain in this reducer as DORMANT code — never reached on the
//   happy path and never offered to the model — kept only so the type surface
//   and the DB CHECK constraint stay stable without a migration). A guardrail
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

import { validateAge } from "./age.ts";
import { validateFormat } from "./format.ts";

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
 * One slot offered to the lead, Kyiv wall-clock local `"YYYY-MM-DDTHH:mm"`
 * strings (booking-hitl design.md Decision 2) — the same shape as
 * `../slots/grid.ts`'s `Slot`, declared here as its own literal interface
 * (not imported) so this module stays self-contained, mirroring
 * `intake/first-lesson-brief.ts`'s own "zero dependency, even type-only"
 * reasoning for cross-module shapes.
 */
export interface OfferedSlot {
  start: string;
  end: string;
}

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
  /** The slot(s) currently offered to this lead (booking-hitl design.md
   *  Decision 2) — set by `offer_slots`, read by `pick_slot`. Serves BOTH
   *  origins of "slots currently offered": the agent's own proposal AND an
   *  administrator's "Propose another time" re-offer (design.md Decision 4
   *  item 2). */
  offeredSlots?: OfferedSlot[];
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
  | { type: "cancel" }
  // booking-hitl design.md Decision 2 — TYPED THROWING STUB (task A.11's
  // red half): both events are owned by "proposing" (task A.12 adds the
  // OWNING_STATE entries and the real reducer branches); the switch below
  // currently throws Not-implemented for both, deliberately NOT
  // implementing the field-ownership/index-bounds logic yet.
  | { type: "offer_slots"; slots: OfferedSlot[] }
  | { type: "pick_slot"; slotIndex: number };

/** The side-channel detour signal (design.md Decision 1's chosen option) —
 *  `conversationState` is never mutated for these; the caller reads this
 *  field to know a detour reply is owed instead of a state-advancing one. */
export type Detour = "scope_violation" | "format_unsure";

/** Error codes the reducer itself produces (mirrors age.ts/format.ts's own
 *  vocabulary from design.md so the green implementation's validator
 *  results plug straight through). */
export type TransitionErrorCode =
  | "FIELD_NOT_OWNED_BY_STATE"
  | "AGE_BELOW_MIN"
  | "TERMINAL_STATE"
  | "INVALID_GOAL_TAG"
  // booking-hitl design.md Decision 2: `pick_slot` with an index outside
  // `fields.offeredSlots`'s bounds (or called before any `offer_slots`) is
  // rejected with this code, state/fields byte-identical to the input — the
  // same "reject in code, never trust the caller" shape
  // `FIELD_NOT_OWNED_BY_STATE` already has (task A.12, red for now).
  | "INVALID_SLOT_INDEX";

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
  return { conversationState: "greeting", fields: {} };
}

/** The closed GoalTag enum, as a runtime-checkable set — `save_goal`'s own
 *  first-time write trusts the model's tool-schema enum to have already
 *  constrained `goalTag` (design.md Decision 2's "checked twice: schema +
 *  validator" applies to `save_format`, not `save_goal`, in this slice).
 *  `amend`, however, is the one event any non-terminal state accepts
 *  regardless of which tool produced it, so it is the one place a bogus
 *  goalTag (an out-of-enum model tool call, or an unvalidated
 *  button-callback payload upstream) must be caught defensively — review-gate
 *  finding #1. */
const GOAL_TAGS: ReadonlySet<GoalTag> = new Set(["karaoke", "performance", "confidence", "hobby", "other"]);

function isValidGoalTag(value: unknown): value is GoalTag {
  return typeof value === "string" && GOAL_TAGS.has(value as GoalTag);
}

const TERMINAL_STATES: ReadonlySet<ConversationState> = new Set(["done", "soft_decline"]);

function isTerminal(conversationState: ConversationState): boolean {
  return TERMINAL_STATES.has(conversationState);
}

/** Field-ownership map (design.md Decision 1 / ADR-0001 §6) — every
 *  save/skip event type names the ONE conversationState allowed to
 *  process it. `amend`/`cancel` are handled outside this map entirely. */
const OWNING_STATE: Partial<Record<IntakeEvent["type"], ConversationState>> = {
  save_name: "qualifying",
  save_age: "qualifying",
  save_format: "qualifying",
  save_goal: "profiling",
  skip_goal: "profiling",
  save_tastes: "profiling",
  skip_tastes: "profiling",
  save_experience_comfort: "profiling",
  save_weekdays: "collecting",
  save_time_range: "collecting",
  // booking-hitl design.md Decision 2 (task A.12) — both owned by
  // "proposing", same field-ownership gate every other event goes through.
  offer_slots: "proposing",
  pick_slot: "proposing",
};

/** The reducer's own "no-op rejection" helper — always the SAME `state`
 *  reference back, per TransitionResult's `===`-detectable no-op contract. */
function rejected(state: IntakeState, error: TransitionErrorCode): TransitionResult {
  return { state, detour: null, error };
}

/** The reducer's own guardrail-violation helper (AGE_BELOW_MIN, from either
 *  a first-time save_age or a later amend) — always discards fields and
 *  lands on the terminal "soft_decline", per spec.md's "no request in state
 *  proposing or later ever exists with age < 4". */
function ageBelowMin(): TransitionResult {
  return {
    state: { conversationState: "soft_decline", fields: {} },
    detour: null,
    error: "AGE_BELOW_MIN",
  };
}

/** Qualifying auto-advances to collecting once name/age/format are ALL
 *  present and valid — a genuine completeness check (no skip variants exist
 *  for these three fields, so truthiness is an unambiguous signal). The
 *  former intermediate "profiling" stage is dropped from the happy path
 *  (2026-07-09, mandatory-only 5-step MVP). */
function qualifyingComplete(fields: IntakeFields): boolean {
  return (
    fields.studentName !== undefined && fields.studentAge !== undefined && fields.format !== undefined
  );
}

/** Collecting auto-advances to proposing once both fields are present —
 *  same genuine completeness reasoning as qualifying (no skip variants). */
function collectingComplete(fields: IntakeFields): boolean {
  return fields.preferredWeekdays !== undefined && fields.preferredTimeRange !== undefined;
}

/**
 * The pure, synchronous conversation-state reducer (design.md Decision 1).
 * See the file-level contract comment above for the full field-ownership /
 * guardrail / detour / terminal-state rules this function implements.
 */
export function transition(state: IntakeState, event: IntakeEvent): TransitionResult {
  // `cancel` and `amend` sit outside the field-ownership gate (FR-INTAKE-07:
  // "any state before the administrator's decision") but are still refused
  // once a terminal state is reached (FR-INTAKE-08).
  if (event.type === "cancel") {
    if (isTerminal(state.conversationState)) {
      return rejected(state, "TERMINAL_STATE");
    }
    return {
      state: { conversationState: "done", fields: state.fields },
      detour: null,
    };
  }

  if (event.type === "amend") {
    if (isTerminal(state.conversationState)) {
      return rejected(state, "TERMINAL_STATE");
    }
    // Review-gate finding #1 (CRITICAL): re-run the OWNING validator for
    // every amendable field that has one — exactly the defense-in-depth a
    // first-time `save_*` gets — instead of writing the model's raw claim
    // straight to `fields`. Only fields with NO owning validator in this
    // slice (free text: studentName/goalText/tastes/dreamSong/experience/
    // comfort/preferredWeekdays/preferredTimeRange) fall through to the
    // verbatim write below, which remains correct for them.
    if (event.field === "studentAge") {
      const validation = validateAge(event.value as number);
      if (!validation.ok) {
        return ageBelowMin();
      }
      return {
        state: {
          conversationState: state.conversationState,
          fields: { ...state.fields, studentAge: validation.age },
        },
        detour: null,
      };
    }
    if (event.field === "format") {
      const validation = validateFormat(event.value as CandidateFormat);
      if (!validation.ok) {
        // Same side-channel detour shape `save_format` returns (design.md
        // Decision 1) — `state`/`fields` byte-identical, never mutated.
        if (validation.code === "FORMAT_UNSURE") {
          return { state, detour: "format_unsure" };
        }
        return { state, detour: "scope_violation" };
      }
      return {
        state: {
          conversationState: state.conversationState,
          fields: { ...state.fields, format: validation.format },
        },
        detour: null,
      };
    }
    if (event.field === "goalTag") {
      if (!isValidGoalTag(event.value)) {
        return rejected(state, "INVALID_GOAL_TAG");
      }
      return {
        state: {
          conversationState: state.conversationState,
          fields: { ...state.fields, goalTag: event.value },
        },
        detour: null,
      };
    }
    return {
      state: {
        conversationState: state.conversationState,
        fields: { ...state.fields, [event.field]: event.value },
      },
      detour: null,
    };
  }

  // Every remaining event type is a save_*/skip_* — field-ownership gated.
  if (isTerminal(state.conversationState)) {
    return rejected(state, "TERMINAL_STATE");
  }

  const owningState = OWNING_STATE[event.type];
  // "greeting" is the pre-qualifying state (the bot's own greeting/typing
  // step, out of this reducer's scope) — the first qualifying-owned event
  // (save_name/save_age/save_format) is also accepted straight from
  // "greeting", implicitly entering "qualifying" (FR-INTAKE-08's sibling
  // isolation test drives a fresh `initialIntakeState()` — "greeting" —
  // straight into `save_name`).
  const enteringQualifying = owningState === "qualifying" && state.conversationState === "greeting";
  if (owningState !== undefined && owningState !== state.conversationState && !enteringQualifying) {
    return rejected(state, "FIELD_NOT_OWNED_BY_STATE");
  }

  switch (event.type) {
    case "save_name": {
      const fields: IntakeFields = { ...state.fields, studentName: event.name };
      const conversationState = qualifyingComplete(fields) ? "collecting" : "qualifying";
      return { state: { conversationState, fields }, detour: null };
    }

    case "save_age": {
      const validation = validateAge(event.age);
      if (!validation.ok) {
        return ageBelowMin();
      }
      const fields: IntakeFields = { ...state.fields, studentAge: validation.age };
      const conversationState = qualifyingComplete(fields) ? "collecting" : "qualifying";
      return { state: { conversationState, fields }, detour: null };
    }

    case "save_format": {
      const validation = validateFormat(event.format);
      if (!validation.ok) {
        if (validation.code === "FORMAT_UNSURE") {
          return { state, detour: "format_unsure" };
        }
        return { state, detour: "scope_violation" };
      }
      const fields: IntakeFields = { ...state.fields, format: validation.format };
      const conversationState = qualifyingComplete(fields) ? "collecting" : "qualifying";
      return { state: { conversationState, fields }, detour: null };
    }

    case "save_goal": {
      const fields: IntakeFields = {
        ...state.fields,
        goalTag: event.goalTag,
        goalText: event.goalText,
      };
      return { state: { conversationState: state.conversationState, fields }, detour: null };
    }

    case "skip_goal":
      return { state: { conversationState: state.conversationState, fields: { ...state.fields } }, detour: null };

    case "save_tastes": {
      const fields: IntakeFields = {
        ...state.fields,
        tastes: event.tastes,
        ...(event.dreamSong !== undefined ? { dreamSong: event.dreamSong } : {}),
      };
      return { state: { conversationState: state.conversationState, fields }, detour: null };
    }

    case "skip_tastes":
      return { state: { conversationState: state.conversationState, fields: { ...state.fields } }, detour: null };

    case "save_experience_comfort": {
      const fields: IntakeFields = {
        ...state.fields,
        experience: event.experience,
        comfort: event.comfort,
      };
      // Designated completing event for "profiling" (FR-INTAKE-05): goal and
      // tastes may have been explicitly skipped and therefore never leave a
      // truthy trace on `fields`, so this event — not a field-completeness
      // check — is what the flow's own fixed question order uses to signal
      // "profiling is done" (see design.md Decision 1's field-ownership map).
      return { state: { conversationState: "collecting", fields }, detour: null };
    }

    case "save_weekdays": {
      const fields: IntakeFields = { ...state.fields, preferredWeekdays: event.weekdays };
      const conversationState = collectingComplete(fields) ? "proposing" : state.conversationState;
      return { state: { conversationState, fields }, detour: null };
    }

    case "save_time_range": {
      const fields: IntakeFields = { ...state.fields, preferredTimeRange: event.timeRange };
      const conversationState = collectingComplete(fields) ? "proposing" : state.conversationState;
      return { state: { conversationState, fields }, detour: null };
    }

    // booking-hitl design.md Decision 2 (task A.12) — both owned by
    // "proposing" (OWNING_STATE above already rejected any other non-terminal
    // state with FIELD_NOT_OWNED_BY_STATE before this switch is reached).
    case "offer_slots": {
      const fields: IntakeFields = { ...state.fields, offeredSlots: event.slots };
      return { state: { conversationState: "proposing", fields }, detour: null };
    }

    case "pick_slot": {
      const offeredSlots = state.fields.offeredSlots;
      if (offeredSlots === undefined || event.slotIndex < 0 || event.slotIndex >= offeredSlots.length) {
        return rejected(state, "INVALID_SLOT_INDEX");
      }
      return {
        state: { conversationState: "awaiting_admin", fields: state.fields },
        detour: null,
      };
    }

    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
