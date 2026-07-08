## MODIFIED Requirements

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
