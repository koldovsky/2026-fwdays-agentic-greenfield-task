# dev-029-scheduler.md

## Контекст

dev-026 (`processPendingWorkspaces`) та dev-010 (`fetchWorkspaces`) готові.
Scheduler — зовнішня обгортка: cron-тік → один цикл polling + обробка.

---

## Що зробити

Створити `src/scheduler.js`.

### Структура

```js
let isRunning = false;

async function runCycle(config) {
  if (isRunning) {
    logger.warn('Previous cycle still running, skipping tick');
    return;
  }
  isRunning = true;
  try {
    const workspaces = await fetchWorkspaces();
    await upsertWorkspaces(workspaces);
    await processPendingWorkspaces(config);
  } catch (err) {
    logger.error('Cycle failed', { error: err.message });
  } finally {
    isRunning = false;
  }
}

function startScheduler(config) {
  const cronExpression = config.poll?.cronExpression || '*/15 * * * *';
  logger.info('Scheduler started', { cron: cronExpression });
  cron.schedule(cronExpression, () => runCycle(config));
}
```

**Правила:**
- `isRunning` — модульна змінна, скидається у `finally` (навіть при помилці)
- Помилки у циклі — логуються, але не кидаються далі (cron продовжує)
- `startScheduler` не запускає перший цикл одразу — лише реєструє розклад

---

## Критерії готовності (Definition of Done)

- [x] `src/scheduler.js` створено
- [x] `isRunning = true` встановлюється до виклику fetchWorkspaces
- [x] `isRunning` скидається у `finally`
- [x] Повторний тік при `isRunning === true` → warn + return без запуску
- [x] Модуль експортує `{ startScheduler, runCycle }`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
