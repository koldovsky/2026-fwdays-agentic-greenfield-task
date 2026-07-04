# Design: Scheduled bookings page

## Route

`src/app/scheduled/page.tsx` — mirrors `/bookings` layout (header, title, CTA to `/book`).

## Component

Reuse `ScheduledJobsPanel` with `variant="page"`:

| Variant | Empty jobs | Placement |
|---------|------------|-----------|
| `inline` (removed) | hidden | was on `/book` |
| `page` | friendly empty state | `/scheduled` only |

Panel lists all non-`completed` jobs (no `slice(-10)` cap on page).

## Wizard

Remove all `ScheduledJobsPanel` imports from `booking-wizard.tsx`.  
`WizardResultsStep` adds "View scheduled bookings" link when outcomes include scheduled jobs.

## Nav

`SiteHeader` — `active="scheduled"`, link label **Scheduled**.

## Tests

- E2E: `/scheduled` empty + nav; wizard cancel flow uses `/scheduled`
- Smoke: `GET /scheduled` on deploy
