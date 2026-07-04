# booking-parse Delta

## MODIFIED Requirements

### Requirement: Between time window (FR-NLP-02)

The system SHALL extract time windows from `between X and Y` phrasing with AM/PM.

#### Scenario: Midnight to afternoon

- **WHEN** the user request is "Monday between 12 AM and 1 PM 1 slot"
- **THEN** windowStart is 00:00 and windowEnd is 13:00 with no default-window ambiguity note
