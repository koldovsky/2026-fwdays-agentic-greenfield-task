## ADDED Requirements

### Requirement: Dataset eval with deterministic grader
The eval framework SHALL run **dataset evals**: a labeled `evals/datasets/<capability>.jsonl` of
`{ input, expected, meta }`, against which a runner issues the real LLM operation at `temperature: 0`
and compares the structured output to `expected` with a typed matcher (exact for enums, numeric
±band for quantities, date-equality for back-dating). The metric SHALL be **accuracy per
capability×field**, gated at a per-capability threshold ([ADR-0013](../../../../docs/adr/0013-eval-framework.md)).
`npm run evals` SHALL write `evals/results/latest.json` (a gitignored build artifact).

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
