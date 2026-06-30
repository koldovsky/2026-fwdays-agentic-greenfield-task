// Deterministic graders for dataset evals (ADR-0013). Pure functions — no LLM call here, so they
// are unit-testable. The runner (run.ts) issues the real model call; these grade the output.

/** Exact match for enum/label fields (intent, source, meal). */
export const gradeExact = (expected: string, actual: string): boolean => expected === actual;

/** Accuracy over a set of pass/fail results (empty set scores 1 — nothing to fail). */
export const accuracy = (results: boolean[]): number =>
  results.length === 0 ? 1 : results.filter(Boolean).length / results.length;
