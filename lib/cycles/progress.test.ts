import { describe, it, expect } from "vitest";
import { computeProgress, progressFraction, isAnswerValid } from "./progress";

const snapshot = {
  questions: [
    { id: "s1", type: "scale", required: true, anchors: [{ value: 1 }, { value: 3 }, { value: 5 }] },
    { id: "o1", type: "open", required: true },
    { id: "o2", type: "open", required: false },
  ],
};

describe("isAnswerValid", () => {
  it("scale: only a matching anchor counts", () => {
    expect(isAnswerValid(snapshot.questions[0], 3)).toBe(true);
    expect(isAnswerValid(snapshot.questions[0], 2)).toBe(false);
    expect(isAnswerValid(snapshot.questions[0], undefined)).toBe(false);
  });

  it("open: non-empty trimmed text counts; whitespace-only does not", () => {
    expect(isAnswerValid(snapshot.questions[1], "good")).toBe(true);
    expect(isAnswerValid(snapshot.questions[1], "   ")).toBe(false);
    expect(isAnswerValid(snapshot.questions[1], "")).toBe(false);
  });
});

describe("computeProgress", () => {
  it("counts only required questions with valid answers", () => {
    expect(computeProgress(snapshot, { s1: 3, o1: "answer", o2: "optional" })).toEqual({ answered: 2, total: 2 });
  });

  it("excludes a whitespace-only required open answer", () => {
    expect(computeProgress(snapshot, { s1: 3, o1: "   " })).toEqual({ answered: 1, total: 2 });
  });

  it("excludes a capped-out scale recorded with no value (absent from the record)", () => {
    expect(computeProgress(snapshot, { o1: "answer" })).toEqual({ answered: 1, total: 2 });
  });

  it("zero answers yields 0 of total", () => {
    expect(computeProgress(snapshot, {})).toEqual({ answered: 0, total: 2 });
  });

  it("a fully answered cycle equals total", () => {
    expect(computeProgress(snapshot, { s1: 5, o1: "done" })).toEqual({ answered: 2, total: 2 });
  });

  it("a snapshot with no required questions is 0 of 0", () => {
    expect(computeProgress({ questions: [{ id: "x", type: "open", required: false }] }, {})).toEqual({
      answered: 0,
      total: 0,
    });
  });
});

describe("progressFraction", () => {
  it("is the answered/total ratio", () => {
    expect(progressFraction({ answered: 1, total: 2 })).toBe(0.5);
    expect(progressFraction({ answered: 2, total: 2 })).toBe(1);
  });

  it("is 0 (not NaN) for a 0-of-0 snapshot", () => {
    expect(progressFraction({ answered: 0, total: 0 })).toBe(0);
  });
});
