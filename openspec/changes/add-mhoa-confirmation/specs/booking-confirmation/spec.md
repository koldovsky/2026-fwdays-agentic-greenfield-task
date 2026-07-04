# Delta: booking-confirmation

## ADDED Requirements

### Requirement: Provider-approved confirmation (FR-RESULT-01, FR-SUBMIT-04)

The system SHALL mark a booking confirmed only after Mahogany HOA returns an approval response on the tennis form.

#### Scenario: Live MHOA approval

- **WHEN** live submit completes and MHOA shows tennis booking confirmation text
- **THEN** API returns `status: success` with `mhoaApproved: true`, `confirmedAt`, booker `fullName`, `email`, and MHOA `confirmationText`

#### Scenario: Stub mode

- **WHEN** submit runs in stub mode
- **THEN** API returns `status: success` with `mhoaApproved: false` and demo confirmation text

#### Scenario: MHOA rejection

- **WHEN** MHOA does not return approval after captcha retries
- **THEN** API returns `status: error` — never `success` with `mhoaApproved: true`

### Requirement: Confirmation UI (FR-RESULT-01)

The result step SHALL display booker name, email, slot details, and whether MHOA approved the booking.

#### Scenario: Approved booking displayed

- **WHEN** user receives `mhoaApproved: true`
- **THEN** UI shows "Confirmed by Mahogany HOA" with resident name and confirmation excerpt
