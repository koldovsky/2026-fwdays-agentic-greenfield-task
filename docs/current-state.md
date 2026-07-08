# Current State

## Gate

Current gate: **G5 green** — `evals-hardening` slice closed (2026-07-08).

MVP capability plan complete. All six implementation slices delivered with locked eval and coverage ratchets.

Phase 5 proof pack ready in `qa/` for homework submission review (G6 pending: video + PR).

## Locked Eval Metrics

| Metric | Value |
| --- | --- |
| Output eval pass rate | **90.0% (36/40)** |
| Confidence threshold | 0.5 |
| Baseline file | `evals/baselines/output-eval.json` |

## Locked Coverage Metrics

| Metric | Value |
| --- | --- |
| Core line rate | **76.2% (346/454 lines)** |
| Baseline file | `evals/baselines/coverage.json` |

## Completed Slices

### core-preprocessing (G4.1)

- Center-crop, resize `320x320`, NCHW raw RGB tensor, EXIF orientation.
- Verdict: `qa/verdicts/core-preprocessing.md` (pass-with-risks).

### core-inference (G4.2)

- `IDetector`, ONNX session, parsing, thresholding, label mapping, provisional eval.
- Verdict: `qa/verdicts/core-inference.md` (pass-with-risks).

### core-overlay (G4.3)

- Model→source→display coordinate conversion; SkiaSharp annotated bitmap rendering (boxes + labels).
- Verdict: `qa/verdicts/core-overlay.md` (pass).

### app-ui (G4.4)

- MAUI MVVM capture/pick, lazy detector warm-up, off-UI-thread analysis, Core PNG preview binding only.
- Verdict: `qa/verdicts/app-ui.md` (pass).

### mcp-server (G4.5)

- Stdio MCP tools `detect_objects` / `get_model_info` wrapping Core with path validation.
- Verdict: `qa/verdicts/mcp-server.md` (pass).

### evals-hardening (G5)

- Finalized `expected.json` (40 cases), hardened output eval runner, locked eval/coverage ratchets, G5 gate report.
- EXIF golden JPEG fixture for preprocessing integration test.
- Verdict: `qa/verdicts/evals-hardening.md` (pass).

## Scaffolded Projects

- `src/TrafficSignScanner.Core` — preprocessing, detection, overlay, analysis pipeline
- `src/TrafficSignScanner.App` — MVVM UI wired to Core
- `src/TrafficSignScanner.Mcp` — stdio MCP server
- `tests/TrafficSignScanner.Core.Tests`
- `tests/TrafficSignScanner.App.Tests`
- `tests/TrafficSignScanner.Mcp.Tests`
- `evals/TrafficSignScanner.Evals`

## Next Slice

None — MVP plan complete at G5.

## Phase 5 (G6 — submission)

- Proof pack: `qa/README.md` (gate report, traceability matrix, eval report, verdicts, submission checklist)
- README rewritten with product + harness map
- **Pending:** record demo video, open homework PR (see `qa/submission-checklist.md`)
