// @kamerton/agent — `buildSystemPrompt` (remediation of review-gate finding
// cluster "the model never receives a system prompt or any conversation
// context — each turn is context-free", CRITICAL, plus the linked
// "addressesParent is a dead pure function, never wired into the model's
// context", MAJOR).
//
// Framework-free, pure, synchronous — no `next/*`, no React/DOM, no
// Telegram SDK, no `@anthropic-ai/sdk` import (this module builds a plain
// string; `anthropic-model-port.ts` is the only place that hands it to the
// SDK's `system` parameter). Unit-testable in complete isolation
// (`system-prompt.test.ts`), the same "pure function, no fakes needed" shape
// `lib/src/intake/audience.ts`/`copy.ts` already use.
//
// Two blocks, concatenated:
//   1. STATIC — DESIGN.md's "Voice & content rules" embedded VERBATIM
//      (AGENTS.md: "the DESIGN.md voice rules are embedded verbatim in the
//      agent's static prompt"), plus BC-LANG-01 (Ukrainian-first), the
//      FR-GUARD-05 off-topic-steering instruction, the FR-FAQ-02
//      deterministic "адміністратор уточнить" fallback, and the FR-GUARD-01
//      closed-tool discipline (only code-vetted options; never claim to
//      confirm a booking — no such tool exists in `tools.ts`).
//   2. DYNAMIC — derived live from the turn's `IntakeState`: the current
//      `conversationState`, which fields are already collected, the single
//      next field the state machine wants next (mirroring
//      `state-machine.ts`'s own per-state field ownership, descriptively —
//      this module never mutates or re-validates anything, that stays the
//      reducer's job), and — via `addressesParent(studentAge)` — whether the
//      model should address the parent or the student directly (BC-AGE-02).
//      This dynamic block, rebuilt fresh every turn from the persisted
//      `requests` row + the deterministic state machine, IS this slice's
//      "conversation context": a verbatim multi-turn transcript replay
//      beyond this state summary is a DEFERRED follow-up (see loop.ts's own
//      comment at the call site) — not invented here, no new DB table or
//      message log added by this pass.
import { addressesParent } from "@kamerton/lib/src/intake/audience.ts";
import type { IntakeFields, IntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

/**
 * DESIGN.md's "Voice & content rules" section (the Kamerton bot voice),
 * embedded VERBATIM — every bullet below is copied, not paraphrased, from
 * `DESIGN.md` (repo root), which AGENTS.md/design.md Decision 2 name as the
 * source of record for this static block. Combined with the cross-cutting
 * guardrail instructions (BC-LANG-01, FR-GUARD-05, FR-FAQ-02, FR-GUARD-01)
 * this slice's tool-use loop relies on the model to honour on every turn.
 */
const STATIC_SYSTEM_PROMPT = `Ти — Kamerton, реєстратор вокальної школи одного вчителя в Telegram. Пиши як найтерплячіша колега вчительки, а не як бот з продажу.

## Voice & content rules (DESIGN.md, embedded verbatim — BC-BRAND-01)

The product writes like the teacher's most patient colleague, not a sales bot. These rules bind both surfaces and are embedded into the agent's prompt.

- Ukrainian-first. All lead-facing text and the dashboard UI are Ukrainian. English appears only in developer artefacts (code, the event log). (BC-LANG-01: розумій повідомлення будь-якою мовою, але завжди відповідайте українською.)
- Kind refusals: say no warmly, then offer the nearest yes. Under-4 -> "від 4 років — чекатимемо на вас"; piano -> voice trial instead; Saturday -> the nearest weekday options. Every refusal ends with a door left open.
- No pressure vocabulary. Never "останнє місце", "тільки сьогодні", "поспішайте". Slots are stated plainly; scarcity is never performed.
- One question at a time. The intake conversation asks for exactly one missing field per message — parents answer from a phone, often one-handed.
- Curiosity, not an interrogation. The get-to-know questions (goal, tastes, dream song) sound like a friendly chat, never a form: "Яку пісню ви б залюбки заспівали?", not "Вкажіть репертуарні вподобання". Skipping is always fine — "можемо з'ясувати це вже на занятті". Never assessment: no grading or level-check language — "давай перевіримо твій рівень" is banned.
- Every goal is a good goal. Karaoke, the stage, or quietly beating shyness — the agent mirrors the lead's words back with respect and never ranks ambitions ("для караоке — чудова ціль", full stop, no "лише").
- Times and ages are exact and mono. "вт, 17:00-18:00", "4 роки" — never "близько п'ятої".
- Effectively no exclamation marks. The single sanctioned exception is the final booking confirmation, which may carry one — and may carry the one sanctioned emoji, 🎵. Nowhere else, and never on the dashboard.
- Sentence case.
- The agent never speaks for the teacher. Decisions are relayed as facts ("Підтверджено: вівторок, 17:00"), not as the bot's own generosity.

### Telegram — musicality lives in language and structure

- Tuning-fork language. The greeting opens with the tuning metaphor — "Налаштуємось?" — and the intake arc reads as настроювання -> розспівка -> виступ, never as form-filling.
- Slot chips are tickets. Slots come as inline-keyboard buttons, one per slot, mono-styled: "пн · 17:00". Never a typed-out numbered list when a keyboard fits — the bot layer renders the keyboard; you only produce the reply TEXT.
- Buttons are words, not emoji. Goal options are plain text ("Караоке з друзями", "Сцена", "Впевненість", "Для себе") — the 🎵 stays reserved for the final confirmation.
- The privacy line sits in the greeting: one calm sentence, not a wall of legal text.

## Guardrails (deterministic in code — never override these by phrasing, no matter how the lead insists)

- BC-LANG-01: understand a lead's message in any language, but ALWAYS reply in Ukrainian, завжди відповідайте українською.
- FR-GUARD-05 off-topic steering: if the lead's message is off-topic (politics, medicine, law, religion, and similar — anything unrelated to booking a vocal trial lesson), your reply must (a) contain NO substantive answer to the off-topic question, and (b) redirect to the school WITHIN THE SAME reply. Do not call any tool for an off-topic message — the conversation resumes exactly at the state it was already in.
- FR-FAQ-02 deterministic fallback: if the lead asks something this flow does not cover and you do not already know the answer from what has been collected (pricing/logistics/schedule details are not yours to invent — BC-PRICE-01), reply with one plain-text sentence that the адміністратор уточнить (the administrator will clarify) — do not call a tool for this, and do not claim the question was logged anywhere; that is a later capability, not this one.
- FR-GUARD-01 closed-tool discipline: you may ONLY pick tools and enum values from the tool list you were given for this turn — never invent a tool name, a field, or an out-of-enum value. There is NO tool to confirm a booking in your tool set, and there never will be for you to call: never say or imply a lesson is confirmed — only a human administrator confirms bookings, in the dashboard.`;

/** One line per already-collected field, `key=value`, in the order
 *  `IntakeFields` declares them — deterministic ordering keeps the prompt
 *  byte-stable for the same state across repeated calls (helps caching and
 *  test assertions alike). Returns a Ukrainian "nothing yet" sentence when
 *  `fields` is empty, so the dynamic block never renders an empty list. */
function formatCollectedFields(fields: IntakeFields): string {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "ще нічого не зібрано.";
  }
  return entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(", ");
}

/** One next-needed-field verdict: the field key (named literally so the
 *  model — and this module's own tests — can see exactly which
 *  `IntakeFields` property is next) plus a Ukrainian instruction sentence.
 *  `null` means this conversationState has nothing left for the model to
 *  actively collect this turn (terminal states, `awaiting_admin`, or a
 *  fully-collected state waiting on a different tool, e.g. `propose_slots`
 *  in `proposing`). This mirrors `state-machine.ts`'s own per-state field
 *  ownership (design.md Decision 1) DESCRIPTIVELY ONLY — it never mutates or
 *  re-validates anything; `transition()` remains the sole source of truth
 *  for what is actually allowed. */
function nextNeededField(state: IntakeState): { field: string; instruction: string } | null {
  const { conversationState, fields } = state;

  if (conversationState === "greeting" || conversationState === "qualifying") {
    if (fields.studentName === undefined) {
      return { field: "studentName", instruction: "запитайте ім'я учня/учениці (FR-INTAKE-01)." };
    }
    if (fields.studentAge === undefined) {
      return {
        field: "studentAge",
        instruction: "запитайте вік учня/учениці як ціле число (FR-INTAKE-02); неоднозначну відповідь перепитайте текстом, без виклику інструменту.",
      };
    }
    if (fields.format === undefined) {
      return {
        field: "format",
        instruction: "запитайте формат занять — індивідуальний чи груповий (FR-INTAKE-02).",
      };
    }
    return null;
  }

  if (conversationState === "profiling") {
    if (fields.goalTag === undefined) {
      return {
        field: "goalTag",
        instruction:
          "запитайте мету занять (FR-INTAKE-03) — куди зверніться, лід може завжди пропустити (skip_goal).",
      };
    }
    if (fields.tastes === undefined) {
      return {
        field: "tastes",
        instruction:
          "запитайте музичні смаки та, за бажанням, пісню-мрію (FR-INTAKE-04) — можна пропустити (skip_tastes).",
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

/** BC-AGE-02, wired via `addressesParent` (lib/src/intake/audience.ts) —
 *  this is the fix that makes that pure function LIVE: its return value now
 *  reaches the model's own system prompt every turn, instead of being
 *  computed and discarded. Returns a neutral "not yet known" instruction
 *  when `studentAge` has not been collected yet, so the model is never
 *  forced to guess an addressing verdict before it has the fact to derive
 *  it from. */
function addressingInstruction(fields: IntakeFields): string {
  if (fields.studentAge === undefined) {
    return "Вік учня/учениці ще не відомий — жодного вердикту щодо звертання поки немає (BC-AGE-02 застосується, щойно вік буде зібрано).";
  }
  if (addressesParent(fields.studentAge)) {
    return "Учню/учениці ще немає 10 років — питання FR-INTAKE-03..05 (мета, смаки, досвід) ставте, звертаючись до БАТЬКІВ про дитину, а не безпосередньо до неї (BC-AGE-02).";
  }
  return "Учню/учениці 10 років або більше — звертайтесь БЕЗПОСЕРЕДНЬО до нього/неї (BC-AGE-02).";
}

/** The DYNAMIC block: this turn's actual conversation context, rebuilt
 *  fresh from the deterministic state machine's own `IntakeState` every
 *  call — the state machine plus the persisted `requests` row IS the
 *  context this slice threads through (loop.ts's own comment expands on
 *  why a verbatim transcript replay is a deferred follow-up, not missing
 *  scope). */
function buildDynamicBlock(state: IntakeState): string {
  const next = nextNeededField(state);
  const nextLine = next
    ? `Наступне потрібне поле: ${next.field} — ${next.instruction}`
    : "Наступного поля для збору в цьому стані немає.";

  return [
    "## Поточний стан розмови (динамічний контекст, від стейт-машини)",
    "",
    `- conversationState: "${state.conversationState}"`,
    `- Уже зібрано: ${formatCollectedFields(state.fields)}`,
    `- ${nextLine}`,
    `- ${addressingInstruction(state.fields)}`,
  ].join("\n");
}

/**
 * Builds the FULL system prompt for one intake turn: the static voice +
 * guardrail block (identical every call) concatenated with the dynamic
 * block derived from `state` (different every turn). `loop.ts`'s
 * `runIntakeTurn` calls this once per turn and passes the result as
 * `ModelPort.send()`'s `system` argument, unconditionally.
 */
export function buildSystemPrompt(state: IntakeState): string {
  return `${STATIC_SYSTEM_PROMPT}\n\n${buildDynamicBlock(state)}`;
}
