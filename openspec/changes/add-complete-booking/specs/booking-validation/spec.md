# booking-validation

Validate parsed bookings against MHOA rules before submission.

## Requirements

### Requirement: Reject same-day tennis (BC-MHOA-TENNIS-05, FR-VALID-TENNIS-01)

The system SHALL reject tennis bookings for today's date.

#### Scenario: Same-day request

- **WHEN** parsed date equals reference date
- **THEN** validation fails with a human-readable reason

### Requirement: Enforce seven-day advance limit (BC-MHOA-TENNIS-04)

The system SHALL reject tennis dates more than 7 days after the reference date.

#### Scenario: Too far in advance

- **WHEN** parsed date is more than 7 days after reference date
- **THEN** validation fails explaining the 7-day limit

### Requirement: Operating hours (BC-MHOA-TENNIS-06, BC-MHOA-TENNIS-08)

The system SHALL reject windows ending after 21:45 for tennis.

#### Scenario: Late evening window

- **WHEN** window end is after 21:45
- **THEN** validation fails
