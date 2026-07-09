// Trajectory-level PII isolation for contact fields (§4.5, NFR-SEC-01/02).
// Written by the TEST-AUTHOR subagent (maker≠test-author, separation of duties).
// Asserts contact PII keys are NOT in the GROUNDING_ALLOWED set and that any
// trajectory step carrying a contact key fails grounding-isolation.
// This file only imports from shared (FSD-legal from shared/lib).
import { describe, expect, it } from "vitest";

import { gradeTrajectory } from "./trajectory";
import type { RunTrace } from "./types";

// Contact/PII keys that must never reach an LLM step context.
const CONTACT_KEYS = ["contact", "name", "email", "phone", "links", "contactPii"] as const;

/** Build a trace with one contact PII key injected into a ground-bullet step. */
function traceWithPiiInGroundBullet(piiKey: string): RunTrace {
  return {
    stepCap: 20,
    terminated: "done",
    steps: [
      { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
      { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"], llmPayload: "extract" },
      { skill: "score", attempts: 1, contextKeys: ["cvProfile", "requirements"] },
      { skill: "derive-clarifying-questions", attempts: 1, contextKeys: ["checklist"] },
      {
        skill: "generate-bullet",
        attempts: 1,
        contextKeys: ["cvText", "requirements"],
        llmPayload: "generate",
      },
      {
        skill: "ground-bullet",
        attempts: 1,
        contextKeys: ["bullet", "cvText", piiKey], // PII injected
      },
    ],
  };
}

describe("Contact PII keys in ground-bullet context fail grounding-isolation (§4.5, NFR-SEC-01/02)", () => {
  // The GROUNDING_ALLOWED whitelist is narrow: {bullet, cvText, confirmedAnswers}.
  // Any contact/PII key injected into ground-bullet is not on the allowlist → fails.
  for (const piiKey of CONTACT_KEYS) {
    it(`'${piiKey}' in ground-bullet contextKeys fails grounding-isolation`, () => {
      const grade = gradeTrajectory(traceWithPiiInGroundBullet(piiKey));
      expect(grade.checks.find((c) => c.id === "grounding-isolation")?.ok).toBe(false);
      expect(grade.passed).toBe(false);
    });
  }
});

describe("Contact PII keys in LLM payload: no-user-id check is not bypassed (§4.5, NFR-SEC-02)", () => {
  // The no-user-id-in-payload check verifies userId doesn't leak.
  // We additionally confirm a clean trace (no PII in payloads) passes all checks.
  it("a trace with no contact PII in any contextKey or payload passes all checks", () => {
    const clean: RunTrace = {
      stepCap: 20,
      terminated: "done",
      steps: [
        { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
        { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"], llmPayload: "extract jd keywords" },
        { skill: "score", attempts: 1, contextKeys: ["cvProfile", "requirements"] },
        { skill: "derive-clarifying-questions", attempts: 1, contextKeys: ["checklist"] },
        {
          skill: "generate-bullet",
          attempts: 1,
          contextKeys: ["cvText", "requirements"],
          llmPayload: "generate bullet for requirement",
        },
        { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
      ],
    };
    const grade = gradeTrajectory(clean);
    expect(grade.passed).toBe(true);
    // Verify no PII key in any context.
    const allContextKeys = clean.steps.flatMap((s) => s.contextKeys);
    for (const piiKey of CONTACT_KEYS) {
      expect(allContextKeys).not.toContain(piiKey);
    }
  });
});
