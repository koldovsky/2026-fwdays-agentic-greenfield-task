## ADDED Requirements

### Requirement: Prepare Physical Model Path
The detector pipeline SHALL support copying a bundled ONNX model to a physical file path before session creation. Refs: `FR-DETECT-01`.

#### Scenario: Model file is copied when destination is missing
- **GIVEN** a bundled model exists at a source path
- **AND** the destination app-data path does not exist
- **WHEN** model preparation runs
- **THEN** the model is copied to the destination path
- **AND** ONNX Runtime can open that physical file
