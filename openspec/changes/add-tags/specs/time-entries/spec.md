## MODIFIED Requirements

### Requirement: Continue a past entry

The system SHALL let a user "continue" a past entry: this SHALL start a new running entry
that copies the source entry's description **and its tags**, subject to the
single-running-entry invariant. The source entry SHALL be unchanged. (FR-ENTRY-08)

#### Scenario: Continue starts a fresh running entry

- **WHEN** a user continues a past entry
- **THEN** a new running entry is created with the same description as the source, and
  any previously running entry is stopped first
- **AND** the original entry is left unmodified

#### Scenario: Continue copies the source entry's tags

- **WHEN** a user continues a past entry that has one or more tags
- **THEN** the new running entry is assigned the same tags as the source
