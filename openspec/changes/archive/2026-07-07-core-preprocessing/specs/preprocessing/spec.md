## ADDED Requirements

### Requirement: Expose Preprocessing Metadata
The Core preprocessing pipeline SHALL expose crop rectangle and output dimensions needed by later overlay and inference slices. Refs: `FR-PREPROC-01`, `FR-PREPROC-02`.

#### Scenario: Preprocessing result includes crop metadata
- **GIVEN** a non-square source image
- **WHEN** Core preprocessing prepares model input
- **THEN** the result includes the centered crop rectangle in source coordinates
- **AND** the resized output dimensions are `320x320`
