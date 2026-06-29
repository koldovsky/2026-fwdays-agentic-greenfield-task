// @trace FR-REPORT-02 BC-PRIVACY-04 TC-AI-02 NFR-COST-01

/**
 * Summariser prompt builders — pure string assembly, framework-free. The
 * grounding rules live here (TC-AI-02). Data minimisation (BC-PRIVACY-04): the
 * summariser receives only the template questions, the collected answers, and
 * at most a first name — never surname, email, phone, or Telegram. Each open
 * answer is deterministically truncated to a cap so a few very long answers
 * cannot blow the input bound (NFR-COST-01).
 */

import type { TemplateSnapshot } from "@/lib/cycles/snapshot";

type SnapshotQuestion = TemplateSnapshot["questions"][number];

/** Per-answer character cap in the assembled prompt (deterministic truncation). */
export const MAX_ANSWER_CHARS_IN_PROMPT = 2000;

export const SUMMARISER_RULES = [
  "Use ONLY the collected answers below. Never invent facts, numeric scores, ratings, or any detail that is not present in the answers.",
  "Never introduce a person's name or any individual who does not appear in the answers, and never output a surname, email, phone number, or Telegram handle.",
  "Write in Ukrainian, sentence case, calm and confidential tone, with no exclamation marks and no emoji.",
  "Every quote must be copied VERBATIM (character for character, no added quotation marks, no edits) from a single OPEN free-text answer, and attributed by that answer's questionId. Never quote a scale answer (it has no quotable text), never paraphrase, and never merge text from different answers. If no open answer supports a quote, return an empty quotes list.",
  "If the answers do not support a strength or growth area, leave that list shorter or empty rather than inventing one.",
  "Answer only by calling the report_summary tool.",
] as const;

export function buildSummariserSystemPrompt(): string {
  return [
    "You write a confidential Kolo360 HR assessment summary from a respondent's collected answers about a colleague.",
    "Produce concise strengths, growth areas, and short verbatim supporting quotes.",
    "",
    "Rules:",
    ...SUMMARISER_RULES.map((rule, i) => `${i + 1}. ${rule}`),
  ].join("\n");
}

function truncate(text: string): string {
  return text.length <= MAX_ANSWER_CHARS_IN_PROMPT ? text : text.slice(0, MAX_ANSWER_CHARS_IN_PROMPT);
}

/**
 * Render the collected answers for the prompt, keyed by questionId so the model
 * can attribute quotes. `answersById` maps a question id to its answer: open →
 * the respondent's text; scale → the chosen "value — label". Questions with no
 * answer are shown as unanswered (and yield no quotes).
 */
export function buildSummariserUserPrompt(args: {
  questions: ReadonlyArray<SnapshotQuestion>;
  answersById: Readonly<Record<string, string>>;
  subjectFirstName: string | null;
}): string {
  const namePart =
    args.subjectFirstName !== null && args.subjectFirstName.length > 0
      ? `The assessment concerns a colleague whose first name is ${args.subjectFirstName}.`
      : "The colleague's name is not provided.";

  const items = args.questions.map((q) => {
    const answer = args.answersById[q.id];
    const body = answer !== undefined && answer.length > 0 ? truncate(answer) : "(no answer)";
    // Mark scale answers as non-quotable so the model never attributes a quote
    // to a question that has no free text.
    const kind = q.type === "scale" ? " (scale answer — NOT quotable)" : "";
    return `questionId: ${q.id}\nquestion: ${q.text}\nanswer${kind}: ${body}`;
  });

  return [
    namePart,
    "",
    "Collected answers (attribute every quote by the matching questionId):",
    items.join("\n\n"),
  ].join("\n");
}
