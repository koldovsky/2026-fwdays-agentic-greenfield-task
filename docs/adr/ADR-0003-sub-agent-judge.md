# ADR-0003: Sub-Agent Judge For Trajectory Review

## Status

Accepted

## Context

The project needs evidence that agents followed the intended loop: spec first, red tests before implementation, no weakened assertions, gates green, and maker/checker separation. A separate API-key eval harness would add setup cost and distract from the mobile/ONNX scope.

## Decision

Use deterministic gates for machine-checkable signals and a fresh checker sub-agent for judgment-heavy trajectory review. The judge writes a verdict for each slice under `qa/verdicts/` once that folder exists.

## Consequences

- The maker must preserve enough artifacts for a checker to review intent, diffs, test order, and scope control.
- Gate scripts can require a fresh verdict per slice later.
- The review remains local to the repository and does not require external eval credentials.
