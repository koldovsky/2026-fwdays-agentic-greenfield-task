## MODIFIED Requirements

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
