# Output Eval Report

Generated: 2026-07-08 · Model: bundled Custom Vision compact ONNX (`src/TrafficSignScanner.App/Resources/Raw/model.onnx`)

## Summary

| Metric | Value |
| --- | --- |
| Pass rate | **90.0% (36/40)** |
| Confidence threshold | **0.5** |
| Positives | 30 cases — all pass |
| Negatives | 10 cases — 6 pass, **4 fail** |
| Baseline | locked in `evals/baselines/output-eval.json` |
| Ratchet | enforced by `scripts/check-eval-ratchet.cs` and `OutputEvalRatchetTests` |

## Dataset

| Folder | Cases | Expectation |
| --- | ---: | --- |
| `no-entry/` | 10 | label `no-entry` @ ≥ 0.5 |
| `parking-prohibited/` | 10 | label `parking-prohibited` @ ≥ 0.5 |
| `stop-sign/` | 10 | label `stop-sign` @ ≥ 0.5 |
| `negative/` | 10 | zero detections |

Manifest: `evals/dataset/expected.json` (40 entries, validated by `ExpectedJson_CoversEveryDatasetImage`).

## Failures (4)

All failures are **false positives on negative images** — detections above threshold where none were expected:

| Image | Observed | Notes |
| --- | --- | --- |
| `negative/negative-02.jpg` | `stop-sign@0.51` | just above threshold |
| `negative/negative-04.jpg` | `parking-prohibited@0.89` | high-confidence FP |
| `negative/negative-09.jpg` | `no-entry@0.90` | high-confidence FP |
| `negative/negative-10.jpg` | `parking-prohibited@0.66` | moderate FP |

These are **accepted at G5** — baseline locked at observed 90%; improving them requires model retraining (out of MVP scope).

## Coverage Ratchet (NFR-TEST-01)

| Metric | Value |
| --- | --- |
| Assembly | `TrafficSignScanner.Core` |
| Line rate | **76.2%** (346 / 454 lines) |
| Baseline | `evals/baselines/coverage.json` |
| Collection | `dotnet test` with `--collect:"XPlat Code Coverage"` |

## How to Reproduce

```powershell
dotnet test evals/TrafficSignScanner.Evals/TrafficSignScanner.Evals.csproj
dotnet run scripts/check-eval-ratchet.cs
dotnet run scripts/check-coverage-ratchet.cs
```

Detailed failure lines appear when running the ratchet test:

```powershell
dotnet test evals/TrafficSignScanner.Evals/TrafficSignScanner.Evals.csproj `
  --filter "FullyQualifiedName~Output_eval_pass_rate" `
  --logger "console;verbosity=detailed"
```
