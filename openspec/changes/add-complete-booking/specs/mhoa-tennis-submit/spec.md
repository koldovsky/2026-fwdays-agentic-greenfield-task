# mhoa-tennis-submit

Submit validated tennis bookings to mahoganyhoa.com via browser automation.

## Requirements

### Requirement: Navigate and fill tennis form (FR-SUBMIT-01, FR-SUBMIT-02, FR-SUBMIT-08)

The agent SHALL open the MHOA tennis URL, select court and date, pick an available slot in the parsed window, and fill name, phone, email, address, and rules checkbox.

#### Scenario: Stub mode success

- **WHEN** `COLIBRI_SUBMIT_MODE=stub` and intake is valid
- **THEN** submit returns success without contacting MHOA

### Requirement: Captcha human-in-the-loop (FR-SUBMIT-03, TC-CAPTCHA-01)

The agent SHALL pause before final submit and return a captcha image for the user to solve.

#### Scenario: Captcha required

- **WHEN** live submit reaches the captcha field
- **THEN** API returns `captcha_required` with base64 image and sessionId

### Requirement: Submission outcome (FR-SUBMIT-04, FR-RESULT-01, FR-RESULT-02)

The system SHALL return success with facility, date, and slot, or failure with reason.

#### Scenario: Success payload

- **WHEN** MHOA accepts the booking (or stub mode)
- **THEN** user sees facility, date, time slot, and cancellation contacts
