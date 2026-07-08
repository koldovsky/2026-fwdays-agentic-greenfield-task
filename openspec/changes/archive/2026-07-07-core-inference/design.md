# Design: core-inference

## Context

Custom Vision compact ONNX exports `detected_boxes` (`float32[1,N,4]`), `detected_classes` (`int64[1,N]`), and `detected_scores` (`float32[1,N]`). Input is `image_tensor` NCHW raw RGB `0..255`.

## Approach

- `ModelAssetCopier` — copy bundled model to a physical path (Core file IO only; MAUI supplies paths).
- `LazyInferenceSessionHolder` — thread-safe lazy `InferenceSession` reuse (`@trace FR-DETECT-01`).
- `DetectionOutputParser` — parse LTRB-normalized boxes, Int64 classes, float scores (`@trace FR-DETECT-02`).
- `LabelMapper` — zero-based mapping with one-based fallback and clamping (`@trace FR-DETECT-03`).
- `TrafficSignDetector` — orchestrates preprocessing + inference + parsing (`IDetector`).

## Decisions

- Box coordinates are normalized xmin/ymin/xmax/ymax converted to left/top/width/height for downstream overlay slice.
- Default threshold `0.5` per model contract.
- Eval generates `expected.json` from folder names when absent; ratchet baseline remains deferred to G5.
