# Delta: mhoa-tennis-submit

## MODIFIED Requirements

### Requirement: Submission outcome (FR-SUBMIT-04)

Live tennis submit SHALL parse MHOA post-submit page and only emit success when approval language is present.

#### Scenario: Tennis confirmation page

- **WHEN** MHOA returns "We have received your Tennis Court Booking"
- **THEN** submit module sets `mhoaApproved: true` and logs audit event
