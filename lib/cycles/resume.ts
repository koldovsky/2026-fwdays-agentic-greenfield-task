// @trace FR-FORM-03 FR-FORM-04 TC-VALID-01 TC-PURE-01

/**
 * Resuming a form-mode session — pure, framework-free (no Prisma, no
 * next/*, no react). Mirrors `lib/cycles/status.ts`'s `isResponseComplete`
 * per-type validity rules (scale: numeric match against `question.anchors`;
 * open: non-empty after `.trim()`) but walks question-by-question to find
 * the EARLIEST gap instead of a whole-template boolean. Design authority:
 * openspec/changes/add-form/design.md, Decision 3.
 *
 * NOTE (flagged in design.md as an ADR-worthy follow-up, not a blocker):
 * this duplicates isResponseComplete's per-type validity check rather than
 * sharing one isValidAnswerForQuestion(question, answer) helper. Both are
 * independently unit-tested against the same fixtures so a drift would
 * surface as a test mismatch.
 */

type Question = {
  id: string;
  order: number;
  type: string;
  required: boolean;
  anchors?: ReadonlyArray<{ value: number }>;
};

function isValidAnswerForQuestion(
  question: Question,
  answer: number | string | undefined,
): boolean {
  if (question.type === "scale") {
    if (typeof answer !== "number") return false;
    const anchorValues = (question.anchors ?? []).map((anchor) => anchor.value);
    return anchorValues.includes(answer);
  }

  if (question.type === "open") {
    if (typeof answer !== "string") return false;
    return answer.trim().length > 0;
  }

  // Unrecognised required question type → treat as invalid (defensive,
  // mirrors isResponseComplete's same fallback).
  return false;
}

/**
 * Returns the first `required` question (by array order, which is already
 * `order`-ascending) whose saved answer is missing or invalid for its type.
 * Optional questions never become the resume target. Returns `null` when
 * every required question already has a valid answer — including the
 * vacuous case of a template with zero required questions.
 */
export function firstUnansweredRequiredQuestion(
  questions: ReadonlyArray<Question>,
  answers: Record<string, number | string>,
): { id: string; order: number } | null {
  for (const question of questions) {
    if (!question.required) continue;

    const answer = answers[question.id];
    if (!isValidAnswerForQuestion(question, answer)) {
      return { id: question.id, order: question.order };
    }
  }

  return null;
}
