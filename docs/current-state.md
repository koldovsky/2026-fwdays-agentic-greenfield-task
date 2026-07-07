# Current State

## Gate

Current gate: **G4.3 green** — `core-overlay` slice closed (2026-07-08).

G3 capability plan approved. Provisional eval pass-rate **90.0% (36/40)** from `core-inference`; ratchet not locked (G5).

## Provisional Eval (core-inference)

| Metric | Value |
| --- | --- |
| Pass rate | **90.0% (36/40)** |
| Threshold | 0.5 |
| Ratchet baseline | **Not locked** — pending `evals-hardening` (G5) |

## Completed Slices

### core-preprocessing (G4.1)

- Center-crop, resize `320x320`, NCHW raw RGB tensor, EXIF orientation.
- Verdict: `qa/verdicts/core-preprocessing.md` (pass-with-risks).

### core-inference (G4.2)

- `IDetector`, ONNX session, parsing, thresholding, label mapping, provisional eval.
- Verdict: `qa/verdicts/core-inference.md` (pass-with-risks).

### core-overlay (G4.3)

- Model→source→display coordinate conversion; SkiaSharp annotated bitmap rendering (boxes + labels).
- 5 overlay unit tests with `@trace FR-OVERLAY-01` (26 Core tests total).
- Verdict: `qa/verdicts/core-overlay.md` (pass).

## Scaffolded Projects

- `src/TrafficSignScanner.Core` — preprocessing, detection, overlay implemented
- `src/TrafficSignScanner.App`
- `src/TrafficSignScanner.Mcp`
- `tests/TrafficSignScanner.Core.Tests`
- `evals/TrafficSignScanner.Evals`

## Next Slice

`app-ui` — MAUI MVVM capture/pick, off-UI-thread detection, display-only annotated preview (FR-OVERLAY-02).
