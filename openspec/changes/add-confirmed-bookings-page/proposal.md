# Proposal: Confirmed bookings page

## Why

Users need a dedicated place to see **successful** MHOA reservations while they are still upcoming. The scheduled-jobs panel only shows the queue (waiting/ready/failed) — not confirmed history. OOS-ACCT-01 deferred full account history; this change delivers a **minimal, auto-expiring** confirmed list for the household MVP.

## What changes

- **`/bookings` page** — "My bookings" in nav; lists active confirmed reservations
- **`confirmed-bookings.json` store** — persisted under `COLIBRI_DATA_DIR`
- **Record on success** — wizard submit and scheduled job completion
- **Expiry** — entries removed after slot end time (local time on booking date)
- **Backfill** — completed scheduled jobs imported on first list if not already stored
- **API** — `GET /api/booking/confirmed` returns active list and purges expired

## Capabilities

- **Added:** `confirmed-bookings`

## Non-goals

- Cancel MHOA bookings from this page (still contact reception — FR-RESULT-03)
- Picnic confirmed bookings (tennis MVP only)
- Cross-device sync beyond server data dir
- Email notification on confirmation

## PRD traceability

FR-BOOK-01, FR-BOOK-02, FR-BOOK-03, FR-RESULT-01
