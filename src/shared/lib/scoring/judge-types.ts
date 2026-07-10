// Coverage-judge vocabulary for the PURE scorer (improve-tailoring-quality T5).
// Framework-free (TC-PURE-01). Kept LOCAL to the scoring slice — structurally
// identical to `CoverageVerdict` in shared/lib/llm, mirroring how this slice
// already owns `SeniorityLevel` rather than importing `CareerStage` from llm, so
// the pure scorer stays free of any llm dependency. The loop maps the llm-slice
// verdict onto this shape at the seam.

export type CoverageVerdictLabel = "covered" | "adjacent" | "uncovered";

/**
 * One requirement's coverage verdict as the deterministic scorer consumes it.
 * `citation` is UNVERIFIED at this boundary — {@link applyCoverageJudge}
 * re-checks it appears verbatim in the CV text and discards it otherwise
 * (BC-HONESTY-01).
 */
export interface CoverageVerdict {
  readonly requirementId: string;
  readonly label: CoverageVerdictLabel;
  readonly citation?: string;
}
