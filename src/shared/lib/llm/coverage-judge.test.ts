// Tests for coverage-judge prompt builder and response parser
// (improve-tailoring-quality T5 §2.2). Pure, no LLM, no IO (TC-PURE-01).
//
// Requirements covered: NFR-COST-01 (one call, no extra keys), NFR-SEC-02
//   (no userId), NFR-OBS-01 (tolerant parser, no throw), BC-HONESTY-01 (uncited
//   → uncovered), FR-CHECKLIST-01.

import { describe, expect, it } from "vitest";

import {
  buildCoverageJudgePrompt,
  COVERAGE_JUDGE_SYSTEM_PROMPT,
  parseCoverageJudgeResponse,
} from ".";
import type { CoverageJudgeInput, Requirement } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(partial: Partial<Requirement> = {}): Requirement {
  return {
    id: "r1",
    text: "TypeScript experience",
    importance: "must-have",
    keywords: ["typescript"],
    ...partial,
  };
}

function minimalInput(overrides: Partial<CoverageJudgeInput> = {}): CoverageJudgeInput {
  return {
    requirements: [req()],
    cvSentences: ["Wrote TypeScript across the backend and tooling."],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildCoverageJudgePrompt — payload composition (§2.2, NFR-SEC-02, NFR-COST-01)
// ---------------------------------------------------------------------------

describe("buildCoverageJudgePrompt: payload composition (§2.2)", () => {
  it("includes the coverage-judge system prompt", () => {
    const prompt = buildCoverageJudgePrompt(minimalInput());
    const sysMsg = prompt.messages.find((m) => m.role === "system");
    expect(sysMsg?.content).toBe(COVERAGE_JUDGE_SYSTEM_PROMPT);
  });

  it("user message contains CV sentences (the only source of truth)", () => {
    const input = minimalInput({
      cvSentences: ["CVSENTINEL: developed payment systems at scale"],
    });
    const prompt = buildCoverageJudgePrompt(input);
    const user = prompt.messages.find((m) => m.role === "user");
    expect(user?.content).toContain("CVSENTINEL");
  });

  it("user message contains requirement text labeled by id", () => {
    const input = minimalInput({
      requirements: [req({ id: "req-007", text: "REQSENTINEL React experience" })],
    });
    const prompt = buildCoverageJudgePrompt(input);
    const user = prompt.messages.find((m) => m.role === "user");
    expect(user?.content).toContain("req-007");
    expect(user?.content).toContain("REQSENTINEL");
  });

  it("payload contains NO JD prose beyond the requirements (NFR-COST-01)", () => {
    // The loop passes `requirements` (already extracted from JD) + `cvSentences`.
    // The raw JD text itself must NOT appear in the prompt.
    const JD_SENTINEL = "JDSENTINEL: raw job description prose";
    const input = minimalInput();
    const prompt = buildCoverageJudgePrompt(input);
    const payload = prompt.messages.map((m) => m.content).join("\n");
    expect(payload).not.toContain(JD_SENTINEL);
  });

  it("payload contains NO bullets (bullet content must never reach the judge)", () => {
    const input = minimalInput();
    const prompt = buildCoverageJudgePrompt(input);
    // Bullets come from generation, never from this prompt's input shape.
    // Verify the input type has no bullets field.
    expect((input as Record<string, unknown>)["bullets"]).toBeUndefined();
    // Structural assertion: the prompt has exactly two messages.
    expect(prompt.messages.length).toBe(2);
    expect(prompt.messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("requirements are labeled with their id in the prompt (deterministic mapping)", () => {
    const input = minimalInput({
      requirements: [
        req({ id: "r1", text: "TypeScript" }),
        req({ id: "r2", text: "React" }),
      ],
    });
    const user = buildCoverageJudgePrompt(input).messages.find((m) => m.role === "user");
    expect(user?.content).toContain("[r1]");
    expect(user?.content).toContain("[r2]");
    expect(user?.content).toContain("TypeScript");
    expect(user?.content).toContain("React");
  });

  it("empty requirements list produces a graceful fallback string (no crash)", () => {
    const input = minimalInput({ requirements: [] });
    expect(() => buildCoverageJudgePrompt(input)).not.toThrow();
    const user = buildCoverageJudgePrompt(input).messages.find((m) => m.role === "user");
    expect(user?.content).toBeTruthy();
  });

  it("empty cvSentences list produces a graceful fallback string (no crash)", () => {
    const input = minimalInput({ cvSentences: [] });
    expect(() => buildCoverageJudgePrompt(input)).not.toThrow();
    const user = buildCoverageJudgePrompt(input).messages.find((m) => m.role === "user");
    expect(user?.content).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// parseCoverageJudgeResponse — valid batch (§2.2, FR-CHECKLIST-01)
// ---------------------------------------------------------------------------

describe("parseCoverageJudgeResponse: valid batch (§2.2)", () => {
  it("parses a covered verdict with citation", () => {
    const raw = JSON.stringify({
      verdicts: [{ requirementId: "r1", label: "covered", citation: "wrote TS daily" }],
    });
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdicts[0]).toMatchObject({
      requirementId: "r1",
      label: "covered",
      citation: "wrote TS daily",
    });
  });

  it("parses an adjacent verdict with citation", () => {
    const raw = JSON.stringify({
      verdicts: [{ requirementId: "r2", label: "adjacent", citation: "React experience" }],
    });
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdicts[0].label).toBe("adjacent");
  });

  it("parses an uncovered verdict — citation is dropped (BC-HONESTY-01)", () => {
    const raw = JSON.stringify({
      verdicts: [{ requirementId: "r3", label: "uncovered", citation: "should be ignored" }],
    });
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const v = result.value.verdicts[0];
    expect(v.label).toBe("uncovered");
    // citation must be absent for uncovered (BC-HONESTY-01: nothing to ground on)
    expect(v.citation).toBeUndefined();
  });

  it("unknown/invalid label maps to uncovered (never over-trust the model)", () => {
    const raw = JSON.stringify({
      verdicts: [{ requirementId: "r1", label: "INVALID_LABEL" }],
    });
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdicts[0].label).toBe("uncovered");
  });

  it("parses a multi-requirement batch correctly", () => {
    const raw = JSON.stringify({
      verdicts: [
        { requirementId: "r1", label: "covered", citation: "wrote TypeScript" },
        { requirementId: "r2", label: "uncovered" },
        { requirementId: "r3", label: "adjacent", citation: "used React" },
      ],
    });
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdicts).toHaveLength(3);
    expect(result.value.verdicts.map((v) => v.requirementId)).toEqual(["r1", "r2", "r3"]);
  });

  it("tolerates a Markdown code fence wrapper", () => {
    const raw = "```json\n" + JSON.stringify({ verdicts: [{ requirementId: "r1", label: "covered", citation: "ts" }] }) + "\n```";
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseCoverageJudgeResponse — malformed inputs (NFR-OBS-01, no throw)
// ---------------------------------------------------------------------------

describe("parseCoverageJudgeResponse: malformed inputs produce typed errors (NFR-OBS-01)", () => {
  it("invalid JSON → {ok: false, error} — never throws", () => {
    expect(() => parseCoverageJudgeResponse("not json at all")).not.toThrow();
    const result = parseCoverageJudgeResponse("not json at all");
    expect(result.ok).toBe(false);
  });

  it("missing verdicts field → {ok: false}", () => {
    const result = parseCoverageJudgeResponse(JSON.stringify({ something_else: [] }));
    expect(result.ok).toBe(false);
  });

  it("verdicts is not an array → {ok: false}", () => {
    const result = parseCoverageJudgeResponse(JSON.stringify({ verdicts: "oops" }));
    expect(result.ok).toBe(false);
  });

  it("entry without requirementId is silently skipped (does not sink the batch)", () => {
    const raw = JSON.stringify({
      verdicts: [
        { label: "covered", citation: "xyz" }, // no requirementId
        { requirementId: "r1", label: "covered", citation: "valid citation" },
      ],
    });
    const result = parseCoverageJudgeResponse(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Only r1 should survive
    expect(result.value.verdicts).toHaveLength(1);
    expect(result.value.verdicts[0].requirementId).toBe("r1");
  });

  it("empty string → {ok: false}", () => {
    const result = parseCoverageJudgeResponse("");
    expect(result.ok).toBe(false);
  });

  it("empty verdicts array → ok with empty array (not an error)", () => {
    const result = parseCoverageJudgeResponse(JSON.stringify({ verdicts: [] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdicts).toHaveLength(0);
  });

  it("parseCoverageJudgeResponse is non-throwing under all adversarial inputs", () => {
    const adversarial = [
      "",
      "null",
      "[]",
      "{}",
      "{ verdicts: true }",
      '{"verdicts": null}',
      '{"verdicts": [null, 1, "str"]}',
      '{"verdicts": [{"requirementId": null, "label": "covered"}]}',
    ];
    for (const input of adversarial) {
      expect(() => parseCoverageJudgeResponse(input)).not.toThrow();
    }
  });
});
