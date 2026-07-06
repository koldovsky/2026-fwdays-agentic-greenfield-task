// TRAJECTORY evals — grade an agent RUN (the steps taken), not just the artifact.
// Encodes the process contract from add-agent-loop/design.md: pipeline order,
// two-pass separation, structural grounding isolation, bounded retries, fail-honest
// termination, step cap, and no-user-id-in-payload (NFR-SEC-02).
import type { Check, Grade, RunTrace, SkillName } from "./types";

/** ≤ 2 retries per step ⇒ ≤ 3 total attempts (FR-TAILOR-03). */
export const MAX_ATTEMPTS = 3;

/**
 * Context keys the grounding pass is allowed to see — nothing from
 * generation/JD. `confirmedAnswers` is a second legitimate evidence lane
 * (BC-HONESTY-03, add-resume-wizard design.md §1/§3): the isolation
 * guarantee widens to include the wizard's self-attested answers, it
 * doesn't loosen — still never the JD, requirements, or generation
 * transcript.
 */
const GROUNDING_ALLOWED = new Set(["bullet", "cvText", "confirmedAnswers"]);

/**
 * Keys that must NEVER reach the grounding pass, named explicitly
 * (add-tailoring-intelligence §5.2). The `GROUNDING_ALLOWED` whitelist already
 * denies these by default, but naming the inferred-seniority and cover-letter
 * context keys makes the guarantee legible and keeps the check honest even if
 * the whitelist is later widened: seniority is a generation-tone signal and the
 * cover letter is a downstream artifact — letting either into grounding would
 * let an inferred/derived claim launder an unsupported bullet to "grounded"
 * (BC-HONESTY-03). `attachment` joins the list for the same reason
 * (add-premium-pdf-attach, T5): the paid original-PDF feeds generation only —
 * letting the document into grounding would let a claim the model read off the
 * PDF launder past the text-only verifier (BC-HONESTY-01/02).
 */
const GROUNDING_FORBIDDEN = new Set([
  "careerStage",
  "seniority",
  "coverLetter",
  "coverLetterContext",
  "attachment",
  // The FLAGGED coverage judge (improve-tailoring-quality T5): its context keys
  // must never reach the bullet-grounding pass. The judge reads CV text +
  // requirements to rescore the CHECKLIST; letting `requirements` or a judge
  // verdict into grounding would let a requirement-driven coverage claim launder
  // an unsupported bullet to "grounded" (BC-HONESTY-01/03). `cvText` stays
  // allowed (it is grounding's own legal source); the judge-specific keys do not.
  "requirements",
  "coverageJudge",
  "coverageVerdicts",
]);

function grade(checks: Check[]): Grade {
  const passed = checks.every((c) => c.ok);
  const score = checks.length === 0 ? 1 : checks.filter((c) => c.ok).length / checks.length;
  return { passed, checks, score };
}

/**
 * Valid skill order: parse-cv, extract-requirements, then score and
 * derive-clarifying-questions (order between the two doesn't matter for
 * honesty grading — both are pure, cvProfile/requirements-derived steps),
 * then generate/ground pairs. Score moved ahead of generation
 * (add-resume-wizard design.md §1): it only ever depended on requirements +
 * cvProfile, never on generated bullets, so the wizard can show the
 * checklist before any bullet exists.
 */
function orderOk(skills: readonly SkillName[]): boolean {
  const rank: Record<SkillName, number> = {
    "parse-cv": 0,
    "extract-requirements": 1,
    // infer-seniority reads only the CV and feeds generation tone; it sits
    // after extraction, alongside the other pure analysis steps, ahead of
    // generation (add-tailoring-intelligence §3).
    "infer-seniority": 2,
    // The flagged coverage judge (T5) sits with the other pure analysis steps,
    // after extraction and ahead of generation; it feeds `score`, so it shares
    // rank 2 (non-decreasing order lets judge and score co-locate).
    "judge-coverage": 2,
    score: 2,
    "derive-clarifying-questions": 2,
    "generate-bullet": 3,
    "ground-bullet": 3,
  };
  if (skills[0] !== "parse-cv") return false;
  if (skills.length > 1 && skills[1] !== "extract-requirements") return false;
  // Ranks must be non-decreasing (score never before generation, etc.).
  for (let i = 1; i < skills.length; i++) {
    if (rank[skills[i]] < rank[skills[i - 1]]) return false;
  }
  return true;
}

export function gradeTrajectory(trace: RunTrace): Grade {
  const skills = trace.steps.map((s) => s.skill);
  const checks: Check[] = [];

  checks.push({
    id: "pipeline-order",
    ok: orderOk(skills),
    detail: `order: ${skills.join(" → ")}`,
  });

  // Two-pass: each generated bullet is independently grounded.
  const gen = skills.filter((s) => s === "generate-bullet").length;
  const ground = skills.filter((s) => s === "ground-bullet").length;
  checks.push({
    id: "two-pass-grounding",
    ok: ground >= gen && gen > 0,
    detail: `generate=${gen} ground=${ground}`,
  });

  // Structural grounding isolation — the core honesty invariant (BC-HONESTY-01).
  const leakySteps = trace.steps.filter(
    (s) =>
      s.skill === "ground-bullet" &&
      s.contextKeys.some((k) => !GROUNDING_ALLOWED.has(k) || GROUNDING_FORBIDDEN.has(k)),
  );
  checks.push({
    id: "grounding-isolation",
    ok: leakySteps.length === 0,
    detail: leakySteps.length
      ? `grounding saw forbidden context: ${[...new Set(leakySteps.flatMap((s) => s.contextKeys))].join(", ")}`
      : undefined,
  });

  // Retries bounded (FR-TAILOR-03).
  const overRetried = trace.steps.filter((s) => s.attempts > MAX_ATTEMPTS || s.attempts < 1);
  checks.push({
    id: "retries-bounded",
    ok: overRetried.length === 0,
    detail: overRetried.length ? `steps over ${MAX_ATTEMPTS} attempts: ${overRetried.map((s) => s.skill).join(", ")}` : undefined,
  });

  // Fail-honest: a run with any failed step must not report "done" (NFR-OBS-01).
  const anyFailed = trace.steps.some((s) => s.failed === true);
  checks.push({
    id: "fail-honest-termination",
    ok: !(anyFailed && trace.terminated === "done"),
    detail: anyFailed ? `terminated=${trace.terminated} with a failed step` : undefined,
  });

  // Bounded loop.
  checks.push({
    id: "step-cap-respected",
    ok: trace.steps.length <= trace.stepCap,
    detail: `steps=${trace.steps.length} cap=${trace.stepCap}`,
  });

  // A completed run ends on grounding — score now runs before generation
  // (add-resume-wizard design.md §1), so the terminal skill of a successful
  // run moved from "score" to the last bullet's "ground-bullet" alongside it.
  checks.push({
    id: "grounding-terminal",
    ok: trace.terminated !== "done" || skills[skills.length - 1] === "ground-bullet",
    detail: `last=${skills[skills.length - 1] ?? "none"}`,
  });

  // No user id in any LLM payload (NFR-SEC-02).
  const idLeak =
    trace.userId !== undefined &&
    trace.userId.length > 0 &&
    trace.steps.some((s) => s.llmPayload?.includes(trace.userId as string));
  checks.push({
    id: "no-user-id-in-payload",
    ok: !idLeak,
    detail: idLeak ? "user id found in an LLM payload" : undefined,
  });

  return grade(checks);
}
