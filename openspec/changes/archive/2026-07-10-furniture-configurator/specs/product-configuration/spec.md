## ADDED Requirements

### Requirement: Manager configures a product from parts
The system SHALL let a manager select, for a single product type (nightstand-like), a top size, a bottom size, a facade (color + material), a corpus material, and zero or more hardware items, using only values from the controlled dictionaries.

#### Scenario: Manager builds a full configuration
- **WHEN** a manager selects a top size, bottom size, facade color, facade material, corpus material, and hardware items from the available dictionaries
- **THEN** the system accepts the selection as a candidate configuration ready for validation

### Requirement: System validates part sizes before BOM generation
The system SHALL validate every sized part (top, bottom) against its part-size rule: a requested size SHALL be accepted if it matches a standard size, or if it is a custom size within the configured min/max range for that part role; otherwise the system SHALL reject it with an error identifying which part and why.

#### Scenario: Size matches a standard value
- **WHEN** a manager requests a top size of 60cm and 60cm is a standard size for the top part role
- **THEN** validation succeeds and the part is marked as standard-sized

#### Scenario: Custom size within allowed range
- **WHEN** a manager requests a top size of 45cm, 45cm is not a standard size, and the top part role allows custom sizes in range 30-80cm
- **THEN** validation succeeds and the part is marked as custom-sized

#### Scenario: Custom size outside allowed range
- **WHEN** a manager requests a top size of 25cm and the top part role's allowed custom range is 30-80cm
- **THEN** validation fails with an error stating the size is outside the allowed 30-80cm range

#### Scenario: Custom size requested where not allowed
- **WHEN** a manager requests a non-standard size for a part role where `allowsCustomSize` is false
- **THEN** validation fails with an error stating only standard sizes are allowed for that part role

### Requirement: BOM is generated only for valid configurations
The system SHALL generate a bill of materials (BOM) — a flat list of components with SKUs — only when every part in the configuration passes size validation. If any part fails validation, the system SHALL NOT generate a BOM and SHALL instead return the list of validation errors.

#### Scenario: Valid configuration produces a BOM
- **WHEN** a manager submits a configuration where all part sizes pass validation
- **THEN** the system returns a BOM listing each component (part role, dictionary reference, SKU)

#### Scenario: Invalid configuration blocks BOM generation
- **WHEN** a manager submits a configuration where at least one part fails size validation
- **THEN** the system returns the validation errors and does not produce a BOM
