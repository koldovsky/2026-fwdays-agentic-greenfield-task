# Manufacturing and BOM Specification

## Purpose

Preview and execute BOM-based inventory conversion without permitting invalid or partial runs. Covers FR-29 through FR-34.

## Requirements

### Requirement: BOM visibility

The page SHALL list finished goods with their active BOM version and components (FR-29).

#### Scenario: Product structure
- **GIVEN** a product linked to a BOM
- **WHEN** manufacturing is opened
- **THEN** its product, version, material identifiers, and per-unit factors are visible

### Requirement: Requirement preview

The system SHALL calculate each material requirement as target output multiplied by its BOM factor (FR-30).

#### Scenario: Decimal factors
- **GIVEN** a target of 10 and factors 1.5 and 0.25
- **WHEN** preview is requested
- **THEN** requirements are 15 and 2.5 in their respective units

### Requirement: Run validation

The system SHALL reject non-positive output, insufficient stock, and any required material not marked `unrestricted`, with material-specific messages (FR-31, FR-34).

#### Scenario: Unusable material
- **GIVEN** sufficient quantity held in quality inspection
- **WHEN** a run requires that material
- **THEN** the run is rejected and no inventory or movement changes

### Requirement: Atomic production conversion

A valid run SHALL atomically decrement every input, increment finished output, append input Production Consumption movements, and append one Work Order Completion movement (FR-32, FR-33).

#### Scenario: Successful run
- **GIVEN** all required materials are unrestricted and sufficient
- **WHEN** an authorized operator confirms a valid target
- **THEN** all balances and movements commit together with the acting user and BOM association

