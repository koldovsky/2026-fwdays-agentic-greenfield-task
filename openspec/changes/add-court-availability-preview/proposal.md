# Proposal: Court availability preview before booking

## Why

Users should see **all available MHOA tennis slots for East and West courts** on their parsed date before submitting — not discover availability only after automation runs (FR-AVAIL-01).

## What changes

- Live/stub API `GET/POST /api/booking/availability` for a date
- Confirm step shows both courts' slot lists from mahoganyhoa.com
- User selects court + slot before **Submit to MHOA**
- Submit uses the selected court/slot

## Capabilities

- **New:** `court-availability-preview`
- **Modified:** `booking-intake` (confirm step UX)
