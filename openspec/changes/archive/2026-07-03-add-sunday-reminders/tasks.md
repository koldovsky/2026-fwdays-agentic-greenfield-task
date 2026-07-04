## 1. Reminder message

- [x] 1.1 Add `bot/reminder_message.py` with `format_reminder_message()` using `prefix_with_name` and `/вага` nudge
- [x] 1.2 Add `tests/test_reminder_message.py` for named and general copy

## 2. Repository and time helpers

- [x] 2.1 Add `list_completed_user_settings()` to `bot/repository.py`
- [x] 2.2 Add `reminder_time_to_components()` helper (reuse `parse_reminder_time`) in scheduler module

## 3. Scheduler

- [x] 3.1 Add `bot/reminder_scheduler.py` — `send_sunday_reminder`, `schedule_user_reminder`, `schedule_all_reminders`
- [x] 3.2 Wire `schedule_all_reminders` into `post_init` in `bot/main.py`
- [x] 3.3 Reschedule from `settings_message` after successful reminder-time update

## 4. Verification

- [x] 4.1 Add `tests/test_reminder_scheduler.py` for time components and scheduling guards
- [x] 4.2 Run `make check` from `nedilya-na-vagakh/`
