## ADDED Requirements

### Requirement: Reminder time change reschedules job

When a user updates reminder time via `/налаштування`, the bot SHALL reschedule that user's
Sunday reminder job to the new time. (FR-REM-01)

#### Scenario: New time replaces old schedule

- **WHEN** an allowlisted user with completed setup saves a new valid `reminder_time` via
  `/налаштування`
- **THEN** the user's Sunday reminder job is updated to fire at the new local time
