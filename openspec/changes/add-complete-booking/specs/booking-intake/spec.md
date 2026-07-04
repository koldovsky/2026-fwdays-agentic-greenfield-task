# booking-intake Delta

## MODIFIED Requirements

### Requirement: Confirm parsed interpretation (FR-INPUT-06)

The confirm step SHALL display structured parsed intent (date, time window, court/site, slot duration) and validation status before submission.

#### Scenario: Valid tennis request

- **WHEN** user reaches confirm with a parseable tennis request
- **THEN** parsed fields are shown (not placeholder) and Submit to MHOA is enabled when validation passes

### Requirement: Disabled submit removed

The confirm step SHALL NOT show a permanently disabled submit button when validation passes for tennis.

#### Scenario: Submit enabled

- **WHEN** validation passes for tennis
- **THEN** Submit to MHOA button is enabled
