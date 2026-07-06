// @kamerton/lib — deterministic, lead-facing "what should the bot say next"
// copy for the intake flow (conversational-flow bugfix: live Telegram
// testing found that after the lead answers a field, the model returns a
// `save_*` tool-use block with NO accompanying text — the
// `ClaudeAgentModelPort`'s `canUseTool` captures the first tool-use and
// aborts the turn before the model ever narrates a follow-up question, per
// design — so the CODE, not the model, must own asking the next question,
// deterministically, every turn a field-recording/advancing tool call
// applies. See `packages/agent/src/loop.ts`'s reply-assembly for the caller.
//
// Pure, synchronous, framework-free (TC-PURE-01) — no I/O, no LLM call, same
// discipline as this directory's other guardrail copy (`copy.ts`) and
// derived predicates (`audience.ts`). Colocated `questions.test.ts`.
//
// Voice (DESIGN.md, BC-BRAND-01): kind, one question at a time, curiosity
// rather than an interrogation/assessment ("Яку пісню ви б залюбки
// заспівали?", never "Вкажіть репертуарні вподобання" or "перевірмо твій
// рівень"), no exclamation marks (the sole exception, the final booking
// confirmation, is a different slice's copy), no pressure vocabulary, and
// BC-AGE-02 parent-vs-student addressing via `addressesParent` wherever the
// question is ABOUT the student (goal/tastes/experience) rather than a
// neutral fact (name/age/format/weekdays/time-range).
import { addressesParent } from "./audience.ts";
import { AGE_REFUSAL_COPY } from "./copy.ts";
import { nextNeededField, type NeededField } from "./next-field.ts";
import type { IntakeState } from "./state-machine.ts";

/** The deterministic warm acknowledgement `loop.ts` prefixes a question with
 *  when the model's own response carried no narration text alongside its
 *  tool-use block (the common case, per this bugfix's root cause) — never a
 *  substitute for the model's real narration when one exists. */
export const DEFAULT_ACK_COPY: string = "Дякую, записала.";

/** Sent once the flow reaches `proposing` (profile fully collected) — live
 *  slot proposal itself is deferred to a later slice (S4), so this is a
 *  warm, honest "we'll follow up" note rather than a dangling ack. */
export const PROFILE_COMPLETE_CLOSING_COPY: string =
  "Дякую, тепер зібрано весь профіль. Підберемо для вас зручні варіанти часу і повернемось із пропозицією.";

/** Sent once a `cancel_request` moves the conversation to the terminal
 *  `done` state — the door stays open, no pressure vocabulary, no
 *  exclamation mark (BC-BRAND-01). */
export const CANCELLED_CLOSING_COPY: string =
  "Гаразд, заявку скасовано. Якщо передумаєте — завжди раді бачити вас знову.";

/** Sent for the (currently unreachable via this loop's own `transition()`
 *  calls, but defensively covered so no terminal/awaiting resulting state
 *  ever produces a dangling ack) `awaiting_admin` conversationState. */
export const AWAITING_ADMIN_CLOSING_COPY: string =
  "Дякую, усе зібрано — тепер дочекаємось рішення адміністратора і одразу повідомимо.";

/** One deterministic, warm, Ukrainian, curiosity-shaped question per
 *  next-needed field — `parentAddressed` (BC-AGE-02) only changes wording
 *  for the questions that are actually ABOUT the student (goal/tastes/
 *  experience); neutral fact questions (name/age/format/weekdays/time) never
 *  need an addressing verdict. */
function questionFor(field: NeededField, parentAddressed: boolean): string {
  switch (field) {
    case "studentName":
      return "Як звати учня чи ученицю, яку записуємо на пробне заняття?";
    case "studentAge":
      return "Скільки років учню чи учениці?";
    case "format":
      return "Який формат занять цікавить — індивідуальний чи груповий?";
    case "goalTag":
      return parentAddressed
        ? "Яка мета занять у дитини — може, караоке з друзями, сцена, впевненість у собі чи просто задоволення? Це питання можна й пропустити."
        : "Яка мета занять вам ближча — може, караоке з друзями, сцена, впевненість у собі чи просто задоволення? Це питання можна й пропустити.";
    case "tastes":
      return parentAddressed
        ? "Які пісні чи виконавці подобаються дитині? Можливо, є пісня-мрія, яку хотілося б заспівати? Можна й пропустити це питання."
        : "Які музичні смаки вам ближчі? Можливо, є пісня-мрія, яку хотілося б заспівати? Можна й пропустити це питання.";
    case "experienceComfort":
      return parentAddressed
        ? "Чи є в дитини попередній досвід співу, і наскільки їй комфортно співати?"
        : "Чи є попередній досвід співу, і наскільки вам комфортно співати?";
    case "preferredWeekdays":
      return "Які дні тижня зручні для занять?";
    case "preferredTimeRange":
      return "У який час доби зручніше — зранку, вдень чи ввечері?";
    case "slots":
      // Reached only for conversationState "proposing" — nextLeadFacingStep
      // never routes here (it special-cases "proposing" as a closing note
      // BEFORE consulting this map), kept exhaustive for type-safety only.
      return PROFILE_COMPLETE_CLOSING_COPY;
  }
}

/** One verdict for "what should the lead-facing reply say next", given the
 *  RESULTING `IntakeState` after a field-recording/advancing tool call
 *  applied this turn — `kind: "question"` when another field is still
 *  needed (the caller prefixes this with an ack), `kind: "closing"` when the
 *  conversation reached `proposing`/`awaiting_admin`/a terminal state (the
 *  caller uses this text standalone, never a dangling bare ack). */
export function nextLeadFacingStep(state: IntakeState): { kind: "question" | "closing"; text: string } {
  const { conversationState, fields } = state;

  if (conversationState === "proposing") {
    return { kind: "closing", text: PROFILE_COMPLETE_CLOSING_COPY };
  }
  if (conversationState === "awaiting_admin") {
    return { kind: "closing", text: AWAITING_ADMIN_CLOSING_COPY };
  }
  if (conversationState === "done") {
    return { kind: "closing", text: CANCELLED_CLOSING_COPY };
  }
  if (conversationState === "soft_decline") {
    // The only path to `soft_decline` is an AGE_BELOW_MIN guardrail
    // violation (state-machine.ts's `ageBelowMin()`) — reusing the exact
    // deterministic refusal copy the bot pipeline's own guardrail override
    // already sends (never a second, differently-worded refusal).
    return { kind: "closing", text: AGE_REFUSAL_COPY };
  }

  const next = nextNeededField(state);
  if (next === null) {
    // Defensive fallback — should not happen while this map stays in sync
    // with `nextNeededField`'s own state coverage; never a dangling empty
    // string regardless.
    return { kind: "closing", text: PROFILE_COMPLETE_CLOSING_COPY };
  }

  const parentAddressed = fields.studentAge !== undefined && addressesParent(fields.studentAge);
  return { kind: "question", text: questionFor(next.field, parentAddressed) };
}
