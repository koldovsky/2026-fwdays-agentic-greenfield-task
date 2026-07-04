# Proposal: Move scheduled bookings to dedicated page

## Why

Scheduled queue UI clutters the `/book` wizard. Confirmed bookings already live on `/bookings`; queued jobs deserve the same — a focused **Scheduled** nav tab (FR-SCHED-04).

## What changes

- New **`/scheduled`** page with the scheduled jobs list (cancel, refresh, errors)
- Nav link **Scheduled** beside Book / My bookings
- **Remove** `ScheduledJobsPanel` from the booking wizard flow
- After queueing from wizard, link to `/scheduled`
- Empty state when no queued jobs

## Capabilities

- **Modified:** `scheduled-booking`, `booking-wizard`

## Non-goals

- Change schedule API or cron behavior
- Show completed jobs here (use `/bookings` for confirmations)

## PRD traceability

FR-SCHED-01, FR-SCHED-03, FR-WIZ-01
