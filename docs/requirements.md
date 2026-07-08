# Requirements

Statuses: `proposed`, `accepted`, `shipped`.

## Functional Requirements

| ID | Status | Requirement |
| --- | --- | --- |
| FR-CAPTURE-01 | proposed | The app SHALL let the user capture a photo from the device camera when platform permissions allow it. |
| FR-PICK-01 | proposed | The app SHALL let the user select an existing local image from device storage. |
| FR-PREPROC-01 | accepted | The detector SHALL crop the source image to the largest centered square before resizing. |
| FR-PREPROC-02 | accepted | The detector SHALL resize the cropped image to exactly `320x320` pixels before tensor creation. |
| FR-PREPROC-03 | accepted | The detector SHALL create an `image_tensor` input in `float32[1,3,320,320]` NCHW layout using raw RGB `0..255` values. |
| FR-DETECT-01 | accepted | The detector SHALL run the bundled Custom Vision compact ONNX model locally through ONNX Runtime. |
| FR-DETECT-02 | accepted | The detector SHALL parse `detected_boxes`, `detected_classes`, and `detected_scores` outputs into typed detections. |
| FR-DETECT-03 | accepted | The detector SHALL map zero-based class IDs to `labels.txt` values and ignore detections below the configured confidence threshold. |
| FR-OVERLAY-01 | proposed | The app SHALL convert model-space bounding boxes back to displayed image coordinates. |
| FR-OVERLAY-02 | proposed | The app SHALL render accepted detections with label and confidence on an annotated preview. |
| FR-MCP-01 | proposed | The MCP server SHALL expose `detect_objects(imagePath)` using the same Core detector pipeline as the app. |
| FR-MCP-02 | proposed | The MCP server SHALL expose `get_model_info()` with input, output, label, and threshold metadata. |

## Non-Functional Requirements

| ID | Status | Requirement |
| --- | --- | --- |
| NFR-PERF-01 | proposed | Inference and image preprocessing MUST run off the UI thread. |
| NFR-STARTUP-01 | proposed | Model initialization MUST be lazy so app startup is not blocked by ONNX session creation. |
| NFR-TEST-01 | proposed | Core preprocessing, parsing, thresholding, and geometry MUST be covered by deterministic unit tests. |
| NFR-EVAL-01 | proposed | Real-model output evals MUST run against `evals/dataset/` and compare pass rate against a ratcheted baseline. |

## Technical Constraints

| ID | Status | Requirement |
| --- | --- | --- |
| TC-STACK-01 | accepted | The app SHALL target .NET 10 MAUI with C# nullable enabled. |
| TC-ARCH-01 | proposed | `TrafficSignScanner.Core` MUST remain a pure class library with no MAUI or platform references. |
| TC-MODEL-01 | accepted | The model contract is an Azure Custom Vision compact ONNX object-detection export as documented in `docs/model-contract.md`. |
| TC-MODEL-02 | accepted | The model and labels SHALL be bundled as MAUI raw assets under `Resources/Raw/`. |
| TC-SPEC-01 | proposed | Capability behavior SHALL be specified in OpenSpec with GIVEN/WHEN/THEN scenarios citing these requirement IDs. |

## Business Constraints

| ID | Status | Requirement |
| --- | --- | --- |
| BC-OFFLINE-01 | accepted | Detection MUST work without network access and MUST NOT call cloud inference APIs. |
| BC-PRIVACY-01 | accepted | User-selected images MUST remain local to the device during detection. |
| BC-SCOPE-01 | accepted | Supported sign classes are limited to labels exported with the bundled model unless a later approved model update changes `labels.txt`. |

## Acceptance Notes

- `accepted` means the requirement is stable enough for specs and tests.
- `proposed` means the requirement is planned but still needs implementation-slice approval.
- `shipped` is reserved for behavior implemented, tested, evaluated, and included in a green gate report.
