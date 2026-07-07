# Current State

## Gate

Current gate: **G4.2 green** — `core-inference` slice closed (2026-07-07).

G3 capability plan approved with amendments. Provisional eval run complete; **eval ratchet not locked** (G5 only).

## Provisional Eval (core-inference)

| Metric | Value |
| --- | --- |
| Pass rate | **90.0% (36/40)** |
| Threshold | 0.5 |
| Dataset | `evals/dataset/` with `expected.json` |
| Failures | 4 negatives with false positives (`negative-02`, `negative-04`, `negative-09`, `negative-10`) |
| Ratchet baseline | **Not locked** — pending `evals-hardening` (G5) |

## Completed Slices

### core-preprocessing (G4.1)

- Core center-crop, resize to `320x320`, NCHW raw RGB tensor, EXIF orientation.
- 12 Core unit tests with `@trace FR-PREPROC-*`.
- Verdict: `qa/verdicts/core-preprocessing.md` (pass-with-risks).

### core-inference (G4.2)

- `IDetector`, lazy ONNX session reuse, `ModelAssetCopier`, output parsing, label mapping, threshold 0.5.
- 8 new Core detection unit tests with `@trace FR-DETECT-*` (20 Core tests total).
- Provisional output eval runner; `evals/dataset/expected.json` generated.
- Verdict: `qa/verdicts/core-inference.md` (pass-with-risks).

## Scaffolded Projects

- `src/TrafficSignScanner.Core` — preprocessing + detection implemented
- `src/TrafficSignScanner.App`
- `src/TrafficSignScanner.Mcp`
- `tests/TrafficSignScanner.Core.Tests`
- `evals/TrafficSignScanner.Evals`

## Next Slice

`core-overlay` — Core coordinate conversion from model/crop space to displayed preview space; Core owns all overlay geometry.
