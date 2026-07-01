# dev-026-process-pending.md

## Контекст

dev-025 виконано — `processWorkspace` є. Тепер батчинг усіх pending воркспейсів.

---

## Що зробити

Реалізувати `processPendingWorkspaces(config)` у `src/processor.js`.

### Алгоритм

```js
async function processPendingWorkspaces(config) {
  const pending = await getPendingWorkspaces();
  if (pending.length === 0) return;

  const concurrency = config.siebel?.concurrency || 3;

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(ws => processWorkspace(ws, config))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'rejected') {
        logger.error('Workspace failed', {
          workspace: batch[j].name,
          error: results[j].reason?.message,
        });
      }
    }
  }
}
```

### Правила
- `Promise.allSettled` — помилка одного не зупиняє решту в батчі
- Помилки вже записані в state самим `processWorkspace` → тут тільки логування
- Батч розміром `config.siebel.concurrency` (default 3)

---

## Критерії готовності (Definition of Done)

- [x] `processPendingWorkspaces` реалізовано в `src/processor.js`
- [x] Використовує `Promise.allSettled`
- [x] Батчинг по `config.siebel.concurrency`
- [x] Модуль експортує `{ processWorkspace, processPendingWorkspaces }`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
