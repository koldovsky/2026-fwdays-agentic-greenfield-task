# Image Input Specification

## Purpose

Define how users provide images to the detector from the MAUI app.

## Requirements

### Requirement: Capture Photo
The app SHALL let the user capture a photo from the device camera when platform permissions allow it. Refs: `FR-CAPTURE-01`.

#### Scenario: Camera capture succeeds
- **GIVEN** camera capture is available and permission is granted
- **WHEN** the user requests camera capture
- **THEN** the app receives an image file for detection
- **AND** the UI remains responsive while later detection work runs

#### Scenario: Camera capture unavailable or denied
- **GIVEN** camera capture is unavailable or permission is denied
- **WHEN** the user requests camera capture
- **THEN** the app reports the blocked action without starting detection

### Requirement: Pick Local Image
The app SHALL let the user select an existing local image from device storage. Refs: `FR-PICK-01`.

#### Scenario: Local image pick succeeds
- **GIVEN** image picking is available
- **WHEN** the user selects a supported image
- **THEN** the app receives an image file for detection

#### Scenario: User cancels image pick
- **GIVEN** the image picker is open
- **WHEN** the user cancels the picker
- **THEN** the app preserves the current result state
- **AND** no detection is started
