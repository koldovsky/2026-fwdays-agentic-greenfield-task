// @trace FR-PROGRESS-01 TC-PURE-01

/**
 * Cycle progress — pure, framework-free (no Prisma, next/*, react, Date.now()).
 * "Answered" counts the REQUIRED snapshot questions that currently hold a VALID
 * answer; "total" is the required-question count (FR-PROGRESS-01). Validity per
 * type matches isResponseComplete / firstUnansweredRequiredQuestion (scale:
 * numeric anchor match; open: non-empty after trim) — so an `insufficient`
 * capped-out interview row (null scale, or empty open text) is correctly NOT
 * counted as answered, while a capped row that still carries real text is.
 */

type ProgressQuestion = {
  id: string;
  type: string;
  required: boolean;
  anchors?: ReadonlyArray<{ value: number }>;
};

export function isAnswerValid(
  question: ProgressQuestion,
  answer: number | string | undefined,
): boolean {
  if (question.type === "scale") {
    if (typeof answer !== "number") return false;
    return (question.anchors ?? []).some((anchor) => anchor.value === answer);
  }
  if (question.type === "open") {
    return typeof answer === "string" && answer.trim().length > 0;
  }
  return false;
}

export type Progress = { answered: number; total: number };

/**
 * Count answered / total over the REQUIRED questions. Optional questions never
 * affect either number. A template with zero required questions yields
 * { answered: 0, total: 0 } (callers render that as full / 0-of-0, never NaN).
 */
export function computeProgress(
  snapshot: { questions: ReadonlyArray<ProgressQuestion> },
  answers: Record<string, number | string>,
): Progress {
  let answered = 0;
  let total = 0;
  for (const question of snapshot.questions) {
    if (!question.required) continue;
    total += 1;
    if (isAnswerValid(question, answers[question.id])) answered += 1;
  }
  return { answered, total };
}

/** Fraction filled, 0–1, safe for an empty (0 required) snapshot. */
export function progressFraction({ answered, total }: Progress): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, answered / total));
}
