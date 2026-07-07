# Proposal: evals-hardening

## Why

Provisional eval (90%) must become a locked G5 gate with ratcheted output-eval and Core coverage baselines.

## What Changes

- Harden `OutputEvalRunner` (positives ≥ threshold, negatives zero detections).
- Validate `expected.json` covers all dataset images.
- Lock `evals/baselines/output-eval.json` and `evals/baselines/coverage.json`.
- Upgrade check scripts to enforce ratchets (no "baseline pending").
- Expand `check-gate-status.cs` for G5 full gate report.
- Add EXIF-oriented JPEG integration test for preprocessing.

## Capabilities

- **Added**: `evals` spec for NFR-EVAL-01 and NFR-TEST-01 ratchet scenarios.

## Impact

- `evals/TrafficSignScanner.Evals/`
- `evals/baselines/`
- `scripts/check-*.cs`
- `tests/TrafficSignScanner.Core.Tests/Preprocessing/`

## Non-Goals

- Model retraining or threshold tuning to improve pass rate beyond current 90%.
