## ADDED Requirements

### Requirement: Reminder jobs scheduled at startup

After the application is built, the bot SHALL register Sunday reminder `JobQueue` jobs for all
eligible users. (FR-REM-01)

#### Scenario: Startup schedules reminders

- **WHEN** `build_application` completes and `post_init` runs
- **THEN** reminder jobs are registered for allowlisted users with completed setup
