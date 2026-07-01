# qa-043-process-workspace-webhook-tests.md

## Контекст

Перевіряємо `processWorkspaceWebhook` з dev-042.

---

## Що зробити

Новий тест-файл `tests/processWorkspaceWebhook.test.js`:

1. Викликає `createSubtask` (не `createReviewIssue`)
2. `updateWorkspace` не викликається жодного разу
3. Повертає `{ subtaskKey }` при успіху
4. Пробрасовує помилку якщо Siebel недоступний

---

## Критерії готовності

- [x] 4 тести, всі зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
