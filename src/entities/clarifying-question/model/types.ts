// clarifying-question entity — a deterministic wizard question derived from a
// weak (partial/gap) checklist row, plus the user's answer to it.
// FR-WIZARD-02 (derivation), FR-WIZARD-03 (answer/skip/decline). A confirmed
// answer becomes a second, distinctly-tagged grounding-evidence source
// (BC-HONESTY-03) — see entities/bullet for the evidence-source shape.
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

export interface ClarifyingQuestion {
  readonly id: string;
  /** The requirement text this question was derived from (FR-WIZARD-02). */
  readonly requirementText: string;
  /** Rendered Ukrainian question text (NFR-I18N-01). */
  readonly text: string;
}

export type ClarifyingAnswerStatus = "answered" | "skipped" | "declined";

export interface ClarifyingAnswer {
  readonly questionId: string;
  readonly status: ClarifyingAnswerStatus;
  /** Present only when `status` is "answered" (FR-WIZARD-03). */
  readonly answerText?: string;
}
