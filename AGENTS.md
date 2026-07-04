# Traffic Sign Scanner Agent Contract

This repository is an agentic rebuild of an offline .NET MAUI traffic-sign detector using an Azure Custom Vision compact ONNX model.

## Stack

- C# with nullable enabled and async/await.
- .NET 10 MAUI app shell at `src/TrafficSignScanner.App`.
- Planned pure libraries: `TrafficSignScanner.Core`, `TrafficSignScanner.Mcp`, and xUnit test/eval projects.
- ONNX Runtime for inference, SkiaSharp for deterministic image preprocessing, CommunityToolkit.Mvvm for app UI.
- OpenSpec is the source of truth for capability specs after `docs/requirements.md`.

## Hard Architecture Boundaries

- `TrafficSignScanner.Core` MUST NOT reference MAUI, `Microsoft.Maui.*`, UI controls, platform APIs, or file pickers.
- Core owns preprocessing, tensor creation, output parsing, thresholding, and overlay coordinate math.
- The MAUI app owns capture/pick UI, permissions, navigation, view models, and rendering annotated previews.
- The MCP server only wraps Core behavior; it must not duplicate inference or preprocessing logic.
- Tests and evals verify Core behavior without launching a MAUI UI.
- Keep model assets under `src/TrafficSignScanner.App/Resources/Raw/`.

## Model Contract

- NEVER invent ONNX input or output names. Read `docs/model-contract.md`.
- Input is `image_tensor`, `float32[1,3,320,320]`, NCHW.
- Pixel values are raw RGB `0..255`; DO NOT divide by 255 and DO NOT normalize externally.
- Outputs are `detected_boxes`, `detected_classes`, and `detected_scores`.
- Labels are zero-based: `0=no-entry`, `1=parking-prohibited`, `2=stop-sign`.
- Crop to the largest centered square before resizing to `320x320`.
- ONNX Runtime needs a physical model path; MAUI raw assets must be copied to `FileSystem.AppDataDirectory` before `InferenceSession`.

## Traceability

- Public Core logic and test coverage must carry `@trace FR-*` doc comments once implementation begins.
- Specs must cite the relevant `FR-*`, `NFR-*`, `TC-*`, or `BC-*` IDs.
- Commits touching `src`, `tests`, `evals`, `openspec`, or gate scripts must include a `Refs: FR-*` or `Slice: <name>` trailer.

## Slice Loop

1. Read `docs/current-state.md`.
2. Pick the next approved slice from the capability plan when it exists.
3. Write or update OpenSpec specs before implementation.
4. Add failing tests first and confirm they fail for the right reason.
5. Implement the smallest code change that makes the tests pass.
6. Run gates: format, build, tests, evals, OpenSpec strict validation, and check scripts when present.
7. Use a checker that did not write the change for adversarial review.
8. Archive/update state only after gates and review are green.

## Negative Rules

- NEVER weaken, delete, or skip a failing test to make a slice pass.
- NEVER commit without green gates, unless the commit is explicitly marked as unfinished and the user requested it.
- NEVER touch `evals/baselines/` except through an approved ratchet update.
- NEVER replace or regenerate `src/TrafficSignScanner.App/Resources/Raw/model.onnx` without explicit user approval.
- NEVER add network calls for inference; the product is offline by contract.
- Ask the user when requirements conflict or a source artifact is missing.

## Review Expectations

- Prefer small, spec-linked changes over broad rewrites.
- Preserve MAUI UI-thread correctness; long-running inference must run off the UI thread.
- Prefer deterministic Core tests over emulator automation.
- Use current MAUI guidance from the copied MAUI skills and Context7 when APIs are uncertain.
