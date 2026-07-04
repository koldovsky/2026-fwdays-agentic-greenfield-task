# Preprocessing Specification

## Purpose

Define deterministic image preprocessing before ONNX inference.

## Requirements

### Requirement: Center Crop Source Image
The detector SHALL crop the source image to the largest centered square before resizing. Refs: `FR-PREPROC-01`.

#### Scenario: Landscape image is center-cropped
- **GIVEN** a source image wider than it is tall
- **WHEN** preprocessing prepares the model input
- **THEN** the crop uses the full source height
- **AND** equal-width margins are removed from the left and right sides

#### Scenario: Portrait image is center-cropped
- **GIVEN** a source image taller than it is wide
- **WHEN** preprocessing prepares the model input
- **THEN** the crop uses the full source width
- **AND** equal-height margins are removed from the top and bottom

### Requirement: Resize To Model Input Size
The detector SHALL resize the cropped square image to exactly `320x320` pixels. Refs: `FR-PREPROC-02`.

#### Scenario: Cropped square is resized
- **GIVEN** a centered square crop of any supported size
- **WHEN** preprocessing resizes the crop
- **THEN** the resized image dimensions are `320x320`

### Requirement: Create Raw NCHW Tensor
The detector SHALL create an `image_tensor` input in `float32[1,3,320,320]` NCHW layout using raw RGB `0..255` values. Refs: `FR-PREPROC-03`, `TC-MODEL-01`.

#### Scenario: Tensor shape and channels match model contract
- **GIVEN** a resized RGB image
- **WHEN** preprocessing creates the tensor
- **THEN** the tensor shape is `[1,3,320,320]`
- **AND** red, green, and blue values are assigned to channels 0, 1, and 2 respectively

#### Scenario: Pixel values are not normalized
- **GIVEN** a pixel with RGB values `255,128,0`
- **WHEN** preprocessing writes that pixel into the tensor
- **THEN** the tensor contains `255.0`, `128.0`, and `0.0`
- **AND** no channel value is divided by `255`
