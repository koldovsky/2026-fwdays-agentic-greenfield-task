// OUTPUT eval gate — the golden artifact passes every honesty check, and each
// adversarial artifact trips the invariant it violates (proving checks can fail).
import { describe, expect, it } from "vitest";
import { adversarialOutputs, goldenOutput } from "./fixtures";
import { gradeOutput } from "./output";
import { runSuite } from "./runner";

describe("gradeOutput — golden", () => {
  it("passes every check", () => {
    const grade = gradeOutput(goldenOutput);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBe(1);
  });
});

describe("gradeOutput — adversarial", () => {
  for (const { name, output, expectFail } of adversarialOutputs) {
    it(`fails "${name}" on ${expectFail}`, () => {
      const grade = gradeOutput(output);
      expect(grade.passed).toBe(false);
      expect(grade.checks.filter((c) => !c.ok).map((c) => c.id)).toContain(expectFail);
    });
  }
});

describe("runSuite over output cases", () => {
  it("passes the golden, fails the adversarials", () => {
    const cases = [
      { name: "golden", output: goldenOutput },
      ...adversarialOutputs.map((a) => ({ name: a.name, output: a.output })),
    ];
    const result = runSuite(cases, (c) => gradeOutput(c.output));
    expect(result.passed).toBe(1);
    expect(result.failures).toHaveLength(adversarialOutputs.length);
  });
});
