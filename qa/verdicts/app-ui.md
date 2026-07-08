# Eval Verdict: app-ui

**Verdict:** pass  
**Date:** 2026-07-08  
**Gate:** G4.4

## Evidence Summary

| Check | Result |
| --- | --- |
| Red tests before implementation | Confirmed — missing `TrafficSignScanner.Core.Analysis` and App ViewModel wiring |
| Core unit tests | 30 passed (4 new analysis tests) |
| App ViewModel tests | 4 passed |
| Eval harness | 5 passed (unchanged) |
| Format / build / OpenSpec strict | Pass |
| MAUI Windows compile | Pass (`net10.0-windows10.0.19041.0`) |
| Check scripts | Pass |

## Trajectory

1. OpenSpec change `app-ui` created with MAUI MVVM scope and FR-OVERLAY-02 display-only boundary.
2. Red tests for `DetectionStatusFormatter`, `ImageAnalysisPipeline`, and `MainViewModel` command flows.
3. Implemented Core `ImageAnalysisPipeline` orchestrator and App services/ViewModel/UI with lazy detector warm-up and off-UI-thread analysis.
4. Checker passes completed; change archived.

## Checker Findings

- **Code review:** MVVM-first; overlay geometry stays in Core; App binds PNG bytes only via converter; DI wired in `MauiProgram`.
- **Spec compliance:** FR-CAPTURE-01, FR-PICK-01, FR-OVERLAY-02, NFR-STARTUP-01, NFR-PERF-01 scenarios covered.
- **Security:** Pass — offline contract preserved (Android network permissions removed); camera/photo usage descriptions added; no secrets or network calls in client.

## Residual Risks

1. **Low:** Preview uses source image dimensions (display width/height passed as 0); AspectFit layout may differ slightly from Core display scaling until explicit preview dimensions are plumbed.
2. **Low:** MVVMTK0045 WinRT partial-property warnings — informational only for current Windows unpackaged target.

## Required Follow-up

- Next slice: `mcp-server` (FR-MCP-01, FR-MCP-02).
