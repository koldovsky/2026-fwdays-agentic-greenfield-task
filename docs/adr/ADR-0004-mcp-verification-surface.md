# ADR-0004: MCP Verification Surface

## Status

Accepted

## Context

The course submission benefits from demonstrating that the detector can be exercised by Cursor directly, not only through a mobile UI. Browser or emulator automation is not the best fit for validating model behavior.

## Decision

Add a stdio MCP server in a later phase with tools that wrap Core:

- `detect_objects(imagePath)`
- `get_model_info()`

The MCP server will be registered in `.cursor/mcp.json` after it exists.

## Consequences

- Cursor can call the detector pipeline against local images during demos and verification.
- MCP behavior must remain a thin wrapper over Core to avoid duplicate logic.
- The app and MCP server share the same model contract, thresholds, labels, and preprocessing.
