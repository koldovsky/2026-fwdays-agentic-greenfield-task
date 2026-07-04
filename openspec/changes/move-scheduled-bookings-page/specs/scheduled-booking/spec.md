# Delta: scheduled-booking

## MODIFIED Requirements

### Requirement: Scheduled jobs panel (FR-SCHED-01, FR-SCHED-03)

The system SHALL expose queued scheduled jobs on a dedicated authenticated page instead of embedding them in the booking wizard.

#### Scenario: Dedicated scheduled page

- **WHEN** user navigates to `/scheduled` while logged in
- **THEN** the page shows "Scheduled bookings" and the list of non-completed jobs with cancel and refresh actions

#### Scenario: Empty scheduled queue

- **WHEN** user has no waiting, ready, running, or failed scheduled jobs
- **THEN** `/scheduled` shows a friendly empty state

#### Scenario: Nav link

- **WHEN** user views any authenticated page
- **THEN** the site header includes a "Scheduled" link to `/scheduled`

## MODIFIED Requirements

### Requirement: Booking wizard focus (FR-WIZ-01)

The booking wizard on `/book` SHALL NOT embed the scheduled jobs panel.

#### Scenario: Book page without queue panel

- **WHEN** user completes any wizard step on `/book`
- **THEN** the scheduled jobs panel is not shown on that page

#### Scenario: Link after queueing

- **WHEN** user successfully queues scheduled jobs from the wizard
- **THEN** the results screen offers a link to `/scheduled`
