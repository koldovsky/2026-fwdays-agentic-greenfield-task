## Purpose

Compares a validated product configuration against existing standard catalog entries by dictionary ID (not free text) to flag whether it's a known standard batch or a new individual combination, and lets a manager save a genuinely new combination as a standard catalog entry.

## Requirements

### Requirement: System matches a configuration against the standard catalog by dictionary ID
The system SHALL compare a valid configuration's dictionary references (product type, facade color ID, facade material ID, corpus material ID, part size IDs/values, and hardware item IDs) against existing standard `CatalogEntry` records using dictionary IDs, not display names or free text.

#### Scenario: Configuration matches an existing catalog entry
- **WHEN** a manager's valid configuration has the same product type, facade color ID, facade material ID, and sizes as an existing `CatalogEntry`
- **AND** the configuration has the same corpus material ID and the same set of hardware item IDs
- **THEN** the system marks the BOM as `isStandard: true` and includes a reference to the matching entry's SKU

#### Scenario: Configuration does not match any catalog entry
- **WHEN** a manager's valid configuration does not match any existing `CatalogEntry` on dictionary IDs
- **THEN** the system marks the BOM as `isStandard: false` (a new individual combination) without blocking BOM generation

### Requirement: Manager can save a new combination as a standard catalog entry
The system SHALL let a manager save a validated, non-matching configuration as a new standard `CatalogEntry`. The system SHALL NOT allow saving a configuration that already matches an existing catalog entry as a duplicate new entry.

#### Scenario: Saving a genuinely new combination
- **WHEN** a manager requests to save a valid configuration that does not match any existing catalog entry
- **THEN** the system creates a new `CatalogEntry` referencing the same dictionary IDs and assigns it a SKU

#### Scenario: Preventing duplicate catalog entries
- **WHEN** a manager requests to save a configuration that already matches an existing catalog entry
- **THEN** the system does not create a new entry and indicates the existing matching entry instead
