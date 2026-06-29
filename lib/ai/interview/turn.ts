// @trace FR-AI-03 FR-AI-04 FR-AI-05 NFR-COST-01 TC-PURE-01

/**
 * The interview turn decision — pure, framework-free, the verifiable core of
 * FR-AI-03. Given the current question, the (validated) judgment of the
 * respondent's latest reply, and how many follow-ups the agent has already
 * spent, it decides whether to follow up, record a satisfying answer, or — at
 * the cap — record an explicit insufficient row and move on. It never invents
 * an answer: a capped-out scale records a null value, a capped-out open records
 * the respondent's best actual words (or empty), both flagged insufficient.
 */

export const DEFAULT_FOLLOWUP_CAP = 2;

export type InterviewQuestion =
  | { type: "scale"; anchors: ReadonlyArray<{ value: number }> }
  | { type: "open" };

export type RecordedAnswer =
  | { type: "scale"; value: number | null }
  | { type: "open"; text: string };

export type TurnDecision =
  | { action: "followup" }
  | { action: "record"; answer: RecordedAnswer; insufficient: boolean };

export type DecideTurnArgs = {
  question: InterviewQuestion;
  /**
   * For a scale question: the reply mapped to a valid anchor, or null if it
   * mapped to none. For an open question: ignored.
   */
  scaleValue: number | null;
  /**
   * For an open question: whether the judge found the reply substantively on
   * topic. For a scale question: ignored (sufficiency is `scaleValue !== null`).
   */
  addressesQuestion: boolean;
  /** Follow-ups already spent on THIS question (from the transcript). */
  followupsUsed: number;
  /** The respondent's current open reply, their own words. */
  currentText: string;
  /** The best available open text across all replies to this question. */
  bestText: string;
  /** Follow-up cap N (default 2). */
  cap?: number;
};

export function decideTurn(args: DecideTurnArgs): TurnDecision {
  const cap = args.cap ?? DEFAULT_FOLLOWUP_CAP;

  if (args.question.type === "scale") {
    if (args.scaleValue !== null) {
      return { action: "record", answer: { type: "scale", value: args.scaleValue }, insufficient: false };
    }
    if (args.followupsUsed < cap) return { action: "followup" };
    // Capped out: explicit null-value row, never an invented anchor.
    return { action: "record", answer: { type: "scale", value: null }, insufficient: true };
  }

  // Open question. Sufficient only when the judge says it addresses the
  // question AND the reply actually carries text.
  const trimmedCurrent = args.currentText.trim();
  if (args.addressesQuestion && trimmedCurrent.length > 0) {
    return { action: "record", answer: { type: "open", text: trimmedCurrent }, insufficient: false };
  }
  if (args.followupsUsed < cap) return { action: "followup" };
  // Capped out: record the respondent's best actual words (may be empty),
  // never invented text; flagged insufficient so HR can tell it apart.
  return { action: "record", answer: { type: "open", text: args.bestText }, insufficient: true };
}
