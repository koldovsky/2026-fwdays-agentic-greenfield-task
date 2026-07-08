# Overlay Specification

## Purpose

Define how accepted detections are converted and displayed on the image preview.
## Requirements
### Requirement: Convert Bounding Boxes To Display Coordinates
The Core overlay pipeline SHALL convert model-space bounding boxes back to displayed image coordinates and render annotated preview bitmaps with boxes and labels. Refs: `FR-OVERLAY-01`.

#### Scenario: Detection box maps onto preview
- **GIVEN** an accepted detection box in model-space coordinates
- **AND** the app knows the source crop and displayed preview size
- **WHEN** overlay geometry is calculated
- **THEN** the resulting rectangle aligns with the displayed sign region

#### Scenario: Core renders annotated bitmap
- **GIVEN** accepted detections and a source image
- **WHEN** Core overlay rendering runs for a display size
- **THEN** the output bitmap includes bounding boxes and label/confidence text at display coordinates

### Requirement: Render Annotated Preview
The app SHALL render accepted detections with label and confidence on an annotated preview. Refs: `FR-OVERLAY-02`.

#### Scenario: Accepted detection is displayed
- **GIVEN** detection returned a `stop-sign` result with confidence `0.92`
- **WHEN** the app presents the analyzed image
- **THEN** the preview includes a bounding box
- **AND** the result label and confidence are visible to the user

#### Scenario: No detections are displayed cleanly
- **GIVEN** detection returns no accepted results
- **WHEN** the app presents the analyzed image
- **THEN** the preview remains visible
- **AND** the app communicates that no supported sign was detected

