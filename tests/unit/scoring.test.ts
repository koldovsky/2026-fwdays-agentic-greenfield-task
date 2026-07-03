import { describe, expect, it } from "vitest";
import {
  benefitBonus,
  categoryOf,
  clampScore,
  competitiveScore,
  curveK,
  cutoffVolatility,
  evaluate,
  logistic,
  programFits,
  rawScore,
} from "@/app/lib/scoring";
import { PROGRAMS, getProgram } from "@/app/lib/programs";
import type { Benefits, Scores } from "@/app/lib/types";

const SCORES: Scores = { ukr: 152, math: 138, hist: 145, eng: 161 };
const NONE: Benefits = { village: false, quota: false, orphan: false };
const kma = getProgram("kma-f")!;

describe("clampScore (FR-INPUT-01)", () => {
  it("clamps to 100–200 and rounds", () => {
    expect(clampScore(250)).toBe(200);
    expect(clampScore(50)).toBe(100);
    expect(clampScore(151.6)).toBe(152);
  });
  it("falls back to the minimum for non-finite input", () => {
    expect(clampScore(Number.NaN)).toBe(100);
    expect(clampScore(Number.POSITIVE_INFINITY)).toBe(100);
  });
});

describe("benefitBonus (FR-INPUT-03)", () => {
  it("sums the active benefit bonuses", () => {
    expect(benefitBonus(NONE)).toBe(0);
    expect(benefitBonus({ village: true, quota: true, orphan: false })).toBeCloseTo(0.06, 10);
    expect(benefitBonus({ village: true, quota: true, orphan: true })).toBeCloseTo(0.08, 10);
  });
});

describe("competitiveScore (FR-SCORE-01)", () => {
  it("is the weighted sum times (1 + bonus)", () => {
    const raw = rawScore(kma, SCORES);
    expect(competitiveScore(kma, SCORES, NONE)).toBeCloseTo(raw, 10);
    expect(competitiveScore(kma, SCORES, { village: true, quota: true, orphan: false })).toBeCloseTo(
      raw * 1.06,
      10,
    );
  });
  it("caps at 200 even with a large benefit", () => {
    const maxed: Scores = { ukr: 200, math: 200, hist: 200, eng: 200 };
    expect(competitiveScore(kma, maxed, { village: true, quota: true, orphan: true })).toBe(200);
  });
});

describe("logistic (FR-SCORE-02)", () => {
  it("clamps to 2–98 and is 50 at diff 0", () => {
    expect(logistic(0, 3.5)).toBe(50);
    expect(logistic(1000, 3.5)).toBe(98);
    expect(logistic(-1000, 3.5)).toBe(2);
  });
});

describe("curveK / cutoffVolatility", () => {
  it("k scales with seats and caps at 4.4", () => {
    expect(curveK({ ...kma, budgetSeats: 0 })).toBeCloseTo(3.0, 10);
    expect(curveK({ ...kma, budgetSeats: 90 })).toBeCloseTo(4.0, 10);
    expect(curveK({ ...kma, budgetSeats: 126 })).toBeCloseTo(4.4, 10);
    expect(curveK({ ...kma, budgetSeats: 10000 })).toBeCloseTo(4.4, 10);
  });
  it("volatility is floored at 1.6", () => {
    expect(cutoffVolatility({ ...kma, cutoffs: { 2022: 150, 2023: 150, 2024: 150 } })).toBe(1.6);
  });
});

describe("categoryOf (FR-SCORE-03)", () => {
  it("uses the §6 thresholds at the boundaries", () => {
    expect(categoryOf(75)).toBe("safe");
    expect(categoryOf(74)).toBe("real");
    expect(categoryOf(40)).toBe("real");
    expect(categoryOf(39)).toBe("dream");
  });
});

describe("programFits (FR-INPUT-02)", () => {
  it("checks the chosen elective against accepted ones", () => {
    expect(programFits(kma, "Англійська")).toBe(true);
    expect(programFits(kma, "Біологія")).toBe(false);
  });
});

describe("evaluate (FR-SCORE-02, BC-HONESTY-01)", () => {
  it("always returns an ordered band bracketing the point chance", () => {
    for (const program of PROGRAMS) {
      const e = evaluate(program, SCORES, NONE, "Англійська");
      expect(e.band[0]).toBeLessThanOrEqual(e.band[1]);
      expect(e.band[0]).toBeLessThanOrEqual(e.chance);
      expect(e.chance).toBeLessThanOrEqual(e.band[1]);
      expect(e.chance).toBeGreaterThanOrEqual(2);
      expect(e.chance).toBeLessThanOrEqual(98);
    }
  });
});

describe("full-dataset recompute performance (NFR-PERF-01)", () => {
  it("scores every program well under 100 ms", () => {
    const start = performance.now();
    for (let i = 0; i < 50; i += 1) {
      for (const program of PROGRAMS) evaluate(program, SCORES, NONE, "Англійська");
    }
    const perRecompute = (performance.now() - start) / 50;
    expect(perRecompute).toBeLessThan(100);
  });
});

// @trace FR-SCORE-01, FR-SCORE-02, FR-SCORE-03, FR-INPUT-01, FR-INPUT-02, FR-INPUT-03, NFR-PERF-01
