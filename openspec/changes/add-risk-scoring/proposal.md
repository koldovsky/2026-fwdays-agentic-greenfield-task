# Change: add-risk-scoring

- Status: shipped
- Requirements: FR-PARSE-01/02, FR-TAGS-01, FR-RISK-01, FR-SCORE-01/02, FR-OUT-01/02

## Why

We need one vertical capability that takes a `terraform plan -json` and turns it into
a ranked, gate-able risk report. This is the first (and, for the homework, only)
capability — built end to end through the full loop: spec → failing tests → green →
eval → review.

## What changes

- Add `src/lib/parse.ts` — zod boundary parsing of plan JSON into `ResourceChange[]`.
- Add `src/lib/rules/{requiredTags,riskyDelete}.ts` — pure policy predicates.
- Add `src/lib/score.ts` — deterministic additive scorer + `classify()` + ranking.
- Add `src/lib/summarize.ts` — ranked human text + JSON report, respecting `FR-OUT-02`.
- Add `src/cli.ts` — I/O shell (file/stdin → report → exit code per `BC-EXIT-01`).
- Add tests (deterministic) and an eval suite (rubric + ratchet) for the summary.

## Verification

- `npm run test` — exact-equality unit tests on parse/rules/score.
- `npm run eval` — rubric over `evals/dataset.json` ≥ threshold, ratcheted to baseline.
