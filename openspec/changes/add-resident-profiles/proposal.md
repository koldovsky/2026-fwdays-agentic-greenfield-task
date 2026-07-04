## Why

Repeat bookings should not require re-entering household contact data. Residents Max and Nataliia book often; the intake form was too heavy. A prior parser gap also misread *“between 12 AM and 1 PM”* as the default morning window (FR-NLP-02).

## What Changes

- Predefined household profiles in `src/lib/booking/residents.ts` (Max, Nataliia)
- **Who is booking?** picker on `/book`; profile selection pre-fills intake server-side
- Contact fields hidden when a profile is selected; **Other** shows manual entry
- Parser supports **`between X and Y`** time phrases with AM/PM (FR-NLP-02)

## Capabilities

### New Capabilities

- `resident-profiles`: Household member picker and profile-backed contact data

### Modified Capabilities

- `booking-intake`: Hide contact fields when profile selected; show on **Other**
- `booking-parse`: Parse `between 12 AM and 1 PM` style windows (delta)

## Non-goals

- User accounts, login, or persisted profile editing in UI (OOS-ACCT-01)
- More than the two configured household members without code change

## Impact

- `src/lib/booking/residents.ts`, `resident-picker.tsx`, `intake-form.tsx`
- `src/lib/booking/parse.ts` — `between` time pattern
- E2E tests in `tests/e2e/booking-intake.spec.ts`
