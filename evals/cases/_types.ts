/**
 * Eval-case contract (see evals/README.md). A case grades the QUALITY of a
 * user-visible output against an objective rubric — not an assertion.
 *
 * `produce()` returns the exact text a user receives for the scenario, computed
 * from the real app libs (so the eval grades shipping behavior, not a mock).
 * Cases sharing a `dimension` are averaged and ratcheted together.
 */
export interface EvalCase {
  /** Stable id. */
  id: string;
  /** FR/NFR/TC/BC ids this case proves (keep in sync with the `// @trace` footer). */
  trace: string[];
  /** Quality dimension; cases in a dimension are averaged + ratcheted together. */
  dimension: string;
  /** Owning capability. */
  capability: string;
  /** What the case exercises. */
  scenario: string;
  /** Produce the user-visible output to be graded. */
  produce: () => string | Promise<string>;
  /** Objective criteria; prefix a gating one with "CRITICAL:". */
  rubric: string[];
}
