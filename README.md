# siebel-review

Автоматизований інструмент рев'ю коду Siebel CRM.

Отримує змінені Business Service об'єкти з Siebel REST API, передає скрипти на аналіз до Google Vertex AI (Gemini) та публікує результат рев'ю як задачу в Jira Datacenter 9.

## Вимоги

- Node.js 18+
- Google service account з доступом до Vertex AI
- Доступ до Siebel REST API
- Jira Datacenter 9 з Personal Access Token

## Встановлення

```bash
npm install
```

Скопіюй `.env.example` → `.env` і заповни всі змінні:

```bash
cp .env.example .env
```

Поклади `service-account.json` у корінь проєкту (Google service account для Vertex AI).

## Змінні середовища

| Змінна | Опис |
|--------|------|
| `SIEBEL_BASE_URL` | Базовий URL Siebel REST API |
| `SIEBEL_USERNAME` | Логін для Basic Auth |
| `SIEBEL_PASSWORD` | Пароль для Basic Auth |
| `JIRA_BASE_URL` | Базовий URL Jira (напр. `https://jira.example.com`) |
| `JIRA_API_TOKEN` | Personal Access Token Jira |
| `JIRA_PROJECT_KEY` | Ключ проєкту для створення задач (напр. `DEV`) |
| `WEBHOOK_API_TOKEN` | Bearer токен для захисту `POST /api/webhook/jira` |
| `CRON_ENABLED` | `true` — вмикає cron-polling; `false` (за замовчуванням) — вимкнено |
| `POLL_INTERVAL_CRON` | Розклад polling у форматі cron (за замовчуванням `*/15 * * * *`) |
| `LOG_LEVEL` | Рівень логування: `info` (за замовчуванням) або `debug` |
| `PORT` | Порт HTTP-сервера (за замовчуванням `5000`) |

## Запуск

### Продакшн (cron-режим)

Запускає scheduler за розкладом `POLL_INTERVAL_CRON`. Кожен тік: polling Siebel → збереження стану → обробка pending воркспейсів.

```bash
node src/index.js
```

### Разовий запуск — тільки обробка

Обробляє наявні `processed: false` записи з `data/workspaces-state.json` без звернення до Siebel polling:

```bash
node run-once.js
```

### Разовий запуск — повний цикл

Повний цикл одноразово: polling Siebel → збереження стану → обробка:

```bash
node run-once.js --full
```

## Webhook

Jira Automation викликає `POST /api/webhook/jira` з тілом:

```json
{
  "jiraIssueKey": "SBL-123",
  "user": "MMOROZOV",
  "workspaceName": "dev_mmorozov_20260624_fixkyivstar"
}
```

Заголовок: `Authorization: Bearer <WEBHOOK_API_TOKEN>`

Відповідь приходить негайно (`errorCode: 1` — взято в роботу), результат рев'ю публікується як Sub-task до `jiraIssueKey`.

## Тести

```bash
npm test
```

## Логи

| Файл | Вміст |
|------|-------|
| `logs/app.log` | Загальний лог (ротація 10MB × 5) |
| `logs/error.log` | Тільки помилки |
| `logs/workspaces/YYYY-MM-DD_HH-MM-SS_<name>.log` | Детальний лог по кожному воркспейсу |

При `LOG_LEVEL=debug` в лог пишуться всі HTTP-запити та відповіді (метод, URL, тіло, час виконання).
