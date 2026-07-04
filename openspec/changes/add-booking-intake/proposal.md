## Why

Every downstream capability (NLP parsing, MHOA validation, form submission) depends on
collecting and validating resident contact details and a natural-language booking request.
Without a booking intake UI, there is nothing for the booking agent to act on. This is the
first user-facing slice of the MVP (FR-PROV-*, FR-INPUT-*).

## What Changes

- Add a single-page **booking intake form** for Mahogany HOA outdoor facilities.
- User selects facility type: **Tennis Courts** or **Beach Picnic Sites** (FR-PROV-02).
- User enters **full name**, **email**, **phone**, **Mahogany address**, and a
  **natural-language booking request** (FR-INPUT-01 through FR-INPUT-07).
- Client-side validation with field-specific errors before proceeding (FR-INPUT-05).
- Display parsed booking intent summary with a **Confirm** step placeholder — full NLP
  parsing is a later change; this change captures input and shows a stub confirmation
  panel (FR-INPUT-06 partial — UI shell only).
- Legal disclosure that submission will automate mahoganyhoa.com (NFR-LEGAL-01).

## Non-goals

- Natural-language parsing logic (separate change: `add-nlp-parsing`).
- MHOA rule validation or form submission / captcha (later changes).
- User accounts or persisted booking history (OOS-ACCT-01).
- Picnic payment or signature automation (OOS-PAY-01 scope for submission change).

## Capabilities

### New Capabilities

- `booking-intake`: Provider/facility selection and resident contact capture form with
  validation, NL request textarea, and confirm-step UI shell. Covers FR-PROV-01/02/03,
  FR-INPUT-01–07, FR-INPUT-05, and NFR-LEGAL-01 disclosure.

### Modified Capabilities

<!-- None — greenfield project; openspec/specs/ is empty. -->

## Impact

- New UI: booking page route, intake form component(s), validation utilities.
- New types: `BookingIntake`, `FacilityType`, `ProviderId`.
- No new runtime dependencies beyond existing Next.js / React / Tailwind stack.
- Sets the data contract consumed by future NLP, validation, and submission modules.
