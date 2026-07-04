## Context

`user_settings` stores `reminder_time`, `reminder_timezone` (`Europe/Kyiv`), and
`reminder_weekday` (6 = Sunday). Onboarding sets these and `setup_completed_at`; settings can
update `reminder_time`. No `JobQueue` jobs exist yet.

PRD `reminders` covers `FR-REM-01..03` and reuses `NFR-TZ-01` (Kyiv calendar/reminders).

## Goals / Non-Goals

**Goals:**

- One daily job per completed allowlisted user, firing on Sunday at configured local time.
- Ukrainian reminder text with optional name prefix; nudge to `/вага` (FR-REM-03).
- Reschedule on settings reminder-time change and on bot startup.
- Unit tests for message formatting and schedule time parsing (NFR-TEST-01).

**Non-Goals:**

- Changing timezone or weekday via UI (fixed v1).
- Reminders before onboarding completes (`setup_completed_at` NULL).
- FR-CMD-01 command-menu polish (`commands` capability).

## Decisions

### 1. Modules `bot/reminder_message.py` and `bot/reminder_scheduler.py`

```python
# reminder_message.py
REMINDER_BODY = "час зважування — надішли /вага, коли будеш готова"

def format_reminder_message(display_name: str | None) -> str:
    return prefix_with_name(REMINDER_BODY, display_name)
```

```python
# reminder_scheduler.py
async def send_sunday_reminder(context) -> None: ...
def schedule_user_reminder(job_queue, settings: UserSettings) -> None: ...
def schedule_all_reminders(job_queue, *, database_path, allowed_user_ids) -> None: ...
```

**Rationale:** Pure message logic is testable; scheduler isolates PTB `JobQueue` API.

### 2. `JobQueue.run_daily` with Kyiv tz

```python
hour, minute = reminder_time_to_components(settings.reminder_time)
tz = ZoneInfo(settings.reminder_timezone)
job_queue.run_daily(
    send_sunday_reminder,
    time=time(hour=hour, minute=minute, tzinfo=tz),
    days=(settings.reminder_weekday,),
    name=f"sunday_reminder_{settings.telegram_user_id}",
    data=settings.telegram_user_id,
)
```

Remove existing job with same name before scheduling (idempotent reschedule).

**Rationale:** PTB native scheduling; `days=(6,)` matches stored `reminder_weekday`.

### 3. Startup + settings reschedule

- Combined `post_init` calls menu registration (from `commands` WIP) and `schedule_all_reminders`.
- After `update_reminder_time` in settings handler, call `schedule_user_reminder` if
  `job_queue` is available.

**Alternative:** Cron outside bot — rejected; PRD uses in-process bot (TC-DEPLOY-01).

### 4. Repository `list_completed_user_settings`

```sql
SELECT * FROM user_settings WHERE setup_completed_at IS NOT NULL
```

Filter to `allowed_user_ids` in scheduler (defense in depth with middleware).

## Risks / Trade-offs

- **[Risk] JobQueue unavailable in some test environments** → Guard `if job_queue:` before
  scheduling; unit tests cover pure helpers without live queue.
- **[Risk] Reminder sent if user removed from allowlist after scheduling** → Re-check allowlist
  in `send_sunday_reminder` before sending.
- **[Trade-off] Reschedule only on startup and settings change** — acceptable for single-user v1.

## Migration Plan

Deploy with bot restart; jobs created on `post_init`. No schema migration.
