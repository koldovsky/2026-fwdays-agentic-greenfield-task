# Design: Confirmed bookings page

## Data model

`ConfirmedBooking` in `src/lib/booking/confirmed/types.ts`:

- Identity: `id`, `runId` (dedupe key from submit)
- Display: `fullName`, `email`, `residentId`, `facility`, `date`, `court`, `slot`
- Lifecycle: `confirmedAt`, `expiresAt` (computed from slot end via `parseSlotEndMinutes`)
- Provenance: `source` (`wizard` | `scheduled`), `mhoaApproved`, optional `confirmationText`

Store file: `{COLIBRI_DATA_DIR}/confirmed-bookings.json` (same pattern as scheduled jobs).

## Expiry

`expiresAtForSlot(date, slot)` — end time of the 45-min MHOA slot label on the booking date (local). `listActiveConfirmedBookings()` filters expired rows and rewrites the store without them.

## Write paths

1. `POST /api/booking/submit` — after `mhoaApproved` success → `recordConfirmedFromSuccess`
2. `runScheduledBookings` — job `completed` with success result → same helper
3. `listActiveConfirmedBookings` — one-time backfill from `scheduled-bookings.json` jobs with `status: completed`

## UI

- Route: `src/app/bookings/page.tsx` + `ConfirmedBookingsList` client component
- Nav: `SiteHeader` link "My bookings" (`active="bookings"`)
- Result step: link to `/bookings` after live confirmation

## Testing

- Unit: expiry + store purge (`confirmed/expiry.test.ts`, `confirmed/store.test.ts`)
- E2E: `/bookings` renders heading when authenticated (`bookings.spec.ts`)
- Smoke: `GET /api/booking/confirmed` + `/bookings` on STG deploy
