# Design: evals-hardening

## Eval Pass Criteria

| Case type | Pass condition |
| --- | --- |
| Positive | At least one detection with expected label and confidence ≥ `confidenceThreshold` (0.5) |
| Negative | Zero detections |

## Ratchets

- **Output eval**: `evals/baselines/output-eval.json` stores minimum `passRate` (0.9 at lock). Observed rate must not drop below baseline.
- **Coverage**: `evals/baselines/coverage.json` stores minimum Core `lineRate` (~76.2% at lock). Observed rate must not drop below baseline.

## Gate Scripts

- `check-eval-ratchet.cs` loads baseline, runs `OutputEvalRunner` via built eval assembly, compares pass rate.
- `check-coverage-ratchet.cs` collects Core coverage if needed, compares to baseline.
- `check-gate-status.cs` prints G5 report: baselines locked, slice verdicts present, harness paths OK.
