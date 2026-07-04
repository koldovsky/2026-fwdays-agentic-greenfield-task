# Proposal: MHOA-approved booking confirmation

## Why

Users need certainty that Colibri only marks a booking **confirmed** when Mahogany HOA accepts it — not on form fill alone. Success must carry the booker's identity and MHOA confirmation evidence (FR-RESULT-01, FR-SUBMIT-04, FR-SUBMIT-07).

## What changes

- `SubmitSuccess` includes `mhoaApproved`, `confirmedAt`, booker `fullName` and `email`
- Live success returned **only** when MHOA confirmation page text matches approval patterns
- Stub mode sets `mhoaApproved: false` with explicit demo message
- Result UI shows "Confirmed by Mahogany HOA" with resident and slot details
- Server audit log on confirmed live bookings (no captcha/secrets)

## Capabilities

### New

- `booking-confirmation`: Provider-approved success contract and UI

### Modified

- `mhoa-tennis-submit`: Gate success on MHOA approval detection
