# booking-intake Delta

## MODIFIED Requirements

### Requirement: Contact fields conditional on profile (FR-INPUT-06)

The intake form SHALL hide contact detail inputs when a predefined resident profile is active.

#### Scenario: Profile active

- **WHEN** a resident profile is selected
- **THEN** only facility, profile picker, booking request, and attestation are shown before review
