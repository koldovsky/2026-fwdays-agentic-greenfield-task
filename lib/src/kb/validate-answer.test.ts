// Test-first (red): lib/src/kb/validate-answer.ts's `validateAnswerText`
// body is a Not-implemented throwing stub (kb-learning tasks.md B.1's red
// half) — every case below is expected to FAIL against the stub, for the
// right reason, until B.2 implements the real body.
//
// Contract this file pins down (design.md Decision 5, step 1; baseline
// spec.md "One-action admin answer" — "Empty answer is rejected inline" /
// "Oversized answer is rejected inline" scenarios, FR-KB-03): rejects an
// empty-after-trim string as EMPTY; rejects a string over 3,500 characters
// as TOO_LONG, naming the 3,500 bound; a string of exactly 3,500 characters
// passes; a normal short answer passes.
import { describe, expect, it } from "vitest";
import { MAX_ANSWER_LENGTH, validateAnswerText } from "./validate-answer.ts";

describe("validateAnswerText — MAX_ANSWER_LENGTH names the baseline spec's own bound", () => {
  // @trace FR-KB-03
  it("is exactly 3,500", () => {
    expect(MAX_ANSWER_LENGTH).toBe(3500);
  });
});

describe("validateAnswerText — empty/whitespace-only answers are rejected EMPTY (FR-KB-03)", () => {
  // @trace FR-KB-03
  it("rejects an empty string as EMPTY", () => {
    expect(validateAnswerText("")).toEqual({ ok: false, code: "EMPTY" });
  });

  // @trace FR-KB-03
  it("rejects a whitespace-only string (spaces, tabs, newlines) as EMPTY", () => {
    expect(validateAnswerText("   \n\t  \n  ")).toEqual({ ok: false, code: "EMPTY" });
  });

  // @trace FR-KB-03
  it("rejects a single space as EMPTY", () => {
    expect(validateAnswerText(" ")).toEqual({ ok: false, code: "EMPTY" });
  });
});

describe("validateAnswerText — oversized answers are rejected TOO_LONG, naming the 3,500 bound (FR-KB-03)", () => {
  // @trace FR-KB-03
  it("rejects a 3,501-character string as TOO_LONG with maxLength: 3500", () => {
    const oversized = "а".repeat(3501);
    expect(validateAnswerText(oversized)).toEqual({
      ok: false,
      code: "TOO_LONG",
      maxLength: 3500,
    });
  });

  // @trace FR-KB-03
  it("rejects a wildly oversized string (10,000 chars) the same way, still naming 3,500", () => {
    const wayOversized = "b".repeat(10000);
    expect(validateAnswerText(wayOversized)).toEqual({
      ok: false,
      code: "TOO_LONG",
      maxLength: 3500,
    });
  });
});

describe("validateAnswerText — boundary and normal-case passes (FR-KB-03)", () => {
  // @trace FR-KB-03
  it("passes a string of exactly 3,500 characters (the bound is inclusive)", () => {
    const exact = "c".repeat(3500);
    expect(validateAnswerText(exact)).toEqual({ ok: true });
  });

  // @trace FR-KB-03
  it("passes a normal short Ukrainian answer", () => {
    expect(validateAnswerText("Так, у нас є безкоштовна парковка біля входу.")).toEqual({
      ok: true,
    });
  });

  // @trace FR-KB-03
  it("passes an answer with leading/trailing whitespace as long as the trimmed text is non-empty and within bound", () => {
    expect(validateAnswerText("  Так, є.  ")).toEqual({ ok: true });
  });
});
