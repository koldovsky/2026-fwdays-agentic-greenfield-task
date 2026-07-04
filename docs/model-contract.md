# Model Contract

This document is the source of truth for integrating the bundled Azure Custom Vision compact ONNX object-detection model.

## Assets

| Asset | Location | Purpose |
| --- | --- | --- |
| `model.onnx` | `src/TrafficSignScanner.App/Resources/Raw/model.onnx` | Bundled neural network. |
| `labels.txt` | `src/TrafficSignScanner.App/Resources/Raw/labels.txt` | Class labels, one per line. |

MAUI raw assets are packaged inside the app. ONNX Runtime requires a physical file path, so the app must copy `model.onnx` to `FileSystem.AppDataDirectory` before creating `InferenceSession`.

## Model Family

- Source: Azure Custom Vision.
- Project type: Object Detection.
- Domain: General (Compact).
- Export: ONNX.
- Intended execution: local ONNX Runtime, no cloud prediction endpoint.

Only Custom Vision compact domains support ONNX export for local execution.

## Input Tensor

| Property | Value |
| --- | --- |
| Input name | `image_tensor` |
| Element type | `float32` |
| Shape | `[1,3,320,320]` |
| Layout | NCHW: batch, channel, height, width |
| Channels | RGB |
| Pixel range | Raw `0..255` float values |

Critical rule: do not normalize externally. Do not divide by `255`. Custom Vision compact models subtract `127.5` internally; external normalization makes the image effectively near-black and can produce zero detections.

Expected tensor assignment:

```csharp
tensor[0, 0, y, x] = pixel.Red;
tensor[0, 1, y, x] = pixel.Green;
tensor[0, 2, y, x] = pixel.Blue;
```

## Image Preprocessing

1. Decode the image with orientation handled.
2. Crop the largest centered square from the source image.
3. Resize the square to `320x320`.
4. Create the NCHW tensor with raw RGB values.

Do not stretch a non-square image directly to `320x320`; that distorts signs and can make detection orientation-dependent.

Because the centered square is the analyzed area, eval and demo images should keep the target sign near the frame center.

## Outputs

| Output name | Meaning |
| --- | --- |
| `detected_boxes` | Bounding boxes for candidate detections. |
| `detected_classes` | Class IDs for candidate detections. |
| `detected_scores` | Confidence scores for candidate detections. |

Each parsed detection contains a bounding box, a class label, and a confidence score.

## Labels

Class IDs are zero-based for this exported model:

| Class ID | Label |
| --- | --- |
| `0` | `no-entry` |
| `1` | `parking-prohibited` |
| `2` | `stop-sign` |

Some Custom Vision exports can be one-based; this model is not. If a future model produces label shifts or raw class numbers in the UI, verify the class-index mapping before changing preprocessing.

## Confidence Threshold

Default acceptance threshold: `0.5`.

- Keep detections with score `>= 0.5`.
- Ignore detections below threshold to reduce false positives.

The threshold may become configurable later, but tests and evals must document the chosen value.

## Known Failure Modes

- `float32[1,320,320,3]` NHWC tensor instead of required NCHW.
- Input name other than `image_tensor`.
- External normalization to `0..1`.
- Creating a new `InferenceSession` for every prediction.
- Loading the ONNX model directly from packaged raw assets instead of copying to app data first.
- Training data gaps, especially too few negatives or too many visually similar red signs in one class.

## Training Data Notes

The model originally performed poorly when trained only on stop signs because it classified other red road signs as stop signs. Adding `no-entry` and `parking-prohibited` classes improved discrimination without changing inference code.

Model quality should be improved by adding diverse, tagged training images and retraining, not by guessing different preprocessing rules.
