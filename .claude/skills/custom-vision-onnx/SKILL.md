---
name: custom-vision-onnx
description: Integrate Azure Custom Vision compact ONNX object-detection exports in .NET MAUI. Use when working with model.onnx, labels.txt, ONNX Runtime, Netron inspection, tensor preprocessing, class-id mapping, or MAUI raw asset loading for local inference.
---

# Custom Vision ONNX

## Source Documents

- Read `docs/model-contract.md` before changing model integration code.
- Use `docs/maui-integration.md` and `docs/training-model.md` for background and troubleshooting.

## Workflow

1. Inspect the ONNX model with Netron before coding against names or shapes.
2. Verify the input name, input shape, output names, and label indexing.
3. Write preprocessing tests before implementation.
4. Preserve the exact tensor contract from `docs/model-contract.md`.
5. Run local inference through ONNX Runtime; do not call cloud prediction APIs.

## Required Contract For This Project

- Input name: `image_tensor`.
- Input shape: `float32[1,3,320,320]`.
- Layout: NCHW, not NHWC.
- Pixel values: raw RGB `0..255` floats.
- No external normalization; do not divide by `255`.
- Outputs: `detected_boxes`, `detected_classes`, `detected_scores`.
- Labels are zero-based for this model:
  - `0` -> `no-entry`
  - `1` -> `parking-prohibited`
  - `2` -> `stop-sign`
- Default confidence threshold: `0.5`.

## Preprocessing Pattern

Use this order:

1. Decode image and handle orientation.
2. Crop to the largest centered square.
3. Resize to `320x320`.
4. Fill tensor as NCHW raw RGB:

```csharp
tensor[0, 0, y, x] = pixel.Red;
tensor[0, 1, y, x] = pixel.Green;
tensor[0, 2, y, x] = pixel.Blue;
```

Do not stretch non-square photos directly to `320x320`.

## MAUI Asset Loading

MAUI raw assets are packaged in the app and are not reliable physical file paths for ONNX Runtime.

Use this pattern:

1. Bundle `model.onnx` and `labels.txt` under `Resources/Raw/`.
2. Copy `model.onnx` to `FileSystem.AppDataDirectory` if missing or stale.
3. Create one reusable `InferenceSession` from that app-data path.
4. Load labels once and cache them.

Avoid creating a new `InferenceSession` per image.

## Common Failure Checks

- Zero detections for obvious signs: check for accidental `0..1` normalization first.
- Wrong labels: verify zero-based versus one-based class IDs before changing labels.
- Bad boxes: confirm crop/resize math and model-space to display-space conversion.
- Model not found: confirm the raw asset was copied to app data before session creation.
- False positives on red signs: improve training data and negatives before changing preprocessing.
