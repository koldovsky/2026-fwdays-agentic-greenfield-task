# Proposal: mcp-server

## Why

Cursor needs a stdio MCP surface to verify Core detection without launching the MAUI app.

## What Changes

- Implement `detect_objects(imagePath)` and `get_model_info()` MCP tools wrapping Core only.
- Add path validation before file read or inference.
- Register server in `.cursor/mcp.json` and document usage in README.
- Add integration/smoke tests with `@trace FR-MCP-*`.

## Capabilities

- **Modified**: `mcp-verification` — tool implementations for FR-MCP-01 and FR-MCP-02.

## Impact

- `src/TrafficSignScanner.Mcp/`
- `tests/TrafficSignScanner.Mcp.Tests/`
- `.cursor/mcp.json`, README MCP section

## Non-Goals

- MAUI integration
- Eval ratchet lock (`evals-hardening`)
