import { describe, expect, it } from "vitest";

import type { RequirementImportance } from "@/shared/lib/scoring";

import {
  deriveClarifyingQuestions,
  MAX_CLARIFYING_QUESTIONS,
  type ClarifyingQuestionSourceRow,
} from "./derive";

function row(
  text: string,
  status: ClarifyingQuestionSourceRow["status"],
  importance: RequirementImportance = "must-have",
  keywords: readonly string[] = ["react"],
): ClarifyingQuestionSourceRow {
  return { requirement: { text, keywords, importance }, status };
}

describe("deriveClarifyingQuestions", () => {
  it("no partial/gap rows means an empty array", () => {
    const rows = [row("React", "met"), row("SQL", "overclaim-risk")];
    expect(deriveClarifyingQuestions(rows)).toEqual([]);
  });

  it("met/overclaim-risk rows never produce a question, even alongside eligible ones", () => {
    const rows = [
      row("React", "met"),
      row("Go", "gap"),
      row("SQL", "overclaim-risk"),
      row("TypeScript", "partial"),
    ];
    const questions = deriveClarifyingQuestions(rows);
    expect(questions).toHaveLength(2);
    expect(questions.map((q) => q.requirementText)).toEqual([
      "Go",
      "TypeScript",
    ]);
  });

  it("bounds to MAX_CLARIFYING_QUESTIONS by default, keeping the highest-priority rows", () => {
    const rows = Array.from({ length: MAX_CLARIFYING_QUESTIONS + 3 }, (_, i) =>
      row(`Req ${i}`, "gap"),
    );
    const questions = deriveClarifyingQuestions(rows);
    expect(questions).toHaveLength(MAX_CLARIFYING_QUESTIONS);
  });

  it("bound is overridable via opts.maxQuestions", () => {
    const rows = [row("A", "gap"), row("B", "gap"), row("C", "gap")];
    expect(deriveClarifyingQuestions(rows, { maxQuestions: 1 })).toHaveLength(
      1,
    );
    expect(deriveClarifyingQuestions(rows, { maxQuestions: 0 })).toHaveLength(
      0,
    );
  });

  it("prioritizes gap before partial", () => {
    const rows = [
      row("Partial one", "partial"),
      row("Gap one", "gap"),
      row("Partial two", "partial"),
    ];
    const questions = deriveClarifyingQuestions(rows, { maxQuestions: 1 });
    expect(questions[0]?.requirementText).toBe("Gap one");
  });

  it("within the same status, prioritizes must-have before nice-to-have", () => {
    const rows = [
      row("Nice one", "gap", "nice-to-have"),
      row("Must one", "gap", "must-have"),
    ];
    const questions = deriveClarifyingQuestions(rows, { maxQuestions: 1 });
    expect(questions[0]?.requirementText).toBe("Must one");
  });

  it("falls back to original array order as the final, stable tiebreak", () => {
    const rows = [
      row("First gap", "gap", "must-have"),
      row("Second gap", "gap", "must-have"),
    ];
    const questions = deriveClarifyingQuestions(rows);
    expect(questions.map((q) => q.requirementText)).toEqual([
      "First gap",
      "Second gap",
    ]);
  });

  it("renders the open, unpresumptive Ukrainian template with the requirement's own keywords", () => {
    const rows = [
      row("Досвід з Kubernetes", "gap", "must-have", ["kubernetes", "helm"]),
    ];
    const [question] = deriveClarifyingQuestions(rows);
    expect(question?.text).toBe(
      "Вимога: Досвід з Kubernetes. Чи є у вас практичний досвід з kubernetes, helm? Розкажіть коротко про конкретний випадок",
    );
    expect(question?.text).not.toContain("!");
  });

  it("row fixtures carry exactly the narrow shape — no cvProfile or unrelated fields at runtime", () => {
    const fixture: ClarifyingQuestionSourceRow = row("React", "gap");
    expect(Object.keys(fixture).sort()).toEqual(["requirement", "status"]);
    expect(Object.keys(fixture.requirement).sort()).toEqual([
      "importance",
      "keywords",
      "text",
    ]);
  });

  it("the source-row type structurally rejects a cvProfile or other row data (compile-time proof)", () => {
    // ClarifyingQuestionSourceRow must not accept a cvProfile, jd text,
    // matchScore, or any other row's fields: the row type is narrow BY
    // CONSTRUCTION so this skill has nothing to "fish" toward (design.md §2,
    // FR-WIZARD-02). `@ts-expect-error` only suppresses an error reported on
    // the very next source line, so the offending literal is kept on one line.
    // @ts-expect-error -- cvProfile is not part of ClarifyingQuestionSourceRow
    deriveClarifyingQuestions([{ requirement: { text: "React", keywords: ["react"], importance: "must-have" }, status: "gap", cvProfile: { skills: ["react"], sentences: ["Built things with React."] } }]);
    expect(true).toBe(true);
  });
});
