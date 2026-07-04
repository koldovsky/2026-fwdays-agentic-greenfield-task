# Tasks

## OpenSpec

- [x] Change artifacts: proposal, design, specs, tasks
- [x] Change artifacts: proposal, design, specs, tasks
- [x] `npx openspec validate wire-wizard-scheduled-booking --strict`

## Implementation

- [x] Schedulable date helpers (`isSchedulableDate`, min/max, 8-week horizon)
- [x] `TENNIS_SLOT_LABELS` + `FutureSlotPicker` component
- [x] When step: date picker + live vs static mode
- [x] `guestContact` on `ScheduledJob`; runner intake for `other`
- [x] `POST /api/booking/schedule/batch` + `DELETE /api/booking/schedule/[id]`
- [x] Wizard confirm schedule path + queued results UI
- [x] Scheduled jobs panel: cancel + human labels

## Tests (one per scenario)

- [x] Unit: schedulable date range (`tennis-window.test.ts`)
- [x] Unit: `createJobsFromInput` + other guest + runner intake (`schedule/runner.test.ts`)
- [x] Unit: cancel job store/API
- [x] E2E: wizard future date → schedule → job in panel (`wizard-scheduled.spec.ts`)
- [x] E2E: cancel from panel
- [x] E2E: household warning on schedule confirm

## Ship

- [x] `npm test`, `npm run build`, `npm run test:e2e`
- [x] Update PRD FR-SCHED-* status in `docs/requirements.md`
