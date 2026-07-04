# Delta: scheduled-booking

## ADDED Requirements

### Requirement: Wizard batch scheduling (FR-SCHED-01, FR-WIZ-03)

When the booking wizard confirms assignments whose target date is outside the MHOA 7-day window, the system SHALL queue one scheduled job per assignment via the batch schedule API.

#### Scenario: Future date from wizard

- **WHEN** user completes the wizard with a date more than 7 days ahead
- **THEN** the system creates scheduled jobs with `opensAt` at local midnight when the date is 7 days away
- **AND** does not call `/api/booking/submit` immediately

#### Scenario: Exact slot preference

- **WHEN** a scheduled job has `slotLabel` and `courtPreference`
- **THEN** the runner attempts that exact slot when the window opens

#### Scenario: Window fallback

- **WHEN** a scheduled job has no `slotLabel`
- **THEN** the runner picks the first available slot within `windowStart`–`windowEnd` (default 09:00–21:00)

### Requirement: Other guest scheduled jobs (FR-SCHED-02)

The system SHALL support scheduling bookings for wizard "Other guest" participants by storing contact details on the job.

#### Scenario: Other guest queued

- **WHEN** user selects Other guest and schedules a future booking
- **THEN** the job stores `guestContact` and the runner submits using that contact when the window opens

### Requirement: Cancel scheduled job (FR-SCHED-03)

The system SHALL allow users to cancel scheduled jobs that have not yet run.

#### Scenario: Cancel waiting job

- **WHEN** user clicks Cancel on a job with status `waiting` or `ready`
- **THEN** the job is removed from the store and no longer appears in the panel

#### Scenario: Cannot cancel completed job

- **WHEN** user views a job with status `completed` or `failed`
- **THEN** no Cancel action is shown
