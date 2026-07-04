## Why

Onboarding and settings let users choose a Sunday reminder time, but the bot never sends the
weekly nudge. Capability `reminders` adds a scheduled Sunday message at the configured
`Europe/Kyiv` local time so Оленка is prompted to `/вага` without guilt or extra setup.

## What Changes

- Add pure reminder-message formatting with name prefixing and `/вага` nudge (FR-REM-03).
- Add repository helper to list users with completed setup (`setup_completed_at` set).
- Register `JobQueue` daily jobs on startup for each allowlisted user with completed setup at
  `reminder_time` on `reminder_weekday` in `reminder_timezone` (FR-REM-01, FR-REM-02,
  NFR-TZ-01).
- Reschedule a user's job when reminder time changes in `/налаштування`.
- Wire scheduler into `build_application` startup alongside existing hooks.
- No Telegram command-menu polish (FR-CMD-01 — `commands` capability).

## Capabilities

### New Capabilities

- `sunday-reminders`: Sunday `JobQueue` scheduling, reminder delivery, and Ukrainian reminder
  copy (FR-REM-01..03).

### Modified Capabilities

- `bot-runtime`: Startup SHALL schedule Sunday reminder jobs after the application is built.
- `settings-command`: Changing reminder time SHALL reschedule the user's Sunday job.

## Impact

- **New code**: `bot/reminder_message.py`, `bot/reminder_scheduler.py`, `tests/test_reminder_message.py`,
  `tests/test_reminder_scheduler.py`.
- **Modified code**: `bot/repository.py`, `bot/main.py`, `bot/handlers/settings.py`.
- **Dependencies**: `python-telegram-bot` `JobQueue`, `zoneinfo`, existing `messages.prefix_with_name`.
