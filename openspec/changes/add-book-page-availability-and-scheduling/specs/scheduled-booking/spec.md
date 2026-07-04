# Delta: scheduled-booking

## ADDED Requirements

### Requirement: Scheduled booking when date not yet open (FR-SCHED-01, BC-MHOA-TENNIS-04)

When the parsed target date is outside the current MHOA 7-day window, the system SHALL queue a scheduled booking that activates when the date enters the window.

#### Scenario: Date too far ahead

- **WHEN** user requests next Saturday and today is more than 7 days before that date
- **THEN** system creates a scheduled job with `opensAt` at local midnight when the date is 7 days away

#### Scenario: Window opens — auto book

- **WHEN** scheduler runs after `opensAt` and slots are available
- **THEN** system submits to MHOA without user interaction

#### Scenario: Window open but no slots yet

- **WHEN** date is bookable but preferred slot is taken
- **THEN** job retries on subsequent scheduler runs until booked or deadline (11:59 PM night before — BC-MHOA-TENNIS-03)

### Requirement: Multi-resident scheduling (FR-SCHED-02)

The system SHALL parse requests naming multiple household members and create one scheduled job per member when requested.

#### Scenario: Max and Nataliia

- **WHEN** user says "book for Max and Nataliia next Saturday 9 AM"
- **THEN** two jobs are queued with respective resident profiles

#### Scenario: Household limit warning

- **WHEN** multiple jobs target the same household and date
- **THEN** UI warns that MHOA allows one tennis booking per household per day (BC-MHOA-TENNIS-02)
