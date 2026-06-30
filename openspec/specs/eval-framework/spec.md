# eval-framework

## Purpose

The deterministic-first eval framework ([ADR-0013](../../../docs/adr/0013-eval-framework.md)): labeled
dataset evals graded by code (LLM run locally), gated in CI by a key-less ratchet on committed
scores. Behavior with a ground truth is an eval here; pure properties (totals==SUM, image-never-on-disk)
stay vitest tests.
## Requirements
### Requirement: Dataset eval with deterministic grader
The eval framework SHALL run **dataset evals**: a labeled `evals/datasets/<capability>.jsonl` of
`{ input, expected, meta }`, against which a runner issues the real LLM operation at `temperature: 0`
and compares the structured output to `expected` with a typed matcher (exact for enums, numeric
±band for quantities, date-equality for back-dating). The metric SHALL be **accuracy per
capability×field**, gated at a per-capability threshold. `npm run evals` SHALL write
`evals/results/latest.json` (a gitignored build artifact).

#### Scenario: Router intent dataset is graded by accuracy
- **WHEN** `npm run evals` runs the `router-intent` dataset
- **THEN** each case's predicted `intent` is compared exactly to `expected.intent`, and the suite
  reports accuracy per field, passing only at/above the capability threshold

### Requirement: Key-less CI ratchet
The CI gate SHALL be deterministic and key-less: `npm run check:evals`
(`scripts/check-eval-ratchet.mjs`) SHALL compare `evals/results/latest.json` to the committed
baseline `quality/eval-baseline.json` per capability/field and FAIL if a score regresses below the
baseline — scores may ratchet up, never silently down. It SHALL skip gracefully (exit 0) before the
first run exists, and SHALL NOT require `ANTHROPIC_API_KEY` (no LLM call in the ratchet).

#### Scenario: A regression fails the ratchet
- **WHEN** `latest.json` reports a capability accuracy below the committed baseline
- **THEN** `check:evals` exits non-zero and names the regressed capability/field

#### Scenario: No API key needed in CI
- **WHEN** `check:evals` runs with no `ANTHROPIC_API_KEY` set
- **THEN** it still completes (it only compares committed JSON; the LLM run happens locally via
  `npm run evals`)

#### Scenario: Graceful skip before first results
- **WHEN** `evals/results/latest.json` does not exist yet
- **THEN** `check:evals` exits 0 with a note rather than failing

### Requirement: Judge eval with LLM rubric grader
The eval framework SHALL support **judge evals** for behavior with no ground truth (coaching tone,
language mirroring, honest-estimate surfacing): a set of cases `{ scenario, produce(), rubric }` in
`evals/cases/<capability>.eval.ts`, where `produce()` issues the real coaching LLM output and a
**fresh judge** LLM call (maker ≠ checker — the judge is a distinct call, not the producer) grades
it **0–100** against the rubric ([ADR-0013](../../../../docs/adr/0013-eval-framework.md)). Rubric
criteria marked `CRITICAL:` SHALL be gating — any miss caps the score at ≤ 49 (fail). The runner
SHALL run judge evals under `npm run evals` and write per-capability scores into the same
`evals/results/latest.json` consumed by the ratchet. Judge evals run **locally only** (they call the
paid LLM); CI never runs them.

#### Scenario: Coaching tone is judged against the rubric
- **WHEN** `npm run evals` runs the `coach-persona-tone` cases
- **THEN** each scenario's produced prose is graded 0–100 by a fresh judge call against the tone
  rubric, and the capability score is written to `latest.json`

#### Scenario: A CRITICAL miss fails the case
- **WHEN** a produced reply violates a `CRITICAL:` rubric criterion (e.g. moralizes a food, shames
  the user, or states an estimate as a precise fact)
- **THEN** the judge caps that case's score at ≤ 49 so the capability cannot pass

#### Scenario: Borderline scores get a second judge
- **WHEN** a case's score lands within the borderline band of the capability threshold
- **THEN** a second judge call grades it and the scores are combined, countering the too-nice-judge
  failure mode

### Requirement: Judge scores ratchet like dataset scores
Judge-eval capability scores SHALL be written into `evals/results/latest.json` in the same
`{ capability: { field: number } }` shape as dataset scores, so the existing key-less ratchet
(`npm run check:evals`) gates them with **no script change** — a judge score may ratchet up, never
silently down.

#### Scenario: A tone regression fails the ratchet
- **WHEN** `latest.json` reports a `coach-persona-tone` score below the committed baseline
- **THEN** `check:evals` exits non-zero and names the regressed capability/field, exactly as for a
  dataset regression

