# dev-035-express-setup.md

## Контекст

Додаємо webhook endpoint — потрібен Express сервер.
Також треба нові змінні середовища: `WEBHOOK_API_TOKEN` (Bearer для захисту webhook) і `CRON_ENABLED` (увімкнення/вимкнення cron).

---

## Що зробити

1. Додати `express` до `dependencies` у `package.json`.
2. Оновити `.env.example`:
   ```
   WEBHOOK_API_TOKEN=    # Bearer токен для захисту POST /api/webhook/jira
   CRON_ENABLED=false    # true — вмикає cron-polling; false (за замовчуванням) — вимкнено
   ```

---

## Критерії готовності

- [x] `express` додано до `package.json`
- [x] `.env.example` містить `WEBHOOK_API_TOKEN` і `CRON_ENABLED=false`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
