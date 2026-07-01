# CLAUDE.md

## Проєкт
Автоматизований інструмент рев'ю коду Siebel CRM.
Додаток periodically отримує змінені об'єкти з Siebel REST API, передає Business Service скрипти на аналіз до AI-провайдера (Vertex AI або Claude API) та публікує результат рев'ю в Jira Datacenter 9.

## Ролі агентів
Дивись → [AGENTS.md](./AGENTS.md)

## Скіли (як робити конкретні речі)
| Скіл | Файл |
|------|------|
| HTTP-запити до REST API | [docs/skills/http-rest-api.md](./docs/skills/http-rest-api.md) |
| Робота з JSON state-файлом | [docs/skills/json-state-file.md](./docs/skills/json-state-file.md) |
| Формування промпту для Vertex AI | [docs/skills/vertex-ai-prompt.md](./docs/skills/vertex-ai-prompt.md) |
| Формування промпту для Claude API | [docs/skills/claude-ai-prompt.md](./docs/skills/claude-ai-prompt.md) |
| Публікація в Jira | [docs/skills/jira-publishing.md](./docs/skills/jira-publishing.md) |
| Логування (Winston) | [docs/skills/logging.md](./docs/skills/logging.md) |
| Авторизація webhook | [docs/skills/webhook-auth.md](./docs/skills/webhook-auth.md) |

## Правила (що завжди / ніколи)
| Правила | Файл |
|---------|------|
| Загальні правила проєкту | [docs/rules/general.md](./docs/rules/general.md) |
| Робота із зовнішніми API | [docs/rules/external-apis.md](./docs/rules/external-apis.md) |

## Архітектурні рішення
Чому прийняті ті чи інші рішення → [DECISIONS.md](./DECISIONS.md)

## Стек
- Runtime: Node.js (JavaScript, CommonJS або ESM — визначається в процесі)
- HTTP-клієнт: axios або node-fetch (не змішувати)
- Планувальник: node-cron
- AI: два провайдери (перемикаються через `AI_PROVIDER` env):
  - Vertex AI — `@google/genai` (за замовчуванням)
  - Claude API — `@anthropic-ai/sdk`
- Jira: REST API Datacenter 9, авторизація через Bearer токен (Personal Access Token)
- Siebel: REST API, Basic Auth
- Зберігання стану: JSON-файл (workspaces-state.json)

## Структура проєкту
```
src/
  siebel/
    client.js          # HTTP-клієнт Siebel REST API
    workspaces.js      # отримання воркспейсів та змінених об'єктів
    services.js        # завантаження скриптів Business Service
  ai/
    selector.js        # вибір провайдера на основі AI_PROVIDER
  vertex/
    client.js          # клієнт Google Vertex AI
    reviewer.js        # формування промпту та виклик рев'ю
  claude/
    reviewer.js        # Claude API reviewer з підтримкою caching
    templates/
      no-cache.js      # шаблон виклику без кешу
      ephemeral-cache.js  # шаблон з 5-хвилинним кешем
      extended-cache.js   # шаблон з 1-годинним кешем
  jira/
    client.js          # HTTP-клієнт Jira REST API
    issues.js          # публікація результату рев'ю (створення задачі або sub-task)
  state/
    store.js           # читання/запис workspaces-state.json (тільки Cron flow)
  api/
    middleware/
      auth.js          # Bearer token validation
      validate.js      # validation middleware
    webhook.js         # логіка обробки webhook запиту
    server.js          # Express додаток
  scheduler.js         # node-cron: запуск polling та обробки (Cron flow)
  processor.js         # спільна логіка обробки воркспейсу (обидва flows)
  index.js             # точка входу: запускає і cron і express
config/
  default.js           # всі параметри (інтервали, URL, ключі через env)
data/
  workspaces-state.json  # стан воркспейсів (gitignore!)
tasks/                 # задачі для агента (SDD)
docs/                  # специфікації, приклади відповідей API
instructions.md        # системна інструкція для AI (обидва провайдери)
.env                   # секрети (gitignore!)
.env.example           # шаблон без реальних значень
```

## Конфігурація та змінні середовища

Два джерела конфігурації:

### config.json (не секретні параметри, в репозиторії)
```json
{
  "port": 5000,
  "ai": {
    "vertex": {
      "location": "europe-central2",
      "model": "gemini-2.5-flash",
      "generationConfig": { "maxOutputTokens": 65535, "temperature": 1, "topP": 0.95 },
      "systemInstructionFile": "instructions.md",
      "thinkingConfig": { "thinkingBudget": 8192 },
      "tools": [...]
    },
    "claude": {
      "model": "claude-sonnet-4-6",
      "maxTokens": 16000,
      "cacheMode": "ephemeral",
      "systemInstructionFile": "instructions.md"
    }
  }
}
```

### .env (секрети, в .gitignore)
```
SIEBEL_BASE_URL=
SIEBEL_USERNAME=
SIEBEL_PASSWORD=
JIRA_BASE_URL=https://jira.bankit.com.ua
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
JIRA_ISSUE_TYPE=Task
JIRA_FIELD_REVIEW_SCORE=customfield_10500   # ID поля для оцінки 0-100
JIRA_FIELD_REVIEW_RESULT=customfield_10501  # ID поля для статусу green/yellow/red
CRON_ENABLED=false              # true = увімкнути резервний Cron flow
POLL_INTERVAL_CRON=*/15 * * * *
WEBHOOK_API_TOKEN=
WEBHOOK_PORT=3000
PORT=5000
AI_PROVIDER=vertex              # vertex | claude
ANTHROPIC_API_KEY=              # обов'язковий при AI_PROVIDER=claude
```

### service-account.json (в .gitignore, в корені проєкту)
Google service account для Vertex AI. `PROJECT_ID` береться звідси автоматично.
Шлях задається через `process.env.GOOGLE_APPLICATION_CREDENTIALS`.
Потрібний тільки при `AI_PROVIDER=vertex`.

## Точки входу
Два незалежних тригери що ведуть на спільний процес обробки. Детально — див. `docs/SPEC.md`.

| Точка входу | Файл | Статус | Опис |
|-------------|------|--------|------|
| Webhook | `src/api/server.js` | ✅ **Основна** | Приймає POST з Jira, обробляє конкретний воркспейс |
| Cron | `src/scheduler.js` | ⏸ Резервна (`CRON_ENABLED=true`) | Periodically опитує всі воркспейси |

## Алгоритм роботи (головний потік)

### 1. Polling (scheduler → workspaces.js)
- За розкладом (cron) викликати Siebel REST API
- Отримати всі воркспейси та змінені об'єкти
- Записати/оновити `workspaces-state.json`, додавши поле `processed: false` для нових

### 2. Обробка (processor.js)
- Зчитати всі записи з `workspaces-state.json` де `processed: false`
- Якщо воркспейс не містить об'єктів типу `Business Service` → одразу `processed: true`
- Для кожного Business Service → GET Siebel REST API (workspace + service name)
- Зібрати всі скрипти по воркспейсу: `{ parentName, scripts: [...] }`

### 3. Рев'ю (ai/selector.js → reviewer.js)
- Визначити провайдера через `AI_PROVIDER`
- Передати зібрану структуру до Vertex AI або Claude API
- Отримати `{ reviewText, reviewScore, reviewResult }`

### 4. Публікація (issues.js)
- Відправити `reviewText` як description задачі
- Якщо задані `JIRA_FIELD_REVIEW_SCORE` / `JIRA_FIELD_REVIEW_RESULT` — заповнити кастомні поля
- Авторизація: `Bearer <JIRA_API_TOKEN>`
- Після успішної публікації → `processed: true` у state-файлі

## Конвенції коду
- Тільки `const`/`let`, заборонено `var`
- Async/await скрізь, без `.then()` chains
- Кожна функція має JSDoc з описом параметрів та повернення
- Обробка помилок: `try/catch` у кожному модулі, логування через Winston
- Заборонено `console.log` у фінальному коді (тільки під час розробки)
- Назви функцій — дієслово + іменник: `fetchWorkspaces`, `postReviewComment`
- Один файл — одна відповідальність

## Заборони
- Не зберігати токени, паролі, URL у коді — тільки через `process.env`
- Не мутувати `workspaces-state.json` без допоміжних функцій з `store.js`
- Не робити прямих HTTP-викликів поза відповідними client.js файлами
- Не пропускати обробку помилок у викликах зовнішніх API
- Не хардкодити вибір AI-провайдера — тільки через `AI_PROVIDER`

## Чекпоінти (запитай підтвердження перед)
- Зміна структури `workspaces-state.json`
- Додавання нової npm-залежності
- Зміна формату даних, що передаються у AI або Jira
- Будь-яка зміна в `scheduler.js`
- Зміна переліку обов'язкових env-змінних

## Початок роботи
1. Прочитай цей файл
2. Прочитай `AGENTS.md`
3. Відкрий `tasks/TODO.md` — там поточна черга задач
4. Не починай реалізацію без прочитання відповідного task-файлу
