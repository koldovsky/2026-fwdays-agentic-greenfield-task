# Proposal: app-ui

## Why

The MAUI shell must let users capture or pick photos, run detection off the UI thread with lazy model warm-up, and display Core-rendered annotated previews without duplicating overlay geometry in the app layer.

## What Changes

- Wire MAUI MVVM main page with capture (FR-CAPTURE-01) and pick (FR-PICK-01) flows.
- Add lazy detector initialization (NFR-STARTUP-01) and off-UI-thread analysis (NFR-PERF-01).
- Display annotated preview PNG bytes from Core only (FR-OVERLAY-02); no bounding-box math in App.
- Add Core `ImageAnalysisPipeline` orchestrating detect + overlay render.
- Add unit tests with `@trace` tags where feasible.

## Capabilities

- **Modified**: `image-input` — MAUI capture/pick implementation.
- **Modified**: `overlay` — app display-only annotated preview (FR-OVERLAY-02).

## Impact

- `src/TrafficSignScanner.Core/Analysis/`
- `src/TrafficSignScanner.App/` (ViewModels, Services, MainPage, DI, permissions)
- `tests/TrafficSignScanner.Core.Tests/Analysis/`
- `tests/TrafficSignScanner.App.Tests/` (ViewModel tests where feasible)

## Non-Goals

- MCP server (`mcp-server` slice)
- Eval ratchet lock (`evals-hardening` / G5)
