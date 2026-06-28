// @trace FR-FORM-03 FR-FORM-04 TC-VALID-01
import { describe, expect, it } from "vitest";
import { firstUnansweredRequiredQuestion } from "@/lib/cycles/resume";

/**
 * RED-first unit tests for firstUnansweredRequiredQuestion (FR-FORM-03,
 * FR-FORM-04). `lib/cycles/resume.ts` does NOT exist yet — this whole suite
 * MUST fail to import (module not found) until it is implemented.
 *
 * Design authority: openspec/changes/add-form/design.md, Decision 3.
 * Mirrors the per-type validity rules of lib/cycles/status.ts's
 * isResponseComplete: scale answers must numerically match one of the
 * question's own anchors; open answers must be a non-empty, non-whitespace
 * string after trim.
 */

type Question = {
  id: string;
  order: number;
  type: string;
  required: boolean;
  anchors?: ReadonlyArray<{ value: number }>;
};

const scaleQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: "q-scale",
  order: 1,
  type: "scale",
  required: true,
  anchors: [{ value: 1 }, { value: 2 }, { value: 3 }],
  ...overrides,
});

const openQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: "q-open",
  order: 2,
  type: "open",
  required: true,
  ...overrides,
});

describe("firstUnansweredRequiredQuestion", () => {
  it("returns the first required question whose answer is missing", () => {
    const questions = [
      scaleQuestion({ id: "q1", order: 1 }),
      openQuestion({ id: "q2", order: 2 }),
    ];

    const result = firstUnansweredRequiredQuestion(questions, {});

    expect(result).toEqual({ id: "q1", order: 1 });
  });

  it("returns the first required question whose saved scale value does not match any anchor", () => {
    const questions = [
      scaleQuestion({ id: "q1", order: 1, anchors: [{ value: 1 }, { value: 2 }] }),
    ];

    const result = firstUnansweredRequiredQuestion(questions, { q1: 99 });

    expect(result).toEqual({ id: "q1", order: 1 });
  });

  it("returns the first required question whose saved open answer is empty/whitespace-only", () => {
    const questions = [openQuestion({ id: "q1", order: 1 })];

    const result = firstUnansweredRequiredQuestion(questions, { q1: "   " });

    expect(result).toEqual({ id: "q1", order: 1 });
  });

  it("skips optional questions entirely, even when they appear before the first unanswered required question", () => {
    const questions = [
      openQuestion({ id: "q-optional", order: 1, required: false }),
      openQuestion({ id: "q-required", order: 2, required: true }),
    ];

    // The optional question has no answer at all, but it must never become
    // the resume target — the first REQUIRED gap wins.
    const result = firstUnansweredRequiredQuestion(questions, {});

    expect(result).toEqual({ id: "q-required", order: 2 });
  });

  it("returns null when every required question has a valid answer, regardless of optional state", () => {
    const questions = [
      scaleQuestion({ id: "q1", order: 1, anchors: [{ value: 1 }, { value: 2 }] }),
      openQuestion({ id: "q2", order: 2, required: true }),
      openQuestion({ id: "q3", order: 3, required: false }),
    ];

    const result = firstUnansweredRequiredQuestion(questions, {
      q1: 2,
      q2: "a thoughtful answer",
      // q3 (optional) intentionally left unanswered
    });

    expect(result).toBeNull();
  });

  it("returns null for an empty questions array", () => {
    const result = firstUnansweredRequiredQuestion([], {});
    expect(result).toBeNull();
  });

  it("returns null for a template with zero required questions, even when answers is empty", () => {
    const questions = [
      openQuestion({ id: "q1", order: 1, required: false }),
      scaleQuestion({ id: "q2", order: 2, required: false }),
    ];

    const result = firstUnansweredRequiredQuestion(questions, {});

    expect(result).toBeNull();
  });

  it("returns the EARLIEST unanswered required question when several lack answers, not the last", () => {
    const questions = [
      openQuestion({ id: "q1", order: 1, required: true }),
      openQuestion({ id: "q2", order: 2, required: true }),
      openQuestion({ id: "q3", order: 3, required: true }),
    ];

    const result = firstUnansweredRequiredQuestion(questions, {});

    expect(result).toEqual({ id: "q1", order: 1 });
  });

  it("resumes at an earlier unanswered required question even when a LATER required question is already answered (out-of-order resume)", () => {
    const questions = [
      openQuestion({ id: "q1", order: 1, required: true }),
      openQuestion({ id: "q2", order: 2, required: true }),
      openQuestion({ id: "q3", order: 3, required: true }),
    ];

    // q1 unanswered, but q3 (a LATER question) is already answered — must
    // not be mistaken for "resume at the highest answered index + 1".
    const result = firstUnansweredRequiredQuestion(questions, {
      q3: "answered out of order",
    });

    expect(result).toEqual({ id: "q1", order: 1 });
  });
});
