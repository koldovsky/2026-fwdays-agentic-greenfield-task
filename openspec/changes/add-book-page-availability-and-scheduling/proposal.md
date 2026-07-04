# Proposal: Book-page availability + scheduled booking

## Why

Users want to see MHOA slots on the **Book outdoor activity** page — either pick a slot directly or describe intent in NL and confirm on the next step (FR-AVAIL-02). Dates beyond the 7-day window (BC-MHOA-TENNIS-04) need **scheduled booking**: queue the request and auto-submit when MHOA opens that date (FR-SCHED-01).

## What changes

- Date picker + live availability (East/West) on `/book`
- Two intake paths: **Pick a slot** or **Write a request** (NL → confirm with slots)
- Scheduled booking queue with `opensAt` derived from MHOA 7-day rule
- Background runner (`/api/booking/schedule/run` + npm script) polls and books when window opens
- NLP: multi-resident ("Max and Nataliia") and slot count hints

## MHOA window (BC-MHOA-TENNIS-04/05)

- Same day: not bookable
- Days 1–7 ahead: bookable (calendar links active)
- Day 8+: greyed until each midnight rolls the window forward
- A target date **opens** at **local midnight** when it is exactly **7 days away**

Example (today Fri Jul 3): Jul 4–10 bookable; **Sat Jul 11 opens at midnight Jul 4**.

## Out of scope

- Picnic scheduling
- Email/push notifications when scheduled job completes (log + UI list only)
