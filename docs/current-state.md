# Current State

## Gate

Current gate: **G4.1 green** — `core-preprocessing` slice closed (2026-07-07).

G3 capability plan approved with amendments (cross-cutting constraints, overlay ownership, provisional eval at `core-inference`).

## Completed Slices

### core-preprocessing (G4.1)

- Core center-crop math, SkiaSharp resize to `320x320`, NCHW raw RGB tensor creation.
- EXIF orientation normalization on encoded-byte decode.
- 12 Core unit tests with `@trace FR-PREPROC-*`.
- OpenSpec change archived: `openspec/changes/archive/2026-07-07-core-preprocessing/`.
- Verdict: `qa/verdicts/core-preprocessing.md` (pass-with-risks).

## Completed Context

- Static agent contract: `AGENTS.md`.
- G0 harness green (solution, CI, hooks, check scripts, OpenSpec specs).
- G1 requirements review passed on 2026-07-03.
- G3 capability plan at `docs/mvp-capability-plan.md` (amended).
- MAUI app at `src/TrafficSignScanner.App` with bundled `model.onnx` and `labels.txt`.

## Scaffolded Projects

- `src/TrafficSignScanner.Core` — preprocessing implemented
- `src/TrafficSignScanner.App`
- `src/TrafficSignScanner.Mcp`
- `tests/TrafficSignScanner.Core.Tests`
- `evals/TrafficSignScanner.Evals`

## Next Slice

`core-inference` — ONNX session wrapper, output parsing, thresholding, label mapping; run provisional eval at slice end (ratchet still locks at G5).
