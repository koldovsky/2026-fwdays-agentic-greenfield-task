# Delta: mhoa-tennis-submit

## MODIFIED Requirements

### Requirement: Captcha human-in-the-loop (FR-SUBMIT-03, TC-CAPTCHA-01)

The agent SHALL solve the tennis captcha server-side before final submit. The user SHALL NOT be prompted for a security code in the UI.

#### Scenario: Automatic captcha solve

- **WHEN** live submit reaches the captcha field
- **THEN** the server fetches the captcha image, runs OCR, fills the code, and submits without user interaction

#### Scenario: Captcha retry (FR-SUBMIT-05)

- **WHEN** MHOA rejects a captcha code
- **THEN** the agent refreshes the captcha and retries up to 3 times before returning an error
