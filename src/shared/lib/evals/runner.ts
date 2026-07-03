// Suite runner — aggregate many graded cases into a pass rate + failure list.
// Pure; used by the eval unit tests as a regression gate on the honesty contract.
import type { Grade } from "./types";

export interface CaseResult {
  readonly name: string;
  readonly passed: boolean;
  readonly failedCheckIds: readonly string[];
}

export interface SuiteResult {
  readonly total: number;
  readonly passed: number;
  readonly passRate: number;
  readonly results: readonly CaseResult[];
  readonly failures: readonly CaseResult[];
}

/** Grade every case and summarize. `grader` maps a case to its {@link Grade}. */
export function runSuite<T extends { name: string }>(
  cases: readonly T[],
  grader: (item: T) => Grade,
): SuiteResult {
  const results: CaseResult[] = cases.map((item) => {
    const g = grader(item);
    return {
      name: item.name,
      passed: g.passed,
      failedCheckIds: g.checks.filter((c) => !c.ok).map((c) => c.id),
    };
  });
  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    passRate: results.length === 0 ? 1 : passed / results.length,
    results,
    failures: results.filter((r) => !r.passed),
  };
}
