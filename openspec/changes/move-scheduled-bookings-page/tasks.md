# Tasks

## OpenSpec

- [x] Change artifacts: proposal, design, specs, tasks
- [x] `npx openspec validate move-scheduled-bookings-page --strict`

## Implementation

- [x] `/scheduled` page + `ScheduledJobsPanel` page variant with empty state
- [x] Remove panel from `booking-wizard.tsx`
- [x] Nav link "Scheduled" + results link to `/scheduled`
- [x] Smoke test for `/scheduled`

## Tests

- [x] E2E: `/scheduled` page + nav (`scheduled.spec.ts`)
- [x] E2E: update wizard-scheduled cancel flow to use `/scheduled`

## Ship

- [x] `npm test`, `npm run build`, `npm run test:e2e`
- [x] PRD FR-SCHED-04 in `docs/requirements.md`
