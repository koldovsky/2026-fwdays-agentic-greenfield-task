## ADDED Requirements

### Requirement: Sunday reminder scheduling

The bot SHALL schedule a weekly reminder for each allowlisted user with completed onboarding
(`setup_completed_at` set) at the user's configured `reminder_time` on `reminder_weekday` in
`reminder_timezone`. (FR-REM-01, FR-REM-02, NFR-TZ-01)

#### Scenario: Completed user gets a Sunday job on startup

- **WHEN** the bot application starts and a user has `setup_completed_at` set, `reminder_time`
  `09:00`, `reminder_timezone` `Europe/Kyiv`, and `reminder_weekday` 6
- **THEN** a `JobQueue` daily job is registered for that user on Sunday at 09:00 Europe/Kyiv

#### Scenario: Incomplete onboarding is not scheduled

- **WHEN** the bot starts and a user has `setup_completed_at` NULL
- **THEN** no Sunday reminder job is registered for that user

### Requirement: Sunday reminder message

On the scheduled run, the bot SHALL send an Ukrainian reminder that uses the display name when
set and nudges the user to `/вага`. (FR-REM-03)

#### Scenario: Named reminder

- **WHEN** the reminder job runs for a user with `display_name` «Оленка»
- **THEN** the message includes «Оленка» and mentions `/вага`

#### Scenario: General reminder without name

- **WHEN** the reminder job runs for a user with cleared `display_name`
- **THEN** the message nudges to `/вага` without a name prefix
