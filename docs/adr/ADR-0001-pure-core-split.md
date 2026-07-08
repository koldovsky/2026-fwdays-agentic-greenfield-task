# ADR-0001: Pure Core Split

## Status

Accepted

## Context

The app must run on .NET MAUI, but most detector behavior is regular image and tensor logic. Emulator-driven UI tests are slow and fragile for this course project.

## Decision

Create `TrafficSignScanner.Core` as a pure .NET library for preprocessing, tensor creation, model execution contracts, output parsing, thresholding, and overlay geometry. The MAUI app and MCP server must call Core instead of duplicating detector logic.

## Consequences

- Core can be tested with deterministic xUnit tests.
- The MAUI app stays focused on permissions, capture/pick UX, binding, and display.
- The MCP server becomes a thin verification surface over the same detector pipeline.
- Platform-specific APIs must be isolated outside Core.
