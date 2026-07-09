// Pure map from the clarify step's answers to the generation phase's evidence
// pool (FR-WIZARD-04, BC-HONESTY-03). ONLY `answered` questions become
// grounding evidence — skipped/declined contribute nothing, so a user who
// skips everything sends an empty pool and generation falls back to CV-only
// grounding, exactly as the one-shot path does. The question TEXT (not its id)
// is carried, because that is what the grounding pass matches confirmed
// evidence against. Deterministic, no IO — unit-tested.
import type { ClarifyingAnswer, ClarifyingQuestion } from "@/entities/clarifying-question";
import type { ConfirmedAnswerEvidence } from "@/shared/lib/llm";

export function toConfirmedAnswers(
  questions: readonly ClarifyingQuestion[],
  answers: readonly ClarifyingAnswer[],
): ConfirmedAnswerEvidence[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const out: ConfirmedAnswerEvidence[] = [];
  for (const answer of answers) {
    if (answer.status !== "answered") continue;
    const text = answer.answerText?.trim();
    if (text === undefined || text === "") continue;
    const question = byId.get(answer.questionId);
    if (question === undefined) continue;
    out.push({ question: question.text, answer: text });
  }
  return out;
}
