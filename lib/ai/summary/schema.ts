// @trace FR-REPORT-02 FR-REPORT-04 TC-VALID-01 TC-ARCH-01

import { z } from "zod";
import { quoteOccursInAnswer } from "@/lib/ai/summary/quote";

/**
 * The structured summary contract (FR-REPORT-04). The TypeScript type is
 * inferred via `z.infer` — never hand-written (TC-ARCH-01). The static shape
 * validates the model's tool output; the runtime grounding rules (quote
 * `questionId` membership + verbatim occurrence) are checked separately by
 * `validateSummaryGrounding`, since they depend on the specific cycle's
 * snapshot and answers.
 */
export const summaryQuoteSchema = z.object({
  text: z.string().min(1).max(600),
  questionId: z.string().min(1).max(100),
});

export const summaryShapeSchema = z.object({
  strengths: z.array(z.string().min(1).max(600)).max(12),
  growthAreas: z.array(z.string().min(1).max(600)).max(12),
  quotes: z.array(summaryQuoteSchema).max(24),
});

export type SummaryShape = z.infer<typeof summaryShapeSchema>;
export type SummaryQuote = z.infer<typeof summaryQuoteSchema>;

export type GroundingResult = { ok: true } | { ok: false; reason: string };

/**
 * Validate that every quote is attributed by a snapshot question id AND is
 * verbatim text from THAT question's collected answer (FR-REPORT-02). A quote
 * whose `questionId` is unknown, or whose text does not occur in the matching
 * answer under the defined normalisation, fails — so no fabricated or
 * mis-attributed quote is ever persisted. `answerTextById` holds the collected
 * open-answer text keyed by question id (scale answers carry no quotable text).
 */
export function validateSummaryGrounding(
  summary: SummaryShape,
  validQuestionIds: ReadonlySet<string>,
  answerTextById: Readonly<Record<string, string>>,
): GroundingResult {
  for (const quote of summary.quotes) {
    if (!validQuestionIds.has(quote.questionId)) {
      return { ok: false, reason: `quote attributed to unknown questionId ${quote.questionId}` };
    }
    const answerText = answerTextById[quote.questionId] ?? "";
    if (!quoteOccursInAnswer(quote.text, answerText)) {
      return { ok: false, reason: `quote not found verbatim in answer for ${quote.questionId}` };
    }
  }
  return { ok: true };
}
