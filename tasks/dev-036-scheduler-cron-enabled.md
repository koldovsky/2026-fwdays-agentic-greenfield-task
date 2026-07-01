# dev-036-scheduler-cron-enabled.md

## Контекст

За рішенням 001 (DECISIONS.md): Cron тепер резервна точка входу, вимкнена за замовчуванням.
Основна точка — Webhook. Cron вмикається через `CRON_ENABLED=true`.

---

## Що зробити

Змінити `src/scheduler.js`:

```js
function startScheduler(config) {
  if (process.env.CRON_ENABLED !== 'true') {
    logger.info('scheduler.disabled', { reason: 'CRON_ENABLED != true' });
    return;
  }
  const cronExpression = process.env.POLL_INTERVAL_CRON || config.poll?.cronExpression || '*/15 * * * *';
  logger.info('scheduler.started', { cron: cronExpression });
  cron.schedule(cronExpression, () => runCycle(config));
}
```

---

## Критерії готовності

- [x] При `CRON_ENABLED=false` або відсутності змінної — cron не запускається, лог `scheduler.disabled`
- [x] При `CRON_ENABLED=true` — cron запускається як раніше
- [x] `runCycle` залишається без змін

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
