// run-tailoring event/result contract (FR-TAILOR-01/02/03). These types cross
// the wire between the /api/tailor route (NDJSON stream) and the client, so
// they stay JSON-serializable and framework-free. Errors travel as codes and
// are localized on the client (NFR-I18N-01).
import type { Bullet } from "@/entities/bullet";
import type { TailoringChecklistRow } from "@/entities/tailoring";
import type { SkillName } from "@/shared/lib/evals";
import type { CareerStage } from "@/shared/lib/llm";

/** Visible progress states, queued → processing → done | failed (FR-TAILOR-01). */
export type TailorRunPhase = "queued" | "processing" | "done" | "failed";

export type TailorErrorCode = "failed" | "empty_input" | "rate_limited";

/** The final artifact of a successful run (FR-CHECKLIST-*, FR-BULLETS-*). */
export interface TailoringRunResult {
  readonly checklist: readonly TailoringChecklistRow[];
  readonly bullets: readonly Bullet[];
  /** Deterministic 0–100 weighted match score (FR-CHECKLIST-04). */
  readonly matchScore: number;
  /**
   * Inferred career stage (add-tailoring-intelligence §3), a tone signal only.
   * Optional: best-effort inference may be absent without failing the run.
   */
  readonly careerStage?: CareerStage;
}

/** One NDJSON line on the /api/tailor stream. */
export type TailorRunEvent =
  | { readonly type: "status"; readonly phase: TailorRunPhase }
  | { readonly type: "step"; readonly skill: SkillName }
  | { readonly type: "result"; readonly result: TailoringRunResult }
  | { readonly type: "error"; readonly code: TailorErrorCode };

export interface TailoringRunInput {
  readonly cvText: string;
  readonly jdText: string;
}
