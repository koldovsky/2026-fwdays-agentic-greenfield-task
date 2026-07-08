# Proposal: core-inference

## Why

Preprocessing alone cannot deliver detections. Core needs a reusable ONNX session, output parsing, thresholding, and label mapping aligned with `docs/model-contract.md`.

## What Changes

- Add `IDetector`, ONNX session wrapper with lazy init, output parser, label mapper, and model asset copy helper.
- Add deterministic unit tests with `@trace FR-DETECT-*`.
- Add provisional output eval runner against `evals/dataset/` (no ratchet lock).

## Capabilities

- **Modified**: `detection` — implementation detail for Int64 classes, session reuse, and model path preparation.

## Impact

- `src/TrafficSignScanner.Core`
- `tests/TrafficSignScanner.Core.Tests`
- `evals/TrafficSignScanner.Evals`
- `evals/dataset/expected.json` (generated if missing)

## Non-Goals

- Overlay coordinate conversion (`core-overlay`)
- MAUI UI wiring (`app-ui`)
- Eval baseline ratchet lock (`evals-hardening` / G5)
