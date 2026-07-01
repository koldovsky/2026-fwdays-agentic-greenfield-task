# qa-037-scheduler-cron-enabled-tests.md

## Контекст

Перевіряємо нову поведінку `startScheduler` після dev-036.

---

## Що зробити

Додати тести до `tests/scheduler.test.js`:

1. `CRON_ENABLED` не встановлено → `cron.schedule` не викликається, `logger.info` з `scheduler.disabled`
2. `CRON_ENABLED=false` → те саме
3. `CRON_ENABLED=true` → `cron.schedule` викликається

---

## Критерії готовності

- [x] 3 нових тести, всі зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
