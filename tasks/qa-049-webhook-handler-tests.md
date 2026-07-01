# qa-049-webhook-handler-tests.md

## Контекст

Перевіряємо `handleJiraWebhook` з dev-046. Всі зовнішні залежності мокуємо.

---

## Що зробити

Новий файл `tests/webhookHandler.test.js`:

1. `fetchWorkspaces` повертає порожній масив → `{ errorCode: '1000', errorMessage: 'Воркспейс не знайдено' }`
2. Воркспейс знайдено, `businessServices: []` → `{ errorCode: '0', errorMessage: 'Відсутні об'єкти для аналізу' }`
3. Воркспейс знайдено, є BS → `{ errorCode: '1', errorMessage: 'Взято в роботу' }` + `setImmediate` викликається
4. `fetchWorkspaces` кидає помилку → HTTP 500 `{ errorCode: '500' }`
5. При `errorCode: '1'` — `res.json` викликається ДО `processWorkspaceWebhook`

---

## Критерії готовності

- [x] 5 тестів, всі зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
