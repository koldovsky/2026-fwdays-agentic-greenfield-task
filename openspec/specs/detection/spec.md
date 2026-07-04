# Detection Specification

## Purpose

Define local ONNX inference and detection parsing behavior.

## Requirements

### Requirement: Run Local ONNX Model
The detector SHALL run the bundled Custom Vision compact ONNX model locally through ONNX Runtime. Refs: `FR-DETECT-01`, `BC-OFFLINE-01`.

#### Scenario: Detection runs offline
- **GIVEN** the bundled model has been copied to a physical app data path
- **WHEN** detection runs for a prepared tensor
- **THEN** ONNX Runtime executes the local `model.onnx`
- **AND** no network call is required

#### Scenario: Session is reused
- **GIVEN** a detector has already initialized an ONNX session
- **WHEN** another image is detected
- **THEN** the existing session is reused instead of creating a new session per prediction

### Requirement: Parse Model Outputs
The detector SHALL parse `detected_boxes`, `detected_classes`, and `detected_scores` outputs into typed detections. Refs: `FR-DETECT-02`.

#### Scenario: Output tensors become detections
- **GIVEN** model outputs contain matching box, class, and score entries
- **WHEN** parsing runs
- **THEN** each accepted result contains a bounding box, class ID, label, and confidence score

### Requirement: Map Labels And Threshold Scores
The detector SHALL map zero-based class IDs to `labels.txt` values and ignore detections below the configured confidence threshold. Refs: `FR-DETECT-03`, `TC-MODEL-01`.

#### Scenario: Zero-based class ID maps to label
- **GIVEN** `labels.txt` contains `no-entry`, `parking-prohibited`, and `stop-sign`
- **WHEN** the model returns class ID `2`
- **THEN** the parsed label is `stop-sign`

#### Scenario: Low confidence detection is ignored
- **GIVEN** the confidence threshold is `0.5`
- **WHEN** a model score is below `0.5`
- **THEN** that candidate is excluded from accepted detections
