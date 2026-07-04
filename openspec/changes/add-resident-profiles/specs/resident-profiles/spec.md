# resident-profiles

Household member profiles for faster booking intake.

## ADDED Requirements

### Requirement: Predefined household members (FR-INPUT-01–03)

The system SHALL offer predefined Mahogany household profiles with full name, email, phone, and address.

#### Scenario: Max and Nataliia available

- **WHEN** user opens `/book`
- **THEN** profile picker shows Max, Nataliia, and Other

### Requirement: Profile pre-fills intake (FR-INPUT-07, FR-INPUT-01–03)

The system SHALL populate intake contact fields from the selected profile without manual entry.

#### Scenario: Select Nataliia

- **WHEN** user selects Nataliia
- **THEN** intake contains Nataliia Pokotylo, pokotylo.nataliia@gmail.com, 8257339616, 279 Marine DR SE

### Requirement: Hide contact form when profile selected

The system SHALL NOT display name, email, phone, or address inputs when a predefined profile is selected.

#### Scenario: Max selected

- **WHEN** Max is the active profile
- **THEN** contact input fields are not visible; booking request and attestation remain

### Requirement: Manual entry via Other

The system SHALL show full contact fields when **Other** is selected.

#### Scenario: Other selected

- **WHEN** user clicks Other
- **THEN** empty contact fields are shown for manual entry
