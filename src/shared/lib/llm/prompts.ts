// Pure two-pass prompt builders (TC-PURE-01): no LLM call, no IO, no DOM.
// Pass 1 (generation) and pass 2 (grounding) are built independently and share
// NO context — the grounding builder never receives the generation prompt, the
// JD, or the ranked requirements (BC-HONESTY-01 / FR-BULLETS-03).

import type {
  CareerStage,
  ConfirmedAnswerEvidence,
  CoverLetterInput,
  DocumentAttachment,
  ExtractionInput,
  GenerationInput,
  GroundingInput,
  Prompt,
  PromptMessage,
  SeniorityInput,
} from "./types";

// --- Centralized prompt text (do not scatter string literals) -------------

/**
 * Generation system prompt. Explicitly forbids inventing skills, numbers, or
 * experience absent from the CV (BC-HONESTY-01) and pins Ukrainian-first output
 * (NFR-I18N-01). Asks for strict JSON so the response is machine-parsable.
 */
export const GENERATION_SYSTEM_PROMPT = [
  "Ти — асистент, що адаптує резюме кандидата під конкретну вакансію.",
  "Пиши українською мовою (NFR-I18N-01).",
  "Категорично заборонено вигадувати навички, цифри, компанії чи досвід,",
  "яких немає в тексті резюме кандидата (BC-HONESTY-01).",
  "Кожен пункт має спиратися лише на речення з резюме.",
  "Переформулюй наявний досвід під вимоги вакансії — не додавай нового.",
  // Second evidence lane (BC-HONESTY-03): only appears in the user message
  // when the wizard collected answers — instruction stays constant either way.
  "Якщо надано підтверджені відповіді кандидата на уточнювальні запитання,",
  "став їх нарівні з реченнями резюме як законне джерело для пункта.",
  "Поверни ЛИШЕ валідний JSON без пояснень, у форматі:",
  '{"bullets":[{"id":"b1","text":"...","sourceSentence":"..."}]}',
  'де "sourceSentence" — це точне речення з резюме, на яке спирається пункт.',
].join("\n");

/**
 * Grounding system prompt. A second, stricter verifier with a fresh context: it
 * judges each bullet ONLY against the candidate's own CV sentences and marks it
 * "grounded" or "overclaim-risk" (FR-BULLETS-03, FR-BULLETS-01).
 */
export const GROUNDING_SYSTEM_PROMPT = [
  "Ти — суворий перевіряч достовірності. Ти НЕ бачив, як писалися ці пункти.",
  "Твої єдині джерела істини — речення з резюме кандидата та, якщо наведені",
  "нижче, підтверджені відповіді кандидата на уточнювальні запитання.",
  "Для кожного пункту визнач, чи він повністю підтверджується цими джерелами.",
  'Якщо підтверджується — познач "grounded" і вкажи точний доказ.',
  // evidenceKind is optional in the response (BC-HONESTY-03) — absent parses
  // as "cv" (parse.ts), matching the tolerant house style of this parser.
  'Якщо доказ — речення з резюме, познач evidenceKind як "cv";',
  'якщо доказ — підтверджена відповідь кандидата, познач evidenceKind як "user-confirmed".',
  'Якщо є будь-яке твердження без прямого підтвердження — познач "overclaim-risk".',
  "Не роби припущень і не додавай нічого поза наведеними джерелами.",
  "Поверни ЛИШЕ валідний JSON без пояснень, у форматі:",
  '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"...","evidenceKind":"cv"}]}',
].join("\n");

/**
 * Extraction system prompt (pass 0). Turns a pasted JD into a ranked requirement
 * list with `must-have` / `nice-to-have` labels and matchable keywords
 * (FR-JD-01/02). Sees ONLY the JD — never the CV (it runs before generation).
 */
export const EXTRACTION_SYSTEM_PROMPT = [
  "Ти — аналітик вакансій. З опису вакансії витягни список вимог.",
  "Ранжуй вимоги від найважливішої до найменш важливої.",
  'Кожну вимогу познач "must-have" (обовʼязкова) або "nice-to-have" (бажана).',
  "Для кожної вимоги додай keywords — короткі терміни (технології, навички),",
  "за якими вимогу можна знайти в тексті резюме. Мови програмування та назви",
  "технологій залишай мовою оригіналу.",
  "Не вигадуй вимог, яких немає в описі вакансії.",
  "Поверни ЛИШЕ валідний JSON без пояснень, у форматі:",
  '{"requirements":[{"id":"r1","text":"...","importance":"must-have","keywords":["..."]}]}',
].join("\n");

/**
 * Seniority system prompt (analysis phase). Infers the career stage from the
 * candidate's CV prose ONLY. Explicitly forbids inventing skills, numbers,
 * companies, or experience absent from the CV (BC-HONESTY-01) and pins a
 * Ukrainian rationale (NFR-I18N-01). Conservative by construction — weak signal
 * must not be inflated to "senior".
 */
export const SENIORITY_SYSTEM_PROMPT = [
  "Ти — аналітик резюме. Визнач рівень кандидата (junior, mid або senior)",
  "ВИКЛЮЧНО на основі тексту резюме, наведеного нижче.",
  "Категорично заборонено вигадувати навички, цифри, компанії чи досвід,",
  "яких немає в тексті резюме (BC-HONESTY-01).",
  "Будь консервативним: за слабких сигналів (короткий стаж, відсутність",
  "керівного досвіду) НЕ завищуй рівень до senior.",
  "Обґрунтування пиши українською і спирайся лише на сигнали з резюме.",
  "Поверни ЛИШЕ валідний JSON без пояснень, у форматі:",
  '{"stage":"mid","rationale":"..."}',
].join("\n");

/**
 * Cover-letter system prompt (end of flow, §4). Carries the SAME no-fabrication
 * constraint as generation (BC-HONESTY-01): grounded only in the candidate's CV
 * sentences and confirmed answers, introducing no claim the tailored grounded
 * bullets did not already justify (BC-HONESTY-02). Ukrainian-first (NFR-I18N-01).
 */
export const COVER_LETTER_SYSTEM_PROMPT = [
  "Ти — асистент, що пише супровідний лист кандидата під конкретну вакансію.",
  "Пиши українською мовою (NFR-I18N-01).",
  "Категорично заборонено вигадувати навички, цифри, компанії чи досвід,",
  "яких немає в реченнях резюме або підтверджених відповідях кандидата",
  "(BC-HONESTY-01). Не додавай жодного твердження, яке не спирається на ці",
  "джерела (BC-HONESTY-02).",
  "Використай наведені вимоги вакансії лише щоб обрати, який наявний досвід",
  "підкреслити — не як джерело нових фактів.",
  "Пиши стисло: 2–4 абзаци живою професійною мовою.",
  "Поверни ЛИШЕ валідний JSON без пояснень, у форматі:",
  '{"paragraphs":["...","..."]}',
].join("\n");

// --- Helpers --------------------------------------------------------------

function formatRequirements(
  requirements: GenerationInput["requirements"],
): string {
  if (requirements.length === 0) return "(вимоги відсутні)";
  return requirements
    .map((r, i) => {
      const weight = r.importance === "must-have" ? "обовʼязково" : "бажано";
      return `${i + 1}. [${weight}] ${r.text}`;
    })
    .join("\n");
}

function formatSentences(sentences: readonly string[]): string {
  if (sentences.length === 0) return "(речень немає)";
  return sentences.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

function formatBullets(bullets: GroundingInput["bullets"]): string {
  if (bullets.length === 0) return "(пунктів немає)";
  return bullets.map((b) => `[${b.id}] ${b.text}`).join("\n");
}

function formatConfirmedAnswers(
  confirmedAnswers: readonly ConfirmedAnswerEvidence[],
): string {
  return confirmedAnswers
    .map((c, i) => `${i + 1}. Питання: ${c.question}\n   Відповідь: ${c.answer}`)
    .join("\n");
}

/**
 * A second, clearly labeled evidence block (BC-HONESTY-03) — never merged
 * into the CV sentences list. Empty when `confirmedAnswers` is absent/empty
 * so the baseline prompt output stays byte-for-byte unchanged.
 */
function formatConfirmedAnswersBlock(
  confirmedAnswers: readonly ConfirmedAnswerEvidence[] | undefined,
): readonly string[] {
  if (!confirmedAnswers || confirmedAnswers.length === 0) return [];
  return [
    "",
    "## Підтверджені відповіді кандидата",
    formatConfirmedAnswers(confirmedAnswers),
  ];
}

const CAREER_STAGE_LABEL: Readonly<Record<CareerStage, string>> = {
  junior: "джуніор",
  mid: "мідл",
  senior: "сеньйор",
};

/**
 * A TONE-only calibration block (§3.5) — tells generation/cover-letter to match
 * the candidate's register, explicitly WITHOUT adding facts. Empty when the
 * stage is absent so the baseline prompt stays byte-for-byte unchanged. It is
 * NEVER used by the grounding builder (BC-HONESTY-03).
 */
function formatCareerStageBlock(
  careerStage: CareerStage | undefined,
): readonly string[] {
  if (!careerStage) return [];
  return [
    "",
    "## Рівень кандидата (лише для тону)",
    `Кандидат — ${CAREER_STAGE_LABEL[careerStage]}. Підбирай регістр формулювань`,
    "під цей рівень, але НЕ додавай навичок, цифр чи досвіду понад те, що вже є",
    "в резюме (BC-HONESTY-01).",
  ];
}

/**
 * A note block for the paid multimodal generation pass (T5). Tells the model
 * the attached PDF is the SAME résumé the sentences above came from — a richer
 * source, never a new one — and repeats the no-fabrication rule so widening the
 * input cannot widen the claims (BC-HONESTY-01). Empty when no attachment is
 * present, so the baseline prompt stays byte-for-byte unchanged. NEVER used by
 * the grounding builder (it has no attachment input).
 */
function formatAttachmentBlock(
  attachments: readonly DocumentAttachment[] | undefined,
): readonly string[] {
  if (!attachments || attachments.length === 0) return [];
  return [
    "",
    "## Оригінал резюме (PDF)",
    "До запиту додано оригінальний PDF того самого резюме — те саме джерело",
    "фактів, що й речення вище, лише з повним форматуванням і таблицями.",
    "Використай його, щоб не втратити деталей, але НЕ додавай навичок, цифр,",
    "компаній чи досвіду понад те, що є в резюме (BC-HONESTY-01).",
  ];
}

// --- Pass 0: extraction prompt ---------------------------------------------

/**
 * Build the extraction prompt (pass 0). Carries only the raw JD text
 * (FR-JD-01) — the CV is never part of extraction.
 */
export function buildExtractionPrompt(input: ExtractionInput): Prompt {
  const userContent = [
    "## Опис вакансії",
    input.jobDescription.trim() || "(опис відсутній)",
    "",
    "Витягни ранжований список вимог вакансії.",
  ].join("\n");

  const messages: readonly PromptMessage[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  return { messages };
}

// --- Seniority inference prompt (analysis phase) --------------------------

/**
 * Build the seniority-inference prompt. Carries ONLY the candidate's raw CV
 * text (§3, contextKeys `["cvText"]`) — never the JD, requirements, or bullets.
 * The stage it yields is a tone signal for generation, never a new claim.
 */
export function buildSeniorityPrompt(input: SeniorityInput): Prompt {
  const userContent = [
    "## Резюме кандидата",
    input.cvText.trim() || "(резюме відсутнє)",
    "",
    "Визнач рівень кандидата (junior, mid або senior) лише за цим текстом.",
  ].join("\n");

  const messages: readonly PromptMessage[] = [
    { role: "system", content: SENIORITY_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  return { messages };
}

// --- Cover-letter prompt (end of flow) ------------------------------------

/**
 * Build the cover-letter prompt (§4). Grounded like generation: the candidate's
 * CV sentences and confirmed answers are the only sources of fact; requirements
 * only steer emphasis; the career stage calibrates tone (never adds claims). The
 * confirmed-answers/career-stage blocks stay empty when absent, so the baseline
 * output is byte-stable (mirrors buildGenerationPrompt).
 */
export function buildCoverLetterPrompt(input: CoverLetterInput): Prompt {
  const { requirements, cvSentences, confirmedAnswers, careerStage } = input;

  const userContent = [
    "## Ранжовані вимоги вакансії",
    formatRequirements(requirements),
    "",
    "## Речення з резюме кандидата (єдине джерело фактів)",
    formatSentences(cvSentences),
    ...formatConfirmedAnswersBlock(confirmedAnswers),
    ...formatCareerStageBlock(careerStage),
    "",
    "Напиши супровідний лист, спираючись лише на наведені джерела.",
  ].join("\n");

  const messages: readonly PromptMessage[] = [
    { role: "system", content: COVER_LETTER_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  return { messages };
}

// --- Pass 1: generation prompt --------------------------------------------

/**
 * Build the generation prompt (pass 1). Includes the JD, the ranked
 * requirements, the candidate's CV skills + sentences (FR-TAILOR-02), and —
 * if the wizard collected any — confirmed answers as a second, clearly
 * labeled evidence lane (BC-HONESTY-03).
 */
export function buildGenerationPrompt(input: GenerationInput): Prompt {
  const { cvProfile, requirements, jobDescription, confirmedAnswers, careerStage, attachments } =
    input;

  const userContent = [
    "## Опис вакансії",
    jobDescription.trim() || "(опис відсутній)",
    "",
    "## Ранжовані вимоги вакансії",
    formatRequirements(requirements),
    "",
    "## Навички з резюме кандидата",
    cvProfile.skills.length > 0
      ? cvProfile.skills.join(", ")
      : "(навички відсутні)",
    "",
    "## Речення з резюме кандидата",
    formatSentences(cvProfile.sentences),
    ...formatConfirmedAnswersBlock(confirmedAnswers),
    ...formatCareerStageBlock(careerStage),
    ...formatAttachmentBlock(attachments),
    "",
    "Переформулюй досвід кандидата у пункти, адаптовані під вимоги вакансії.",
  ].join("\n");

  // Attach the document block to the user message only when present, so a
  // text-only run produces the exact same message shape as before T5.
  const userMessage: PromptMessage =
    attachments && attachments.length > 0
      ? { role: "user", content: userContent, attachments }
      : { role: "user", content: userContent };

  const messages: readonly PromptMessage[] = [
    { role: "system", content: GENERATION_SYSTEM_PROMPT },
    userMessage,
  ];

  return { messages };
}

// --- Pass 2: grounding prompt ---------------------------------------------

/**
 * Build the grounding prompt (pass 2). Receives ONLY the generated bullets,
 * the raw CV sentences, and — if the wizard collected any — confirmed answers
 * as a second, clearly labeled evidence lane (BC-HONESTY-03). Never the
 * generation prompt, the JD, or the ranked requirements (BC-HONESTY-01 /
 * FR-BULLETS-03) — the isolation widens, it never loosens.
 */
export function buildGroundingPrompt(input: GroundingInput): Prompt {
  const { bullets, cvSentences, confirmedAnswers } = input;

  const userContent = [
    "## Речення з резюме кандидата (єдине джерело істини)",
    formatSentences(cvSentences),
    ...formatConfirmedAnswersBlock(confirmedAnswers),
    "",
    "## Пункти для перевірки",
    formatBullets(bullets),
    "",
    "Для кожного пункту познач grounded або overclaim-risk.",
  ].join("\n");

  const messages: readonly PromptMessage[] = [
    { role: "system", content: GROUNDING_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  return { messages };
}
