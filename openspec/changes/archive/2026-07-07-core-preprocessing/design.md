# Design: core-preprocessing

## Context

Custom Vision compact ONNX expects `image_tensor` as `float32[1,3,320,320]` NCHW with raw RGB `0..255`. Core must stay UI-free and deterministic.

## Approach

- `CenterCropCalculator` — pure crop-rect math for landscape/portrait inputs (`@trace FR-PREPROC-01`).
- `ImagePreprocessor` — SkiaSharp decode, center-crop, resize to `320x320`, tensor creation (`@trace FR-PREPROC-01..03`).
- Use `Microsoft.ML.OnnxRuntime.Tensors.DenseTensor<float>` for model input.
- Keep preprocessing synchronous; callers run off UI thread in later slices.

## Decisions

- SkiaSharp for decode/crop/resize to match model-contract guidance and stay cross-platform in Core.
- Separate crop math from bitmap operations so unit tests can validate geometry without image IO.
- No external normalization; write raw channel bytes as floats.

## Risks

- EXIF orientation: decode via Skia codec path that respects encoded orientation before crop.
