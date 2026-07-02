// TRAJECTORY eval gate — the golden run passes the process contract, and each
// adversarial run trips the invariant it violates (grounding isolation, order,
// bounded retries, fail-honest termination, no user id in payload).
import { describe, expect, it } from "vitest";
import { adversarialTraces, goldenTrace } from "./fixtures";
import { runSuite } from "./runner";
import { gradeTrajectory } from "./trajectory";

describe("gradeTrajectory — golden", () => {
  it("passes every check", () => {
    const grade = gradeTrajectory(goldenTrace);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBe(1);
  });
});

describe("gradeTrajectory — adversarial", () => {
  for (const { name, trace, expectFail } of adversarialTraces) {
    it(`fails "${name}" on ${expectFail}`, () => {
      const grade = gradeTrajectory(trace);
      expect(grade.passed).toBe(false);
      expect(grade.checks.filter((c) => !c.ok).map((c) => c.id)).toContain(expectFail);
    });
  }
});

describe("runSuite over trajectory cases", () => {
  it("passes the golden, fails the adversarials", () => {
    const cases = [
      { name: "golden", trace: goldenTrace },
      ...adversarialTraces.map((a) => ({ name: a.name, trace: a.trace })),
    ];
    const result = runSuite(cases, (c) => gradeTrajectory(c.trace));
    expect(result.passed).toBe(1);
    expect(result.failures).toHaveLength(adversarialTraces.length);
  });
});
