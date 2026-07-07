# Proposal: core-preprocessing

## Why

Detection depends on deterministic image preprocessing that matches the Custom Vision ONNX contract. Without Core-owned crop/resize/tensor logic, later inference and UI slices cannot be tested reliably.

## What Changes

- Add Core preprocessing utilities for center-crop, resize to `320x320`, and NCHW raw RGB tensor creation.
- Add deterministic unit tests with `@trace FR-PREPROC-*` coverage.
- No MAUI, MCP, or inference behavior in this slice.

## Capabilities

- **Modified**: `preprocessing` — implementation-ready detail for crop math, resize output size, and tensor layout.

## Impact

- `src/TrafficSignScanner.Core`
- `tests/TrafficSignScanner.Core.Tests`
- `openspec/specs/preprocessing/spec.md` (via archive sync)

## Non-Goals

- ONNX inference session wiring
- Overlay geometry
- MAUI image pick/capture UI
