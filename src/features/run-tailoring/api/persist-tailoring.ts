// Persist a completed tailoring to history (add-tailoring-history, FR-TAILOR-04,
// FR-HISTORY-01). Server-side only, invoked from /api/tailor/generate AFTER the
// terminal `result` event, and ONLY for a paid, logged-in user.
//
// Best-effort by contract: the caller runs this after the result has already
// streamed and wraps it so any failure is logged server-side and never affects
// the user's result (NFR-OBS-01, FR-TAILOR-03). This module does the mapping +
// inserts; it takes injected repo ports (the db repos satisfy them; fakes
// satisfy them in tests), so no concrete driver leaks into the feature.
//
// A tailoring is stored with NO cv_profile linkage (cvProfileId: null) — history
// needs the job title, score, checklist, and bullets, not the CV blob, and the
// raw CV text needed to encrypt a cv_profiles row is not available on the
// generation path (see migration 0004).
import type { BulletInput, ChecklistItemInput, SaveTailoringInput } from "@/shared/lib/db";
import { extractJobTitle } from "@/shared/lib/scoring";

import type { TailoringRunResult } from "../model/types";

/** Minimal ports this helper needs — the db repos satisfy them structurally. */
export interface PersistTailoringDeps {
  readonly jobDescriptions: { save(userId: string, rawText: string): Promise<{ id: string }> };
  readonly tailorings: { save(input: SaveTailoringInput): Promise<{ id: string }> };
}

export interface PersistTailoringArgs {
  readonly userId: string;
  readonly jobDescription: string;
  readonly result: TailoringRunResult;
}

/** JD requirement importance → the repo's compact enum. */
function toImportance(importance: "must-have" | "nice-to-have"): ChecklistItemInput["importance"] {
  return importance === "must-have" ? "must" : "nice";
}

/** Bullet grounding verdict → the repo's persisted grounding enum. */
function toGrounding(grounding: "grounded" | "overclaim-risk"): BulletInput["grounding"] {
  return grounding === "grounded" ? "met" : "overclaim";
}

/**
 * Persist a tailoring result for a paid user. Inserts a job_descriptions row for
 * the FK, then the tailoring with its checklist + bullets. Returns the new
 * tailoring id. May throw — the caller is responsible for best-effort handling.
 */
export async function persistTailoring(
  deps: PersistTailoringDeps,
  args: PersistTailoringArgs,
): Promise<string> {
  const { userId, jobDescription, result } = args;

  const jd = await deps.jobDescriptions.save(userId, jobDescription);

  const checklist: ChecklistItemInput[] = result.checklist.map((row) => ({
    requirement: row.requirement.text,
    importance: toImportance(row.requirement.importance),
    status: row.item.status,
    rationale: row.item.rationale,
  }));

  const bullets: BulletInput[] = result.bullets.map((bullet) => ({
    text: bullet.text,
    grounding: toGrounding(bullet.grounding),
    included: bullet.includedInExport,
  }));

  const saved = await deps.tailorings.save({
    userId,
    cvProfileId: null,
    jobDescriptionId: jd.id,
    jobTitle: extractJobTitle(jobDescription),
    matchScore: result.matchScore,
    checklist,
    bullets,
  });

  return saved.id;
}
