## Why

Booking intake collects resident details but cannot finish the job — parsed intent is a placeholder and MHOA submit is disabled. Residents need the full concierge loop: parse NL request, validate MHOA rules, submit the tennis form, and see success or a clear failure.

## What Changes

- Rules-based NL parser for date, time window, court/site, and slot duration (FR-NLP-01–05)
- Pre-submit validation against tennis and picnic business constraints (FR-VALID-TENNIS-01, FR-VALID-PICNIC-01)
- Confirm step shows structured parsed intent; user approves before submit (FR-INPUT-06)
- Server-side Playwright agent fills MHOA tennis form (FR-SUBMIT-01–04, FR-SUBMIT-08–09)
- Captcha human-in-the-loop: agent returns captcha image; user enters code; agent completes submit (TC-CAPTCHA-02, FR-SUBMIT-03, FR-SUBMIT-05)
- Result screen with success/failure details and cancellation contacts (FR-RESULT-01–03)
- Stub submit mode for CI/E2E when live MHOA is unavailable

## Capabilities

### New Capabilities

- `booking-parse`: Extract structured intent from natural-language booking requests
- `booking-validation`: Enforce MHOA tennis/picnic rules before submission
- `mhoa-tennis-submit`: Browser automation for MHOA tennis court form including captcha step

### Modified Capabilities

- `booking-intake`: Confirm step shows real parsed intent and enables submission flow

## Non-goals

- Picnic JotForm iframe automation (FR-SUBMIT-10) — tennis only in this change
- OCR / third-party captcha solving
- User accounts or booking history (OOS-ACCT-01)
- Live availability scraping beyond selecting first in-window 45-min slot

## Impact

- New modules under `src/lib/booking/` (parse, validate, submit)
- API routes `/api/booking/submit` and `/api/booking/captcha`
- `playwright` moved to runtime dependency for server agent
- E2E tests extended for parse/confirm/submit stub path
