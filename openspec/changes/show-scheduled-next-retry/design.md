# Design: scheduled next retry label

## Cron schedule (source of truth)

`deploy/colibri-schedule.cron` — `CRON_TZ=America/Edmonton`, minutes `1,11,21,31,41,51` each hour.

Calgary shares `America/Edmonton` (MDT/MST). UI labels the zone as **Calgary** for residents.

## Logic

- `getNextScheduleCronRun(after)` — next cron tick strictly after `after`, in Edmonton TZ.
- `getNextRetryAt(job, now)`:
  - `waiting` → first cron at or after `max(now, opensAt)`
  - `ready` / `running` → first cron after `now`
  - terminal statuses → `null`

## UI

`/scheduled` job cards show `Next retry {weekday, date, time} Calgary` for active jobs.

Optional client tick every 60s so the label advances without manual refresh.
