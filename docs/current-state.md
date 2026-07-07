# Current State

## Gate

Current gate: **G4.4 green** — `app-ui` slice closed (2026-07-08).

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
- Verdict: `qa/verdicts/core-overlay.md` (pass).

### app-ui (G4.4)

- MAUI MVVM capture/pick, lazy detector warm-up, off-UI-thread analysis, Core PNG preview binding only.
- 30 Core tests + 4 App ViewModel tests with `@trace` tags.
- Verdict: `qa/verdicts/app-ui.md` (pass).

## Scaffolded Projects

- `src/TrafficSignScanner.Core` — preprocessing, detection, overlay, analysis pipeline
- `src/TrafficSignScanner.App` — MVVM UI wired to Core
- `src/TrafficSignScanner.Mcp`
- `tests/TrafficSignScanner.Core.Tests`
- `tests/TrafficSignScanner.App.Tests`
- `evals/TrafficSignScanner.Evals`

## Next Slice

`mcp-server` — MCP tools wrapping Core (FR-MCP-01, FR-MCP-02).
