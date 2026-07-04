# Proposal: Wire scheduled booking into the booking wizard

## Why

Scheduled booking backend and NL-flow scheduling already exist (FR-SCHED-01), but the **What → Who → When → Confirm** wizard only supports the MHOA 7-day window. Users cannot queue future dates from the wizard (FR-WIZ-01 gap).

## What changes

- **When step:** keep 7-day tabs for live availability; add date picker for day 8 through 8 weeks ahead
- **Future dates:** static court + slot picker (no live MHOA grid); combo — exact slot if chosen, else 9:00–21:00 window
- **Confirm step:** queue jobs via batch schedule API when date is outside the window
- **Other guest:** store contact on scheduled job; runner submits with guest intake
- **Scheduled jobs panel:** cancel waiting/ready jobs; human-readable participant labels

## Capabilities

- **Modified:** `scheduled-booking`, `booking-wizard`

## Non-goals

- Email/push when a job completes
- In-app scheduler polling (cron / `npm run schedule:run` only)
- Picnic scheduled booking
- Cancel for running/completed/failed jobs

## PRD traceability

FR-SCHED-01, FR-SCHED-02, FR-SCHED-03, FR-WIZ-01, FR-WIZ-02, FR-WIZ-03, BC-MHOA-TENNIS-04
