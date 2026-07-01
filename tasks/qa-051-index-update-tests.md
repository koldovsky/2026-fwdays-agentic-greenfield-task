# qa-051-index-update-tests.md

## Контекст

Перевіряємо оновлений `src/index.js` після dev-050.

---

## Що зробити

Оновити `tests/index.test.js`:

1. Відсутній `WEBHOOK_API_TOKEN` → `process.exit(1)` з переліком відсутніх
2. Всі env присутні → `app.listen` викликається
3. Порт береться з `process.env.PORT`

---

## Критерії готовності

- [x] Тести оновлені/додані, зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
