# Eval Verdict: mcp-server

**Verdict:** pass  
**Date:** 2026-07-08  
**Gate:** G4.5

## Evidence Summary

| Check | Result |
| --- | --- |
| Red tests before implementation | Confirmed — missing MCP services/tools |
| MCP tests | 9 passed (path validator, service, tool smoke) |
| Core unit tests | 30 passed (unchanged) |
| Eval harness | 5 passed (unchanged) |
| Format / build / OpenSpec strict | Pass |
| Check scripts | Pass |
| Smoke tool invoke | Pass (`TrafficSignScannerToolsTests` on `evals/dataset/stop-sign/stop-sign-01.jpg`) |

## Trajectory

1. OpenSpec change `mcp-server` created with Core-only tool scope.
2. Red tests for path validation, detection service, and MCP tool JSON output.
3. Implemented stdio MCP server with `detect_objects` and `get_model_info`.
4. Registered server in `.cursor/mcp.json`; documented usage in README.
5. Checker passes completed; change archived.

## Checker Findings

- **Code review:** Core-only inference; explicit tool registration; path gate before file read/inference.
- **Spec compliance:** FR-MCP-01 and FR-MCP-02 scenarios covered.
- **Security:** Pass — extension allowlist, size cap, fixed model path, offline ONNX, no secrets.

## Residual Risks

1. **Low:** `imagePath` is not restricted to repo root (intentional for local verification); optional symlink/UNC hardening deferred.
2. **Low:** Non-validation exceptions may surface generic MCP errors on corrupt images.

## Required Follow-up

- Next slice: `evals-hardening` (G5 ratchet lock).
