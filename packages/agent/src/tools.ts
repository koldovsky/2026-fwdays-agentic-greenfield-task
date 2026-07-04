// @kamerton/agent — the CLOSED tool set (tasks.md 4.3, design.md Decision 2).
//
// This is a plain DATA module — one literal array of tool definitions, no
// branching, no I/O, nothing to fake — the same "no behaviour to fake" shape
// as `lib/src/intake/copy.ts`'s guardrail copy constants (2.4's own
// precedent) and this package's own `MODEL_CONFIG` (model-port.ts). It ships
// real content in this red round rather than a throwing stub: there is no
// function body a stub convention could meaningfully hollow out here, only
// a closed list the tasks.md 4.3 test asserts shape on.
//
// This is deliberately the SAME closed-tool-set discipline AGENTS.md names
// for FR-GUARD-01/06 (the model "only picks from code-vetted options"),
// applied to the intake domain: every enum-shaped parameter below
// (`save_format`, `save_goal`'s `goalTag`, `amend_field`'s `field`) is
// checked TWICE — once by this JSON Schema (the model literally cannot ask
// the API to call the tool with an out-of-enum value without the API
// rejecting the request), once by the `lib/` validator behind it
// (`validateAge`/`validateFormat`, already implemented — section 2/3).
//
// NAMES ARE THE GUARDRAIL SURFACE: this list, and only this list, is what
// tools.test.ts's static assertion checks for an absent `confirm*`/
// `*kb*write*` name (`@trace FR-GUARD-01`, `@trace FR-GUARD-06`). Do not add
// a booking-confirmation or knowledge-base-write tool here, ever — see
// design.md Decision 2 and AGENTS.md's guardrail rules.
//
// `log_question`/`answer_faq` are deliberately NOT in this list (design.md
// Decision 2's "chosen (b)": omit them from this slice, rely on a
// deterministic static-prompt fallback line instead of a half-built KB
// feature — S5 `kb-learning` owns the real tools and the `questions` table).
//
// `propose_slots`/`request_hold`'s schemas are intentionally minimal
// (parameterless triggers) — the loop supplies the actual `ProposeRequest`/
// `HoldRequest` payload itself from the already-collected `IntakeFields` and
// a server-computed horizon, per design.md Decision 2 ("wraps S1's
// proposeSlots"/"holdWithRecovery"); the model does not need to, and must
// not be trusted to, invent scheduling parameters.

import type { ToolDefinition } from "./model-port.ts";

/** The GoalTag enum, duplicated here (not imported from
 *  `@kamerton/lib/src/intake/state-machine.ts`) deliberately: a tool JSON
 *  Schema is data the Anthropic API validates against, a wire-format
 *  contract that must stay stable even if the reducer's internal type
 *  changes shape — same reasoning `lib/src/intake/format.ts`'s header gives
 *  for keeping `CandidateFormat` as the shared source of truth for
 *  `save_format` specifically (imported below), while the less
 *  guardrail-critical `goalTag` enum is simply kept in sync by hand and
 *  covered by tools.test.ts. */
const GOAL_TAGS = ["karaoke", "performance", "confidence", "hobby", "other"] as const;

/** The exact candidate-format enum `save_format` accepts — BOTH the two
 *  bookable formats and the two detour values (`unsure`/`instrument`), so
 *  the reducer's own `validateFormat` (defense in depth) is what turns a
 *  syntactically valid tool call into a detour, never the schema alone
 *  (design.md Decision 1's "Age/format validation gate"). */
const CANDIDATE_FORMATS = ["individual", "group", "unsure", "instrument"] as const;

/**
 * The closed tool set for this slice (design.md Decision 2) — exactly these
 * sixteen tools, no more, no fewer. `tools.test.ts` pins this list's shape;
 * changing it is a spec-level decision, not a casual edit.
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: "save_name",
    description: "Записати ім'я учня/учениці, яке назвав лід (FR-INTAKE-01).",
    input_schema: {
      type: "object",
      properties: { name: { type: "string", description: "Ім'я учня/учениці, як назвав лід." } },
      required: ["name"],
    },
  },
  {
    name: "save_age",
    description:
      "Записати вік учня/учениці ЯК ЦІЛЕ ЧИСЛО (FR-INTAKE-02). Викликати лише коли модель впевнено розпізнала число — інакше перепитати текстом, без виклику інструменту.",
    input_schema: {
      type: "object",
      properties: { age: { type: "integer", description: "Вік учня/учениці, ціле число років." } },
      required: ["age"],
    },
  },
  {
    name: "save_format",
    description:
      "Записати обраний формат занять (FR-INTAKE-02). 'unsure' і 'instrument' — НЕ помилка виклику: реєстратор сам поверне відповідний детур (BC-SCOPE-01/02, BC-FORMAT-01).",
    input_schema: {
      type: "object",
      properties: {
        format: { type: "string", enum: [...CANDIDATE_FORMATS], description: "Обраний або названий формат." },
      },
      required: ["format"],
    },
  },
  {
    name: "save_goal",
    description: "Записати мету занять — код-тег плюс дослівний текст ліда (FR-INTAKE-03).",
    input_schema: {
      type: "object",
      properties: {
        goalTag: { type: "string", enum: [...GOAL_TAGS], description: "Найближчий код-тег мети." },
        goalText: { type: "string", description: "Дослівна відповідь ліда про мету занять." },
      },
      required: ["goalTag", "goalText"],
    },
  },
  {
    name: "skip_goal",
    description: "Лід не назвав конкретну мету — пропустити поле без запису значення (FR-INTAKE-03).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "save_tastes",
    description: "Записати музичні смаки, і опційно мрію-пісню, які назвав лід (FR-INTAKE-03).",
    input_schema: {
      type: "object",
      properties: {
        tastes: { type: "string", description: "Дослівний опис музичних смаків ліда." },
        dreamSong: { type: "string", description: "Пісня-мрія, якщо лід її назвав." },
      },
      required: ["tastes"],
    },
  },
  {
    name: "skip_tastes",
    description: "Лід не назвав музичні смаки — пропустити поле без запису значення (FR-INTAKE-03).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "save_experience_comfort",
    description: "Записати досвід і рівень комфорту зі співом, які описав лід (FR-INTAKE-04/05).",
    input_schema: {
      type: "object",
      properties: {
        experience: { type: "string", description: "Дослівний опис попереднього досвіду." },
        comfort: { type: "string", description: "Дослівний опис рівня комфорту зі співом." },
      },
      required: ["experience", "comfort"],
    },
  },
  {
    name: "save_weekdays",
    description: "Записати бажані дні тижня для занять (FR-INTAKE-06).",
    input_schema: {
      type: "object",
      properties: { weekdays: { type: "string", description: "Дослівний опис бажаних днів тижня." } },
      required: ["weekdays"],
    },
  },
  {
    name: "save_time_range",
    description: "Записати бажаний часовий проміжок для занять (FR-INTAKE-06).",
    input_schema: {
      type: "object",
      properties: { timeRange: { type: "string", description: "Дослівний опис бажаного часу занять." } },
      required: ["timeRange"],
    },
  },
  {
    name: "amend_field",
    description:
      "Виправити раніше збережене поле в будь-якому нетермінальному стані (FR-INTAKE-07), напр. \"насправді їй 7, не 6\".",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          description: "Назва поля профілю, яке лід виправляє.",
          enum: [
            "studentName",
            "studentAge",
            "format",
            "goalTag",
            "goalText",
            "tastes",
            "dreamSong",
            "experience",
            "comfort",
            "preferredWeekdays",
            "preferredTimeRange",
          ],
        },
        value: { description: "Нове значення поля (тип залежить від поля)." },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "cancel_request",
    description: "Лід просить скасувати заявку до рішення адміністратора (FR-INTAKE-07).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "explain_scope",
    description:
      "Лід запитав про інструментальні уроки (не вокал) — дати деталь-незалежне пояснення меж школи (BC-SCOPE-01/02), не рухаючи стан розмови.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "explain_format",
    description:
      "Лід не впевнений у форматі занять — дати пояснення відмінності індивідуальних/групових занять (BC-FORMAT-01), не рухаючи стан розмови.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "propose_slots",
    description:
      "Профіль зібрано повністю (стан 'proposing') — запропонувати вільні слоти на основі вже збережених вподобань (design.md Decision 2, wraps S1 proposeSlots). Параметри обчислює реєстратор, не модель.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "request_hold",
    description:
      "Лід обрав конкретний запропонований слот — утримати його в календарі до рішення адміністратора (design.md Decision 2, wraps S1 holdWithRecovery). Слот обирається з уже запропонованого списку, не вигадується моделлю.",
    input_schema: {
      type: "object",
      properties: {
        slotIndex: { type: "integer", description: "Індекс обраного слоту у списку, який щойно запропонували." },
      },
      required: ["slotIndex"],
    },
  },
];

/** Convenience projection used by tools.test.ts's set-equality assertion and
 *  by the loop's tool-name dispatch (a later task) alike. */
export const TOOL_NAMES: string[] = TOOLS.map((tool) => tool.name);
