# Tasks

## OpenSpec

- [x] Change artifacts: proposal, design, specs, tasks
- [x] `npx openspec validate add-confirmed-bookings-page --strict`

## Implementation

- [x] `ConfirmedBooking` types + expiry helpers
- [x] `confirmed-bookings.json` store + backfill from completed scheduled jobs
- [x] Record on wizard submit + scheduled runner completion
- [x] `GET /api/booking/confirmed`
- [x] `/bookings` page + nav + result-step link
- [x] Deploy smoke checks for confirmed API and page

## Tests (one per scenario)

- [x] Unit: expiry at slot end (`confirmed/expiry.test.ts`)
- [x] Unit: store purge expired (`confirmed/store.test.ts`)
- [x] E2E: authenticated `/bookings` page renders (`bookings.spec.ts`)

## Ship

- [x] `npm test`, `npm run build`
- [x] Update PRD FR-BOOK-* in `docs/requirements.md`
