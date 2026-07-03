// Pure two-pass prompt builders (TC-PURE-01): no LLM call, no IO, no DOM.
// Pass 1 (generation) and pass 2 (grounding) are built independently and share
// NO context — the grounding builder never receives the generation prompt, the
// JD, or the ranked requirements (BC-HONESTY-01 / FR-BULLETS-03).

import type {
  ConfirmedAnswerEvidence,
  ExtractionInput,
  GenerationInput,
  GroundingInput,
  Prompt,
  PromptMessage,
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

// --- Pass 1: generation prompt --------------------------------------------

/**
 * Build the generation prompt (pass 1). Includes the JD, the ranked
 * requirements, the candidate's CV skills + sentences (FR-TAILOR-02), and —
 * if the wizard collected any — confirmed answers as a second, clearly
 * labeled evidence lane (BC-HONESTY-03).
 */
export function buildGenerationPrompt(input: GenerationInput): Prompt {
  const { cvProfile, requirements, jobDescription, confirmedAnswers } = input;

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
    "",
    "Переформулюй досвід кандидата у пункти, адаптовані під вимоги вакансії.",
  ].join("\n");

  const messages: readonly PromptMessage[] = [
    { role: "system", content: GENERATION_SYSTEM_PROMPT },
    { role: "user", content: userContent },
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
