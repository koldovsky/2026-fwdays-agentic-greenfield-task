# Design: core-overlay

## Coordinate Pipeline

1. Model box: normalized L/T/W/H relative to `320x320` input (equals centered crop content).
2. Source box: offset by `CropRectangle` and scale by crop `Size`.
3. Display box: scale source pixels to preview width/height using independent axis ratios.

## Rendering

- `AnnotatedImageRenderer` scales the source image to the display size, then draws stroke rectangles and label text at display coordinates.
- SkiaSharp only; no MAUI references.

## Traceability

- Public overlay APIs carry `@trace FR-OVERLAY-01`.
