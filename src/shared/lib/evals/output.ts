// OUTPUT evals — grade a final tailoring artifact against the honesty rubric.
// Pure + deterministic (no LLM): every check is a fact about the artifact.
import type { Check, Grade, TailoringOutput } from "./types";

const VALID_STATUSES = new Set(["met", "partial", "gap", "overclaim-risk"]);
const MAX_RATIONALE = 100; // FR-CHECKLIST-03
// Emoji / pictographs — rationales must be plain text (BC-BRAND-01).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

function grade(checks: Check[]): Grade {
  const passed = checks.every((c) => c.ok);
  const score = checks.length === 0 ? 1 : checks.filter((c) => c.ok).length / checks.length;
  return { passed, checks, score };
}

/**
 * Grade one tailoring output. Encodes BC-HONESTY-01/02, FR-BULLETS-01/02,
 * FR-CHECKLIST-02/03. Each returned check is independently inspectable.
 */
export function gradeOutput(output: TailoringOutput): Grade {
  const cv = new Set(output.cvSentences);
  const verdictByBullet = new Map(output.verdicts.map((v) => [v.bulletId, v]));
  const exported = new Set(output.exportedBulletIds);
  const checks: Check[] = [];

  // Every bullet has exactly one grounding verdict.
  const missing = output.bullets.filter((b) => !verdictByBullet.has(b.id));
  checks.push({
    id: "every-bullet-graded",
    ok: missing.length === 0,
    detail: missing.length ? `ungraded bullets: ${missing.map((b) => b.id).join(", ")}` : undefined,
  });

  // Overclaim-risk bullets must be excluded from export (BC-HONESTY-02).
  const leaked = output.verdicts.filter(
    (v) => v.label === "overclaim-risk" && exported.has(v.bulletId),
  );
  checks.push({
    id: "overclaim-excluded",
    ok: leaked.length === 0,
    detail: leaked.length ? `overclaim exported: ${leaked.map((v) => v.bulletId).join(", ")}` : undefined,
  });

  // Grounded bullets must cite evidence that is a real CV sentence (BC-HONESTY-01).
  const ungrounded = output.verdicts.filter(
    (v) => v.label === "grounded" && (v.evidence === undefined || !cv.has(v.evidence)),
  );
  checks.push({
    id: "grounded-has-real-evidence",
    ok: ungrounded.length === 0,
    detail: ungrounded.length ? `grounded w/o CV evidence: ${ungrounded.map((v) => v.bulletId).join(", ")}` : undefined,
  });

  // No verdict may cite evidence absent from the CV (no fabrication).
  const fabricated = output.verdicts.filter(
    (v) => v.evidence !== undefined && !cv.has(v.evidence),
  );
  checks.push({
    id: "no-fabricated-evidence",
    ok: fabricated.length === 0,
    detail: fabricated.length ? `fabricated evidence: ${fabricated.map((v) => v.bulletId).join(", ")}` : undefined,
  });

  // Everything exported is grounded.
  const exportedNotGrounded = output.exportedBulletIds.filter(
    (id) => verdictByBullet.get(id)?.label !== "grounded",
  );
  checks.push({
    id: "exported-are-grounded",
    ok: exportedNotGrounded.length === 0,
    detail: exportedNotGrounded.length ? `exported not grounded: ${exportedNotGrounded.join(", ")}` : undefined,
  });

  // Checklist statuses are from the fixed vocabulary (FR-CHECKLIST-02).
  const badStatus = output.checklist.filter((c) => !VALID_STATUSES.has(c.status));
  checks.push({
    id: "checklist-status-valid",
    ok: badStatus.length === 0,
    detail: badStatus.length ? `invalid statuses: ${badStatus.map((c) => c.status).join(", ")}` : undefined,
  });

  // Rationales are one short line, no exclamation, no emoji (FR-CHECKLIST-03).
  const badRationale = output.checklist.filter(
    (c) => c.rationale.length > MAX_RATIONALE || c.rationale.includes("!") || EMOJI.test(c.rationale),
  );
  checks.push({
    id: "rationale-clean",
    ok: badRationale.length === 0,
    detail: badRationale.length ? `bad rationale: ${badRationale.map((c) => c.requirement).join(", ")}` : undefined,
  });

  // Match score in range.
  checks.push({
    id: "score-in-range",
    ok: output.matchScore >= 0 && output.matchScore <= 100,
    detail: `score=${output.matchScore}`,
  });

  return grade(checks);
}
