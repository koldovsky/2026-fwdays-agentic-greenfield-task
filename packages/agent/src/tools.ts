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
// `answer_faq`/`log_question` (kb-learning design.md Decision 4, tasks.md
// C.2) — S5's two logging-only KB tools, ADDED to this closed set. Each
// carries ONLY a `question: string` input, no answer/content payload: the
// model never hands the answer text to a tool, it narrates the reply itself
// in the SAME turn, grounded exclusively in the KB block system-prompt.ts
// folds into context every turn (`@trace FR-FAQ-01`, `@trace FR-FAQ-02`).
// These two names are, by construction, never a knowledge-base-WRITE tool
// (`@trace FR-GUARD-06`) — no agent tool ever appends to `knowledge/school.md`;
// only `apps/dashboard/lib/kb-write.ts` does that.
//
// `propose_slots`' schema (booking-hitl design.md Decision 2's sub-decision,
// tasks.md C.1) gains structured `weekdays`/`timeWindow` parameters — the
// model re-extracts them from the lead's already-collected free-text
// preferences (the same "extract, don't invent" trust boundary `save_age`
// already relies on); a new `lib/src/booking/validate-preferences.ts` guard
// checks them again, code-side, before `ports.slots.proposeSlots(...)` is
// ever called (defense in depth — the model cannot bypass this by ignoring
// its own schema enum). `request_hold`'s existing `slotIndex` schema needs no
// change — it already expresses "pick from the list just offered", never
// inventing a slot.

import type { ToolDefinition } from "./model-port.ts";

/** The exact weekday enum `propose_slots.weekdays` accepts (booking-hitl
 *  design.md Decision 2's sub-decision) — duplicated here rather than
 *  imported from `@kamerton/lib/src/booking/validate-preferences.ts`,
 *  deliberately, same "wire-format contract stays stable even if the
 *  reducer/validator's internal type changes shape" reasoning this file's
 *  header already gives for `GoalTag`. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/** The exact candidate-format enum `save_format` accepts — BOTH the two
 *  bookable formats and the two detour values (`unsure`/`instrument`), so
 *  the reducer's own `validateFormat` (defense in depth) is what turns a
 *  syntactically valid tool call into a detour, never the schema alone
 *  (design.md Decision 1's "Age/format validation gate"). */
const CANDIDATE_FORMATS = ["individual", "group", "unsure", "instrument"] as const;

/**
 * The closed tool set for this slice (design.md Decision 2; kb-learning
 * design.md Decision 4 adds `answer_faq`/`log_question`) — exactly these
 * thirteen tools, no more, no fewer. The five former "profiling" tools
 * (save_goal/skip_goal/save_tastes/skip_tastes/save_experience_comfort) were
 * REMOVED 2026-07-09 when the MVP intake became mandatory-only (5 steps:
 * name+age, format, weekdays+time, propose, pick) — the model is no longer
 * offered any goal/tastes/experience tool. `tools.test.ts` pins this list's
 * shape; changing it is a spec-level decision, not a casual edit.
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
          // Only the mandatory-only MVP fields (2026-07-09): goal/tastes/
          // dream-song/experience/comfort were dropped, so they are NOT
          // amendable — the closed tool set must not expose a field the flow
          // never collects (CodeRabbit; mirrors the toIntakeEvent guard).
          enum: [
            "studentName",
            "studentAge",
            "format",
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
      "Профіль зібрано повністю (стан 'proposing') — запропонувати вільні слоти на основі бажаних днів тижня та часового проміжку, які лід назвав текстом (booking-hitl design.md Decision 2, wraps S1 proposeSlots). Модель виокремлює ці два параметри з відповіді ліда; реєстратор (validatePreferences) перевіряє їх, перш ніж звертатись до календаря. Якщо преференція ВІДКРИТА («будь-який день», «будь-коли», «все одно», «немає різниці») — передавайте УСІ робочі дні weekdays=['Mon','Tue','Wed','Thu','Fri'] та/або повне денне вікно timeWindow={start:'10:00',end:'20:00'} (заняття йдуть з 10:00 до 20:00); код (rankSlots) сам обере найкращі 2-3 варіанти. НІКОЛИ не відмовляйтесь пропонувати через «задовгий діапазон».",
    input_schema: {
      type: "object",
      properties: {
        weekdays: {
          type: "array",
          items: { type: "string", enum: [...WEEKDAYS] },
          description: "Дні тижня (з переліку Пн-Пт), які назвав лід, як код-значення англійською.",
        },
        timeWindow: {
          type: "object",
          description: "Бажаний часовий проміжок протягом дня, який назвав лід.",
          properties: {
            start: { type: "string", description: "Початок бажаного проміжку, формат HH:mm." },
            end: { type: "string", description: "Кінець бажаного проміжку, формат HH:mm." },
          },
          required: ["start", "end"],
        },
        date: {
          type: "string",
          description:
            "Конкретна дата YYYY-MM-DD, ЯКЩО лід назвав певний день (напр. «завтра», «у пʼятницю», «14 липня») — визнач її відносно «сьогодні» з контексту. Тоді слоти пропонуються САМЕ на цей день. weekdays і timeWindow все одно передай (можна усі дні + повне вікно) — за наявності date код використає саме дату. Пропускай це поле, коли лід дав лише загальні дні тижня.",
        },
      },
      required: ["weekdays", "timeWindow"],
    },
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
  {
    name: "answer_faq",
    description:
      "Питання ліда покрите базою знань цього ходу (FR-FAQ-01) — викликати ПІСЛЯ того, як ви самі, у цій самій відповіді, склали репліку, обґрунтовану ВИКЛЮЧНО блоком «База знань» нижче. Інструмент лише фіксує факт і текст питання (FR-GUARD-06) — жодної відповіді сюди не передавайте, модель ніколи не вписує в аргумент саму відповідь чи цифру.",
    input_schema: {
      type: "object",
      properties: { question: { type: "string", description: "Дослівний текст питання, яке поставив лід." } },
      required: ["question"],
    },
  },
  {
    name: "log_question",
    description:
      "Питання ліда НЕ покрите блоком «База знань» цього ходу (FR-FAQ-02) — викликати ПІСЛЯ того, як ви самі відповіли лідові одним реченням, що адміністраторка уточнить. Інструмент лише фіксує факт і текст питання для черги адміністраторки (FR-GUARD-06) — жодної відповіді, ціни чи умови сюди не передавайте.",
    input_schema: {
      type: "object",
      properties: { question: { type: "string", description: "Дослівний текст питання, яке поставив лід." } },
      required: ["question"],
    },
  },
];

/** Convenience projection used by tools.test.ts's set-equality assertion and
 *  by the loop's tool-name dispatch (a later task) alike. */
export const TOOL_NAMES: string[] = TOOLS.map((tool) => tool.name);
