import { describe, it, expect } from "vitest";
import { normalizeForMatch, quoteOccursInAnswer } from "./quote";
import {
  summaryShapeSchema,
  validateSummaryGrounding,
  pruneUngroundedQuotes,
  type SummaryShape,
} from "./schema";

describe("normalizeForMatch", () => {
  it("collapses whitespace and trims, preserving Ukrainian text and case", () => {
    expect(normalizeForMatch("  Дуже   добре\n працює ")).toBe("Дуже добре працює");
    expect(normalizeForMatch("Добре")).not.toBe(normalizeForMatch("добре"));
  });
});

describe("quoteOccursInAnswer", () => {
  it("matches a verbatim substring after normalisation", () => {
    expect(quoteOccursInAnswer("доводить задачі", "Він завжди   доводить задачі до кінця")).toBe(true);
  });

  it("rejects text that is not in the answer", () => {
    expect(quoteOccursInAnswer("ледачий", "Він завжди доводить задачі до кінця")).toBe(false);
  });

  it("rejects an empty quote", () => {
    expect(quoteOccursInAnswer("   ", "будь-що")).toBe(false);
  });
});

describe("summaryShapeSchema", () => {
  it("accepts a well-formed structured summary", () => {
    const value = { strengths: ["наставництво"], growthAreas: ["делегування"], quotes: [{ text: "доводить задачі", questionId: "q1" }] };
    expect(summaryShapeSchema.safeParse(value).success).toBe(true);
  });

  it("rejects a quote missing its questionId", () => {
    const value = { strengths: [], growthAreas: [], quotes: [{ text: "доводить задачі" }] };
    expect(summaryShapeSchema.safeParse(value).success).toBe(false);
  });
});

describe("validateSummaryGrounding", () => {
  const summary: SummaryShape = {
    strengths: ["наставництво"],
    growthAreas: ["делегування"],
    quotes: [{ text: "доводить задачі", questionId: "q1" }],
  };
  const ids = new Set(["q1", "q2"]);
  const answers = { q1: "Він завжди доводить задачі до кінця" };

  it("passes when every quote is attributed and verbatim", () => {
    expect(validateSummaryGrounding(summary, ids, answers)).toEqual({ ok: true });
  });

  it("fails a quote with an unknown questionId", () => {
    const bad: SummaryShape = { ...summary, quotes: [{ text: "доводить задачі", questionId: "qX" }] };
    expect(validateSummaryGrounding(bad, ids, answers).ok).toBe(false);
  });

  it("fails a quote that is not verbatim in its answer", () => {
    const bad: SummaryShape = { ...summary, quotes: [{ text: "ледачий працівник", questionId: "q1" }] };
    expect(validateSummaryGrounding(bad, ids, answers).ok).toBe(false);
  });

  it("passes trivially when there are no quotes", () => {
    expect(validateSummaryGrounding({ strengths: [], growthAreas: [], quotes: [] }, ids, answers)).toEqual({ ok: true });
  });
});

describe("pruneUngroundedQuotes", () => {
  const ids = new Set(["q1", "q2"]);
  const answers = { q1: "Він завжди доводить задачі до кінця" };

  it("keeps grounded quotes and drops ungrounded ones, preserving the report", () => {
    const summary: SummaryShape = {
      strengths: ["наставництво"],
      growthAreas: ["делегування"],
      quotes: [
        { text: "доводить задачі", questionId: "q1" }, // grounded
        { text: "вигадана цитата", questionId: "q1" }, // not verbatim
        { text: "будь-що", questionId: "q2" }, // scale / no answer text
        { text: "доводить задачі", questionId: "qX" }, // unknown id
      ],
    };
    const result = pruneUngroundedQuotes(summary, ids, answers);
    expect(result.summary.quotes).toEqual([{ text: "доводить задачі", questionId: "q1" }]);
    expect(result.summary.strengths).toEqual(["наставництво"]);
    expect(result.summary.growthAreas).toEqual(["делегування"]);
    expect(result.dropped).toHaveLength(3);
  });

  it("keeps everything when all quotes are grounded", () => {
    const summary: SummaryShape = {
      strengths: [],
      growthAreas: [],
      quotes: [{ text: "доводить задачі", questionId: "q1" }],
    };
    const result = pruneUngroundedQuotes(summary, ids, answers);
    expect(result.summary.quotes).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
  });
});
