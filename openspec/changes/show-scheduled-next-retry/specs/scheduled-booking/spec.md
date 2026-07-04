# Delta: scheduled-booking

## MODIFIED Requirements

### Requirement: Scheduled jobs panel (FR-SCHED-01, FR-SCHED-03, FR-SCHED-04)

The system SHALL show when the cron runner will next attempt each active scheduled job, in Calgary time.

#### Scenario: Ready job shows next retry

- **WHEN** a scheduled job has status `ready` (including after a failed attempt)
- **THEN** the job card displays the next cron retry time labeled with Calgary

#### Scenario: Waiting job shows first run after open

- **WHEN** a scheduled job has status `waiting` and `opensAt` is in the future
- **THEN** the job card displays the first cron run at or after `opensAt`, in Calgary time

#### Scenario: Terminal jobs omit retry

- **WHEN** a scheduled job has status `completed` or `failed`
- **THEN** no next-retry label is shown
