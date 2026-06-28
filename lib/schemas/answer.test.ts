// @trace FR-RESP-03 TC-VALID-01
import { describe, expect, it } from "vitest";
import {
  openAnswerSchema,
  scaleAnswerSchema,
  answerInputSchema,
  isValidAnchorValue,
} from "@/lib/schemas/answer";

/**
 * RED-first unit tests for the shared answer-write contract (FR-RESP-03).
 * `lib/schemas/answer.ts` does NOT exist yet — this whole suite MUST fail to
 * import (module not found) until it is implemented.
 *
 * Design authority: openspec/changes/add-respond/design.md, Decision 4.
 * Requirement: openspec/specs/respond/spec.md FR-RESP-03,
 * "Invalid, expired, or out-of-bounds entry is handled calmly".
 */

// ---------------------------------------------------------------------------
// openAnswerSchema
// ---------------------------------------------------------------------------

describe("openAnswerSchema", () => {
  it("accepts a string up to 4000 characters", () => {
    const text = "a".repeat(4000);
    const result = openAnswerSchema.safeParse(text);
    expect(result.success).toBe(true);
  });

  it("rejects a 4001-character string", () => {
    const text = "a".repeat(4001);
    const result = openAnswerSchema.safeParse(text);
    expect(result.success).toBe(false);
  });

  it("accepts an empty string (an empty open answer is still a valid string)", () => {
    const result = openAnswerSchema.safeParse("");
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scaleAnswerSchema
// ---------------------------------------------------------------------------

describe("scaleAnswerSchema", () => {
  it("accepts a plain integer", () => {
    const result = scaleAnswerSchema.safeParse(3);
    expect(result.success).toBe(true);
  });

  it("rejects a numeric string with no coercion", () => {
    const result = scaleAnswerSchema.safeParse("3");
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer float", () => {
    const result = scaleAnswerSchema.safeParse(3.5);
    expect(result.success).toBe(false);
  });

  it("rejects a decimal-comma locale-formatted string", () => {
    const result = scaleAnswerSchema.safeParse("3,5");
    expect(result.success).toBe(false);
  });

  it("rejects a thousands-separated locale-formatted string", () => {
    const result = scaleAnswerSchema.safeParse("1 000");
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-padded numeric string", () => {
    const result = scaleAnswerSchema.safeParse(" 3 ");
    expect(result.success).toBe(false);
  });

  it("rejects NaN", () => {
    const result = scaleAnswerSchema.safeParse(NaN);
    expect(result.success).toBe(false);
  });

  it("rejects Infinity", () => {
    const result = scaleAnswerSchema.safeParse(Infinity);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// answerInputSchema — discriminated union on `type`
// ---------------------------------------------------------------------------

describe("answerInputSchema", () => {
  it("accepts a valid open-answer payload", () => {
    const result = answerInputSchema.safeParse({
      type: "open",
      questionId: "q1",
      text: "hello",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid scale-answer payload", () => {
    const result = answerInputSchema.safeParse({
      type: "scale",
      questionId: "q1",
      value: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing questionId", () => {
    const result = answerInputSchema.safeParse({
      type: "open",
      text: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unexpected type value", () => {
    const result = answerInputSchema.safeParse({
      type: "chat",
      questionId: "q1",
      text: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a scale-typed entry carrying the open shape (text instead of value)", () => {
    const result = answerInputSchema.safeParse({
      type: "scale",
      questionId: "q1",
      text: "hello",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidAnchorValue
// ---------------------------------------------------------------------------

describe("isValidAnchorValue", () => {
  it("returns true when value matches one anchor's value exactly", () => {
    const anchors = [{ value: 1 }, { value: 2 }, { value: 3 }];
    expect(isValidAnchorValue(2, anchors)).toBe(true);
  });

  it("returns false when value does not match any anchor", () => {
    const anchors = [{ value: 1 }, { value: 2 }, { value: 3 }];
    expect(isValidAnchorValue(4, anchors)).toBe(false);
  });

  it("returns false for an empty anchors array", () => {
    expect(isValidAnchorValue(1, [])).toBe(false);
  });
});
