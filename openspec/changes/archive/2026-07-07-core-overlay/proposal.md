# Proposal: core-overlay

## Why

Detections are returned in model-normalized coordinates. The UI and MCP consumers need Core-owned geometry conversion and annotated image output without duplicating crop/box math in MAUI.

## What Changes

- Add Core overlay coordinate conversion from model space through crop to display space.
- Add SkiaSharp annotated bitmap rendering (boxes + labels) in Core.
- Add deterministic unit tests with `@trace FR-OVERLAY-01`.

## Capabilities

- **Modified**: `overlay` — Core owns geometry conversion and drawing; app-ui display-only for FR-OVERLAY-02.

## Impact

- `src/TrafficSignScanner.Core/Overlay/`
- `tests/TrafficSignScanner.Core.Tests/Overlay/`

## Non-Goals

- MAUI MVVM preview binding (FR-OVERLAY-02, `app-ui` slice)
- MCP tool wiring (`mcp-server` slice)
