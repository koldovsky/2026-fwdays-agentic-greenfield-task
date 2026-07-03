/**
 * Eval collector — runs every case's produce() against the real app libs and
 * prints the graded-input JSON the eval-suite consumes:
 *   { cases: [{ id, trace, dimension, capability, scenario, output, rubric }] }
 *
 * Run: `npx tsx scripts/eval-collect.ts` (writes JSON to stdout).
 * Deterministic — outputs come from the shipping pure functions, not mocks.
 */
import { cases as a11y } from "@/evals/cases/a11y.eval";
import { cases as advice } from "@/evals/cases/advice.eval";
import { cases as format } from "@/evals/cases/format.eval";
import { cases as honesty } from "@/evals/cases/honesty.eval";
import { cases as transparency } from "@/evals/cases/transparency.eval";
import { cases as ux } from "@/evals/cases/ux.eval";
import type { EvalCase } from "@/evals/cases/_types";

const all: EvalCase[] = [
  ...honesty,
  ...transparency,
  ...advice,
  ...ux,
  ...format,
  ...a11y,
];

async function main() {
  const cases = [];
  for (const c of all) {
    cases.push({
      id: c.id,
      trace: c.trace,
      dimension: c.dimension,
      capability: c.capability,
      scenario: c.scenario,
      output: await c.produce(),
      rubric: c.rubric,
    });
  }
  process.stdout.write(`${JSON.stringify({ cases }, null, 2)}\n`);
}

main();
