# Delta: confirmed-bookings

## ADDED Requirements

### Requirement: Active confirmed bookings page (FR-BOOK-01, FR-RESULT-01)

The system SHALL provide an authenticated `/bookings` page listing successful MHOA tennis reservations that have not yet expired.

#### Scenario: Page lists upcoming confirmations

- **WHEN** user navigates to `/bookings` while logged in
- **THEN** the page shows "My bookings" and a list of confirmed reservations with date, court, slot, and participant name
- **AND** a nav link "My bookings" is visible in the site header

#### Scenario: Empty state

- **WHEN** user has no active confirmed bookings
- **THEN** the page shows a friendly empty state explaining entries appear after MHOA confirms a reservation

### Requirement: Record confirmed booking on success (FR-BOOK-02)

The system SHALL persist each MHOA-approved successful submit to the confirmed bookings store.

#### Scenario: Wizard live submit

- **WHEN** `/api/booking/submit` returns success with `mhoaApproved: true`
- **THEN** a `ConfirmedBooking` row is written with `source: wizard` and the submit `runId`

#### Scenario: Scheduled job completion

- **WHEN** a scheduled job reaches `completed` with an approved submit result
- **THEN** a `ConfirmedBooking` row is written with `source: scheduled`
- **AND** completed scheduled jobs are backfilled into the store on first list if missing

#### Scenario: Dedupe by runId

- **WHEN** the same `runId` is recorded twice
- **THEN** only one store entry exists

### Requirement: Auto-expire confirmed bookings (FR-BOOK-03)

The system SHALL remove confirmed bookings from the active list after the booked slot ends.

#### Scenario: Expiry at slot end

- **WHEN** current time is after the slot end on the booking date (e.g. 9:45 AM for `9:00 AM-9:45 AM`)
- **THEN** the booking is not returned by `GET /api/booking/confirmed`
- **AND** the entry is removed from the store on that request

#### Scenario: Active before slot end

- **WHEN** current time is before the slot end
- **THEN** the booking remains visible on `/bookings`
