# review-generation — delta (hardening)

## MODIFIED Requirements

### Requirement: Midnight cron fallback guarantees coverage

The system SHALL run a single scheduled job that, at each user's **local** midnight, generates the
just-finished day's daily review **if and only if** no daily review already exists for that
(user, date). Auto-generated reviews SHALL be pushed proactively to the user's chat and stored with
`reviewed_flag = false`. The sweep SHALL evaluate every user against their own timezone. The sweep
SHALL never produce an unhandled promise rejection: a failure outside the per-user loop (e.g. the
user listing query) SHALL be caught and logged message-only, and the next hourly tick SHALL run
normally. The scheduler's cron task SHALL be stopped during graceful shutdown.

#### Scenario: unreviewed day auto-generates at local midnight
- **WHEN** the scheduler tick fires and a user's local time has just crossed midnight and that user
  has no `reviews` row for the finished day
- **THEN** the system generates that day's daily review, stores it with `reviewed_flag = false`, and
  proactively sends it to the user's chat

#### Scenario: already-reviewed day is not regenerated
- **WHEN** the scheduler tick fires for a user who already triggered `/done` for the finished day
  (a daily `reviews` row exists for that date)
- **THEN** the system does NOT generate or send a second review for that day

#### Scenario: per-user timezone drives the trigger instant
- **WHEN** two users in different timezones are swept in the same hourly tick
- **THEN** each user's review fires only when the finished day has ended in that user's own
  timezone, not the server's

#### Scenario: a transient failure of the sweep's outer query does not crash the process
- **WHEN** the sweep's user-listing query throws (e.g. a transient DB error) during a tick
- **THEN** the error is caught and logged message-only, no unhandled rejection escapes, and the
  next hourly tick proceeds normally

#### Scenario: cron task stops on shutdown
- **WHEN** the process shuts down gracefully (SIGINT/SIGTERM)
- **THEN** the review cron task is stopped and no new sweep begins during teardown
