// Pure two-pass prompt builders (TC-PURE-01): no LLM call, no IO, no DOM.
// Pass 1 (generation) and pass 2 (grounding) are built independently and share
// NO context — the grounding builder never receives the generation prompt, the
// JD, or the ranked requirements (BC-HONESTY-01 / FR-BULLETS-03).

import type {
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
  "Твоє єдине джерело істини — речення з резюме кандидата, наведені нижче.",
  "Для кожного пункту визнач, чи він повністю підтверджується цими реченнями.",
  'Якщо підтверджується — познач "grounded" і вкажи точне речення-доказ.',
  'Якщо є будь-яке твердження без прямого підтвердження — познач "overclaim-risk".',
  "Не роби припущень і не додавай нічого поза наведеними реченнями.",
  "Поверни ЛИШЕ валідний JSON без пояснень, у форматі:",
  '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"..."}]}',
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

// --- Pass 1: generation prompt --------------------------------------------

/**
 * Build the generation prompt (pass 1). Includes the JD, the ranked
 * requirements, and the candidate's CV skills + sentences (FR-TAILOR-02).
 */
export function buildGenerationPrompt(input: GenerationInput): Prompt {
  const { cvProfile, requirements, jobDescription } = input;

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
 * Build the grounding prompt (pass 2). Receives ONLY the generated bullets and
 * the raw CV sentences — never the generation prompt, the JD, or the ranked
 * requirements (BC-HONESTY-01 / FR-BULLETS-03).
 */
export function buildGroundingPrompt(input: GroundingInput): Prompt {
  const { bullets, cvSentences } = input;

  const userContent = [
    "## Речення з резюме кандидата (єдине джерело істини)",
    formatSentences(cvSentences),
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
