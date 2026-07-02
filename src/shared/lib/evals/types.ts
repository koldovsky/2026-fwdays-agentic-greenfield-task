// Agent-engineering eval types (pure, TC-PURE-01). Two eval families:
//   • OUTPUT evals grade the final tailoring artifact (what the user sees).
//   • TRAJECTORY evals grade the agent's run (the steps it took to get there).
// Both encode the honesty + process contract from openspec/changes/add-agent-loop
// (design.md) so the future pipeline is graded against it, not vibes.
import type { GeneratedBullet, GroundingVerdict } from "@/shared/lib/llm";
import type { ChecklistStatus } from "@/shared/lib/scoring";

// --- shared grading shape -------------------------------------------------

export interface Check {
  /** Stable id of the invariant being graded. */
  readonly id: string;
  readonly ok: boolean;
  /** Human-readable reason, present when `ok` is false. */
  readonly detail?: string;
}

export interface Grade {
  readonly passed: boolean;
  readonly checks: readonly Check[];
  /** Share of checks that passed, 0..1 (a soft signal alongside `passed`). */
  readonly score: number;
}

// --- OUTPUT eval subject --------------------------------------------------

export interface ChecklistLine {
  readonly requirement: string;
  readonly status: ChecklistStatus;
  readonly rationale: string;
}

/** The graded final artifact of a tailoring run. */
export interface TailoringOutput {
  /** The candidate's own CV sentences — the only legal source of evidence. */
  readonly cvSentences: readonly string[];
  readonly bullets: readonly GeneratedBullet[];
  readonly verdicts: readonly GroundingVerdict[];
  /** Ids of bullets included in the export. */
  readonly exportedBulletIds: readonly string[];
  readonly checklist: readonly ChecklistLine[];
  readonly matchScore: number;
}

export interface OutputCase {
  readonly name: string;
  readonly output: TailoringOutput;
}

// --- TRAJECTORY eval subject ----------------------------------------------

export type SkillName =
  | "parse-cv"
  | "extract-requirements"
  | "generate-bullet"
  | "ground-bullet"
  | "score";

export interface TraceStep {
  readonly skill: SkillName;
  /** Total attempts including the first (1 = no retry). */
  readonly attempts: number;
  /** Final outcome of this step. */
  readonly failed?: boolean;
  /** Keys of the context this skill was allowed to see (grounding isolation). */
  readonly contextKeys: readonly string[];
  /** Serialized payload sent to the LLM by this step, if any (privacy scan). */
  readonly llmPayload?: string;
}

export interface RunTrace {
  readonly steps: readonly TraceStep[];
  /** Hard cap on total steps (bounded loop). */
  readonly stepCap: number;
  readonly terminated: "done" | "failed";
  /** The run's user id — must never appear in an LLM payload (NFR-SEC-02). */
  readonly userId?: string;
}

export interface TrajectoryCase {
  readonly name: string;
  readonly trace: RunTrace;
}
