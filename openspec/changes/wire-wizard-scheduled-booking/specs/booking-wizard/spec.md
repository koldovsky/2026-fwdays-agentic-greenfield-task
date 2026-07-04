# Delta: booking-wizard

## ADDED Requirements

### Requirement: Future date selection on When step (FR-WIZ-01, BC-MHOA-TENNIS-04)

The When step SHALL support selecting dates outside the live 7-day window via a date picker, up to 8 weeks ahead.

#### Scenario: Live dates unchanged

- **WHEN** user picks a date within the next 7 bookable days
- **THEN** live MHOA availability is shown as today

#### Scenario: Future date picker

- **WHEN** user picks a date 8–56 days ahead via the date picker
- **THEN** a static court and slot picker is shown instead of live availability
- **AND** the UI displays when the date opens on MHOA

### Requirement: Schedule from wizard Confirm (FR-WIZ-03, FR-SCHED-01)

The Confirm step SHALL queue scheduled jobs when any assignment is outside the booking window.

#### Scenario: Schedule button

- **WHEN** all assignments target dates outside the 7-day window and attestation is accepted
- **THEN** user sees "Schedule N booking(s)" and jobs are queued on confirm

#### Scenario: Household warning on schedule

- **WHEN** multiple assignments share the same future date
- **THEN** UI warns that MHOA allows one tennis booking per household per day (BC-MHOA-TENNIS-02)

#### Scenario: Queued results

- **WHEN** scheduling succeeds
- **THEN** results show queued status with opens-at time, not MHOA confirmed/failed
