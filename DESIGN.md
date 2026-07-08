# Design

## Context

Traffic Sign Scanner is intentionally small: a .NET MAUI app that runs a bundled Custom Vision ONNX model locally against captured or selected photos. The repository is also a course artifact, so the design must make agent work reviewable through specs, tests, evals, and traceability.

## Architecture

Planned solution boundaries:

```text
src/TrafficSignScanner.Core
  preprocessing, tensor creation, detector contracts, ONNX wrapper, parsing, overlay geometry

src/TrafficSignScanner.App
  current MAUI app head: capture/pick UI, permissions, view models, image preview

src/TrafficSignScanner.Mcp
  stdio MCP tools that wrap Core for desktop verification

tests/TrafficSignScanner.Core.Tests
  deterministic unit tests for Core behavior

evals/TrafficSignScanner.Evals
  real-model output evals against curated photos
```

The current MAUI template lives at `src/TrafficSignScanner.App`. Later implementation may add a pure Core project and MCP project, but it should not duplicate model behavior in the UI or MCP surfaces.

## Key Decisions

- Keep model behavior in a pure Core library so it is testable without MAUI, device APIs, or emulator automation.
- Use SkiaSharp for image decode/crop/resize because preprocessing must be deterministic and cross-platform.
- Use ONNX Runtime locally because privacy, latency, and offline operation are product requirements.
- Use OpenSpec scenarios as the executable bridge between PRD requirements and red tests.
- Use output evals for real photos and unit tests for deterministic math; do not rely on manual UI testing as the only signal.

## Why .NET Is AI-Friendly Here

- Strong types make detector inputs, outputs, labels, and coordinates machine-checkable.
- xUnit tests and file-based C# gate scripts can enforce behavior without a running mobile UI.
- MAUI isolates platform UX concerns while Core remains regular .NET code.
- XML project files and C# analyzers expose clear, automatable contracts for agents.

## Risks And Mitigations

- MAUI 10 API drift -> use `maui-current-apis` and Context7 before relying on uncertain APIs.
- Model preprocessing hallucination -> treat `docs/model-contract.md` as authoritative and test tensor shape/raw values.
- Weak model quality -> keep eval datasets with positives and negatives, and improve training data rather than changing inference guesses.
- UI freezes -> enforce off-UI-thread preprocessing and inference.
- Traceability gaps -> require stable IDs in PRD, OpenSpec, tests, code comments, and commit trailers.

## Verification Strategy

- Unit tests cover crop math, resize/tensor layout, raw pixel values, output parsing, class mapping, thresholds, and overlay conversion.
- Output evals run the real ONNX model against `evals/dataset/`.
- OpenSpec strict validation checks requirement/scenario structure.
- Gate scripts aggregate traceability, eval ratchets, coverage ratchets, and checker verdict freshness once Phase 3 creates them.
