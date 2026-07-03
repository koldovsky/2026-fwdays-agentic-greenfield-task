import { describe, expect, it } from "vitest";
import { getProgram } from "@/app/lib/programs";
import { competitiveScore, evaluate } from "@/app/lib/scoring";
import {
  adviceFor,
  cardSummary,
  compareAdvice,
  matchesCategory,
  scoreBreakdown,
  selectPrograms,
  type ScoredProgram,
} from "@/app/lib/recommend";
import type { Benefits, Scores } from "@/app/lib/types";

const SCORES: Scores = { ukr: 152, math: 138, hist: 145, eng: 161 };
const NONE: Benefits = { village: false, quota: false, orphan: false };
const base = { scores: SCORES, benefits: NONE, elective: "Англійська" as const };

const scoredOf = (id: string): ScoredProgram => {
  const program = getProgram(id)!;
  return { program, evaluation: evaluate(program, SCORES, NONE, "Англійська") };
};

describe("selectPrograms (FR-FILTER-01)", () => {
  it("returns all programs when no filter is set, fitting-first, highest chance first", () => {
    const list = selectPrograms({ ...base, fields: [], cities: [] });
    expect(list).toHaveLength(11);
    const fitting = list.filter((s) => s.evaluation.fits);
    const chances = fitting.map((s) => s.evaluation.chance);
    expect([...chances].sort((a, b) => b - a)).toEqual(chances);
  });
  it("narrows by city and by field", () => {
    const kyiv = selectPrograms({ ...base, fields: [], cities: ["Київ"] });
    expect(kyiv.every((s) => s.program.city === "Київ")).toBe(true);
    const law = selectPrograms({ ...base, fields: ["Право"], cities: [] });
    expect(law.every((s) => s.program.field === "Право")).toBe(true);
  });
});

describe("matchesCategory (FR-FILTER-02)", () => {
  it("keeps only the chosen category, and 'all' keeps everything fitting", () => {
    const safe = scoredOf("hnu-p"); // ~96 %
    expect(matchesCategory(safe, "safe")).toBe(true);
    expect(matchesCategory(safe, "dream")).toBe(false);
    expect(matchesCategory(safe, "all")).toBe(true);
  });
});

describe("scoreBreakdown (FR-DETAIL-01)", () => {
  it("contributions sum to the competitive score (no benefit)", () => {
    const program = getProgram("kma-f")!;
    const rows = scoreBreakdown(program, SCORES, NONE, "Англійська");
    const sum = rows.reduce((a, r) => a + r.value, 0);
    expect(sum).toBeCloseTo(competitiveScore(program, SCORES, NONE), 6);
  });
  it("adds a benefit row whose inclusion still sums to the competitive score", () => {
    const program = getProgram("lnu-s")!;
    const benefits: Benefits = { village: true, quota: true, orphan: false };
    const rows = scoreBreakdown(program, SCORES, benefits, "Англійська");
    expect(rows.some((r) => r.label.startsWith("Пільга"))).toBe(true);
    const sum = rows.reduce((a, r) => a + r.value, 0);
    expect(sum).toBeCloseTo(competitiveScore(program, SCORES, benefits), 6);
  });
  it("scales rows when the competitive score is capped at 200", () => {
    const maxScores: Scores = { ukr: 200, math: 200, hist: 200, eng: 200 };
    const allBenefits: Benefits = { village: true, quota: true, orphan: true };
    const program = getProgram("lnu-s")!;
    const rows = scoreBreakdown(program, maxScores, allBenefits, "Англійська");
    const sum = rows.reduce((a, r) => a + r.value, 0);
    expect(competitiveScore(program, maxScores, allBenefits)).toBe(200);
    expect(sum).toBeCloseTo(200, 6);
  });
});

describe("adviceFor / cardSummary category consistency (FR-SCORE-03)", () => {
  it("advice tone matches the category and includes range + seats", () => {
    const safe = scoredOf("hnu-p");
    const text = adviceFor(safe.program, safe.evaluation);
    expect(text).toContain("Надійний вибір");
    expect(text).toContain("Бюджетних місць");
  });
  it("returns neutral copy when the program does not fit the elective", () => {
    const program = getProgram("knu-j")!;
    const ineligible = evaluate(program, SCORES, NONE, "Біологія");
    const text = adviceFor(program, ineligible);
    expect(text).toContain("інший четвертий предмет НМТ");
    expect(text).not.toContain("Надійний вибір");
  });
  it("cardSummary states the ineligible case in text, not color", () => {
    const program = getProgram("knu-j")!;
    const ineligible = evaluate(program, SCORES, NONE, "Біологія");
    expect(cardSummary(ineligible)).toContain("інший предмет НМТ");
    expect(cardSummary(ineligible)).toContain("не розраховується");
  });
});

describe("compareAdvice (FR-COMPARE-01)", () => {
  it("returns empty for fewer than 2 options", () => {
    expect(compareAdvice([scoredOf("kma-f")])).toBe("");
  });
  it("names the highest-chance option as priority 1", () => {
    const advice = compareAdvice([scoredOf("kma-f"), scoredOf("lnu-e"), scoredOf("hnu-p")]);
    expect(advice).toContain("ХНУ ім. Каразіна");
    expect(advice).toContain("пріоритет");
  });
  it("ignores ineligible programs when recommending", () => {
    // kma-f fits Англійська (~73 %). vnu-j accepts only Англ/Нім, so with Хімія it
    // is ineligible — but its computed chance (98 %) would outrank kma-f if fit
    // were ignored. The advice must still recommend the eligible kma-f.
    const eligible = scoredOf("kma-f");
    const strongButIneligible: ScoredProgram = {
      program: getProgram("vnu-j")!,
      evaluation: evaluate(getProgram("vnu-j")!, SCORES, NONE, "Хімія"),
    };
    expect(strongButIneligible.evaluation.fits).toBe(false);
    const advice = compareAdvice([eligible, strongButIneligible]);
    expect(advice).toContain("НаУКМА");
    expect(advice).not.toContain("Лесі Українки");
  });
});

// @trace FR-FILTER-01, FR-FILTER-02, FR-DETAIL-01, FR-SCORE-03, FR-COMPARE-01
