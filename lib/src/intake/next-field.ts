// @kamerton/lib — the single source of truth for "which field does the
// intake flow need next, for this IntakeState" (FR-INTAKE-01..06).
//
// Extracted (not duplicated) from `packages/agent/src/system-prompt.ts`'s
// own former private `nextNeededField` — that module needed this verdict to
// build the MODEL's dynamic system-prompt block (a descriptive instruction
// FOR the model, in Ukrainian, phrased as "запитайте ..."); this bugfix
// (conversational-flow stall: a bare `save_*` tool-use with no accompanying
// model text never asked the next question) needs the EXACT SAME verdict to
// drive `packages/agent/src/loop.ts`'s own deterministic lead-facing
// question, since the code — not the model — must own asking the next
// question (see `questions.ts` in this directory). Rather than maintain two
// copies of the same per-state field-ownership walk (a guaranteed drift
// hazard — `state-machine.ts`'s OWN field-ownership map is the actual
// authority this function mirrors, descriptively only), this module is the
// ONE place that walk lives; `system-prompt.ts` and `questions.ts` both
// import it.
//
// Pure, synchronous, framework-free (TC-PURE-01) — no I/O, no LLM call. This
// function NEVER mutates or re-validates anything; `transition()`
// (state-machine.ts) remains the sole source of truth for what is actually
// allowed. A wrong verdict here would only mis-word a prompt/question, never
// mis-apply a state transition.
import type { IntakeState } from "./state-machine.ts";

/** Every field name this module can name as "next needed" — one entry per
 *  `IntakeFields` property the intake flow ever asks for directly, plus
 *  `"slots"` for the `proposing` state's "propose_slots" trigger (a tool
 *  call, not a lead-facing question — `questions.ts` special-cases it). */
export type NeededField =
  | "studentName"
  | "studentAge"
  | "format"
  | "goalTag"
  | "tastes"
  | "experienceComfort"
  | "preferredWeekdays"
  | "preferredTimeRange"
  | "slots";

/** One next-needed-field verdict: the field key (named literally so callers
 *  — the model's system prompt, and this bugfix's deterministic question
 *  map — can see exactly which field is next) plus a Ukrainian instruction
 *  sentence AIMED AT THE MODEL (e.g. "запитайте вік учня/учениці ..."), kept
 *  here since `system-prompt.ts` is still this field's only consumer for
 *  prompt text; `questions.ts` uses only `field`, not `instruction`, since
 *  its own copy is aimed at the LEAD, not the model.
 *  `null` means this conversationState has nothing left to actively collect
 *  this turn (terminal states, `awaiting_admin`, or a fully-collected state
 *  waiting on a different tool, e.g. `propose_slots` in `proposing` — which
 *  itself returns a non-null verdict with `field: "slots"`, not `null`;
 *  `null` is reserved for `awaiting_admin`/`done`/`soft_decline`, where
 *  nothing at all remains for either the model or the code to ask). */
export interface NextNeededField {
  field: NeededField;
  instruction: string;
}

/**
 * The one-and-only per-state field-ownership walk (mirrors
 * `state-machine.ts`'s own field-ownership map DESCRIPTIVELY, see this
 * file's header comment).
 */
export function nextNeededField(state: IntakeState): NextNeededField | null {
  const { conversationState, fields } = state;

  if (conversationState === "greeting" || conversationState === "qualifying") {
    if (fields.studentName === undefined) {
      return {
        field: "studentName",
        instruction:
          "запитайте ім'я учня/учениці (FR-INTAKE-01). Коли лід називає ім'я — навіть коротко, одним словом, як-от «Саша», «Марійка» чи «мене звати Олег» — це і Є відповідь: одразу запишіть його інструментом save_name, не вітайтеся вдруге й не перепитуйте. Перепитуйте текстом (без виклику інструменту) ЛИШЕ якщо ім'я справді не назване (перше «привіт»/«/start», зустрічне запитання, офтоп).",
      };
    }
    if (fields.studentAge === undefined) {
      return {
        field: "studentAge",
        instruction:
          "запитайте вік учня/учениці (FR-INTAKE-02). Коли лід називає число — навіть коротко, як-от «7», «сім» чи «7 років» — це і Є відповідь: одразу запишіть його інструментом save_age, не перепитуйте. Перепитуйте текстом (без виклику інструменту) ЛИШЕ справді нечислову чи незрозумілу відповідь («не пам'ятаю», «скоро буде»). Перевірку меж (вік < 4) робить код, не ви.",
      };
    }
    if (fields.format === undefined) {
      return {
        field: "format",
        instruction:
          "запитайте формат занять — індивідуальний чи груповий (FR-INTAKE-02). Коли лід називає формат — навіть коротко, одним словом, як-от «груповий», «індивідуально» чи «сам» — це і Є відповідь: одразу запишіть його інструментом save_format, не перепитуйте. Перепитуйте текстом ЛИШЕ справді незрозумілу відповідь.",
      };
    }
    return null;
  }

  if (conversationState === "profiling") {
    if (fields.goalTag === undefined) {
      return {
        field: "goalTag",
        instruction:
          "запитайте мету занять (FR-INTAKE-03) — куди зверніться, лід може завжди пропустити (skip_goal). Коли лід називає мету — навіть коротко («для себе», «щоб виступати», «караоке») — це і Є відповідь: одразу запишіть save_goal, не перепитуйте.",
      };
    }
    if (fields.tastes === undefined) {
      return {
        field: "tastes",
        instruction:
          "запитайте музичні смаки та, за бажанням, пісню-мрію (FR-INTAKE-04) — можна пропустити (skip_tastes). Коли лід називає смаки — навіть коротко («поп», «Океан Ельзи») — це і Є відповідь: одразу запишіть save_tastes, не перепитуйте.",
      };
    }
    if (fields.experience === undefined || fields.comfort === undefined) {
      return {
        field: "experienceComfort",
        instruction: "запитайте попередній досвід і рівень комфорту зі співом (FR-INTAKE-05).",
      };
    }
    return null;
  }

  if (conversationState === "collecting") {
    if (fields.preferredWeekdays === undefined) {
      return { field: "preferredWeekdays", instruction: "запитайте бажані дні тижня (FR-INTAKE-06)." };
    }
    if (fields.preferredTimeRange === undefined) {
      return { field: "preferredTimeRange", instruction: "запитайте бажаний часовий проміжок (FR-INTAKE-06)." };
    }
    return null;
  }

  if (conversationState === "proposing") {
    return {
      field: "slots",
      instruction: "профіль зібрано повністю — запропонуйте вільні слоти інструментом propose_slots.",
    };
  }

  // "awaiting_admin", "done", "soft_decline": nothing left to actively
  // collect — only amend_request/cancel_request (non-terminal) remain live
  // tools, and even those are refused by the reducer once terminal.
  return null;
}
