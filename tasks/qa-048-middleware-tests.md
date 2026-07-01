# qa-048-middleware-tests.md

## Контекст

Перевіряємо обидва middleware з dev-044 і dev-045.

---

## Що зробити

Новий файл `tests/middleware.test.js`:

### authMiddleware
1. Відсутній `Authorization` заголовок → 401 `{ errorCode: '401' }`
2. Неправильний токен → 401
3. Правильний токен → `next()` викликається, відповідь не відправляється

### validateWebhookBody
4. Всі три поля присутні → `next()` викликається
5. Відсутній `jiraIssueKey` → 400 з переліком
6. Відсутні два поля → 400, обидва перелічені в `errorMessage`
7. Порожнє тіло → 400

---

## Критерії готовності

- [x] 7 тестів, всі зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
