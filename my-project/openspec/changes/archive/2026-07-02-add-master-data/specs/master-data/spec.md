## ADDED Requirements

### Requirement: Verified master-data mutations

ForgeFlow SHALL create validated suppliers and permit only valid material reorder/status settings through immutable domain operations (FR-14, FR-15, FR-16, FR-17).

#### Scenario: Valid and invalid settings

- **WHEN** tests add a supplier, submit an invalid rating, update a material, or reference an unknown material
- **THEN** valid changes affect only a clone and invalid changes return specific Ukrainian errors
