## MODIFIED Requirements

### Requirement: Detect Objects Tool
The MCP server SHALL expose `detect_objects(imagePath)` using the same Core detector pipeline as the app. Refs: `FR-MCP-01`.

#### Scenario: Valid image path returns detections
- **GIVEN** a readable image path
- **WHEN** Cursor calls `detect_objects(imagePath)`
- **THEN** the MCP server runs Core detection
- **AND** returns accepted detections with label, confidence, and bounding box data

#### Scenario: Invalid image path returns an error
- **GIVEN** an unreadable or missing image path
- **WHEN** Cursor calls `detect_objects(imagePath)`
- **THEN** the MCP server returns a structured error
- **AND** no model inference is attempted

### Requirement: Model Info Tool
The MCP server SHALL expose `get_model_info()` with input, output, label, and threshold metadata. Refs: `FR-MCP-02`.

#### Scenario: Model metadata is returned
- **GIVEN** the MCP server is running
- **WHEN** Cursor calls `get_model_info()`
- **THEN** the response includes `image_tensor`, `[1,3,320,320]`, output names, labels, and the configured confidence threshold
