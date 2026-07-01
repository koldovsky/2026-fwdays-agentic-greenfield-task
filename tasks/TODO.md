# TODO — Siebel Review: черга задач

Порядок: зліва направо по колонках = пріоритет виконання.
Статуси: `TODO` → `IN PROGRESS` → `DONE`

---

## Інфраструктура

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 001 | dev | DONE | Ініціалізувати `package.json`: додати залежності `axios`, `node-cron`, `@google/genai`, `winston`, `dotenv` | — |
| 002 | dev | DONE | Створити `config/default.js` з усіма не-секретними параметрами (cron, AI model, concurrency) | dev-001 |
| 003 | dev | DONE | Створити `.env.example` з усіма обов'язковими змінними без реальних значень | dev-001 |
| 004 | dev | DONE | Створити `.gitignore`: виключити `.env`, `data/`, `logs/`, `service-account.json` | dev-001 |
| 005 | dev | DONE | Реалізувати `src/utils/logger.js` — загальний Winston логер з `app.log` і `error.log` | dev-001 |
| 006 | dev | DONE | Реалізувати `src/utils/workspaceLogger.js` — per-workspace Winston логер у `logs/workspaces/YYYY-MM-DD_<name>.log` | dev-005 |

---

## State Management

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 007 | dev | DONE | Реалізувати `src/state/store.js`: `readState`, `writeState`, `updateWorkspace`, `getPendingWorkspaces` | dev-001 |
| 008 | qa | DONE | Перевірити `store.js`: CRUD операції, fallback на `{ workspaces: [] }` при відсутньому файлі | dev-007 |

---

## Siebel: клієнт і polling

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 009 | dev | DONE | Реалізувати `src/siebel/client.js`: `apiCall`, `buildSiebelHeaders` (Basic Auth) | dev-001, dev-005 |
| 010 | dev | DONE | Реалізувати `src/siebel/workspaces.js`: `fetchWorkspaces` (POST getWorkspaceObjects), `normalizeObjects`, `parseWorkspacesResponse` | dev-009 |
| 011 | qa | DONE | Перевірити `normalizeObjects` для трьох варіантів поля `Object`: відсутнє / одиночний об'єкт / масив | dev-010 |
| 012 | qa | DONE | Перевірити `parseWorkspacesResponse`: фільтрація лише `Business Service`, дедуплікація по `ObjName`, `errorCode !== '0'` кидає помилку | dev-010 |

---

## Siebel: завантаження скриптів

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 013 | dev | DONE | Реалізувати `src/siebel/services.js`: `buildScriptsUrl` (екранування пробілів у URL) | dev-009 |
| 014 | dev | DONE | Реалізувати `fetchAllServiceScripts` у `services.js` — цикл пагінації `?page=N&pagesize=20` до `lastpage === 'true'` | dev-013 |
| 015 | dev | DONE | Реалізувати `transformToReviewPayload` у `services.js`: фільтрація `Inactive !== 'Y'`, маппінг `{ name, body }` | dev-014 |
| 016 | qa | DONE | Перевірити `fetchAllServiceScripts`: пагінація (декілька сторінок), фільтрація неактивних, порожня відповідь | dev-014, dev-015 |

---

## Vertex AI

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 017 | dev | DONE | Створити `instructions.md` у корені — системна інструкція про Siebel eScript, антипатерни, специфіку платформи | — |
| 018 | dev | DONE | Реалізувати `src/vertex/reviewer.js`: `buildPrompt`, `reviewBusinessService` (GoogleGenAI з Vertex AI режимом через service-account.json) | dev-001, dev-002, dev-017 |
| 019 | qa | DONE | Перевірити `buildPrompt`: структура промпту, всі секції (назва сервісу, скрипти, що перевірити), повернення `null` для порожнього `scripts` | dev-018 |
| 020 | qa | DONE | Перевірити `reviewBusinessService`: зчитує `PROJECT_ID` з `service-account.json`, передає `safetySettings`/`thinkingConfig` з конфігу | dev-018 |

---

## Jira

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 021 | dev | DONE | Реалізувати `src/jira/client.js`: `buildJiraHeaders` (Bearer + `X-Atlassian-Token: no-check`) | dev-001, dev-005 |
| 022 | dev | DONE | Реалізувати `src/jira/issues.js`: `createReviewIssue` (POST `/rest/api/2/issue`), `formatJiraComment` (Markdown→Jira Wiki Markup) | dev-021 |
| 023 | qa | DONE | Перевірити `formatJiraComment`: конвертація `##`→`h2.`, `**text**`→`*text*`, ` `` `→`{{}}`, code blocks→`{code}` | dev-022 |
| 024 | qa | DONE | Перевірити захист від дублювання: якщо в state є `jiraIssueKey` — не створювати нову задачу | dev-022, dev-007 |

---

## Ядро: processor

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 025 | dev | DONE | Реалізувати `src/processor.js`: `processWorkspace` — повний цикл Siebel→Vertex→Jira→state для одного воркспейсу | dev-007, dev-010, dev-015, dev-018, dev-022 |
| 026 | dev | DONE | Реалізувати `processPendingWorkspaces` у `processor.js`: батчинг по `SIEBEL_CONCURRENCY`, `Promise.allSettled`, помилка одного не зупиняє інших | dev-025, dev-006 |
| 027 | qa | DONE | Перевірити ізоляцію помилок у `processPendingWorkspaces`: один воркспейс кидає виняток — решта обробляються, стан `error` записується | dev-026 |
| 028 | qa | DONE | Перевірити що воркспейс без `Business Service` одразу отримує `processed: true` без виклику Vertex і Jira | dev-025 |

---

## Ядро: scheduler і точка входу

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 029 | dev | DONE | Реалізувати `src/scheduler.js`: node-cron за `POLL_INTERVAL_CRON`, блокування паралельного запуску через прапор `isRunning` | dev-026, dev-010, dev-007 |
| 030 | qa | DONE | Перевірити `scheduler.js`: повторний тик не запускається якщо попередній ще виконується (`isRunning === true`) | dev-029 |
| 031 | dev | DONE | Реалізувати `src/index.js`: валідація обов'язкових env змінних, завантаження конфігу, старт scheduler, `process.exit(1)` при відсутніх змінних | dev-029, dev-002 |
| 032 | qa | DONE | Перевірити `index.js`: відсутня будь-яка зі змінних `SIEBEL_BASE_URL`, `SIEBEL_USERNAME`, `SIEBEL_PASSWORD`, `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` → process.exit(1) з переліком відсутніх | dev-031 |

---

## Фінальна інтеграційна перевірка

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 033 | qa | DONE | Зібрати підсумковий чекліст безпеки: токени не в коді, `data/` і `logs/` в .gitignore, `.env` не закомічений | dev-001 – dev-031 |
| 034 | qa | DONE | Перевірити повний pipeline на прикладі з `docs/get-workspace-objects.json`: від парсингу відповіді Siebel до правильної структури state-файлу | dev-026 |

---

## Порядок виконання (граф залежностей)

```
dev-001 (deps)
  ├── dev-002 (config) ──────────────────────── dev-031 (index)
  ├── dev-003 (.env.example)
  ├── dev-004 (.gitignore)
  ├── dev-005 (logger) ──── dev-006 (wsLogger)
  │     └── dev-009 (siebel client)
  │           ├── dev-010 (workspaces) ──── qa-011, qa-012
  │           └── dev-013 (buildScriptsUrl)
  │                 └── dev-014 (fetchAll) ── dev-015 (transform) ── qa-016
  └── dev-007 (store) ─── qa-008
        │
        └── dev-025 (processWorkspace)
              ├── dev-010
              ├── dev-015
              ├── dev-018 (reviewer) ─── dev-017 (instructions) ── qa-019, qa-020
              └── dev-022 (jira issues) ── dev-021 (jira client) ── qa-023, qa-024
                    └── dev-026 (processPending) ── qa-027, qa-028
                          └── dev-029 (scheduler) ── qa-030
                                └── dev-031 (index) ── qa-032
                                      └── qa-033, qa-034
```

---

## Webhook (нова функціональність)

### Інфраструктура

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 035 | dev | DONE | Додати `express` до `package.json`, оновити `.env.example`: `WEBHOOK_API_TOKEN`, `CRON_ENABLED=false` | — |

### Cron: опціональний режим

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 036 | dev | DONE | Змінити `scheduler.js`: `startScheduler` перевіряє `CRON_ENABLED !== 'true'` → не запускає cron, лог `scheduler.disabled` | dev-029 |
| 037 | qa | DONE | Перевірити `scheduler.js`: CRON_ENABLED відсутній/false → cron не запускається; true → запускається | dev-036 |

### Siebel: фільтрований запит

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 038 | dev | DONE | Розширити `fetchWorkspaces(workspaceName?)` — з аргументом передає `{ workspaceName }` в body; без — `{}` (Cron flow без змін) | dev-010 |
| 039 | qa | DONE | Перевірити `fetchWorkspaces` з фільтром і без | dev-038 |

### Jira: Sub-task

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 040 | dev | DONE | Додати `createSubtask` до `jira/issues.js`: `issuetype=Sub-task`, `parent.key`, `assignee.name`, без `project.key` | dev-022 |
| 041 | qa | DONE | Перевірити `createSubtask`: тіло запиту, відсутність `project.key`, повернення `{ key }` | dev-040 |

### Processor: webhook flow

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 042 | dev | DONE | Додати `processWorkspaceWebhook({ workspaceName, jiraIssueKey, user }, config)` до `processor.js`: не пише в state, використовує `createSubtask`, логує з `source: webhook` | dev-025, dev-040, dev-038 |
| 043 | qa | DONE | Перевірити `processWorkspaceWebhook`: `createSubtask` викликається, `updateWorkspace` — ні | dev-042 |

### API шар

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 044 | dev | DONE | Створити `src/api/middleware/auth.js`: Bearer токен `WEBHOOK_API_TOKEN`, 401 при невалідному | dev-035 |
| 045 | dev | DONE | Створити `src/api/middleware/validate.js`: перевірка `jiraIssueKey`, `user`, `workspaceName`, 400 при відсутніх | dev-035 |
| 046 | dev | DONE | Створити `src/api/webhook.js`: логіка хендлера — негайна відповідь + `setImmediate` для async обробки | dev-042, dev-038 |
| 047 | dev | DONE | Створити `src/api/server.js`: Express app, `POST /api/webhook/jira` з middleware chain | dev-044, dev-045, dev-046 |
| 048 | qa | DONE | Тести для `auth.js` і `validate.js` middleware | dev-044, dev-045 |
| 049 | qa | DONE | Тести для `webhook.js` хендлера (всі 5 сценаріїв відповіді зі SPEC) | dev-046 |

### Інтеграція

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 050 | dev | DONE | Оновити `src/index.js`: додати `WEBHOOK_API_TOKEN` до `REQUIRED_ENV`, запустити Express сервер | dev-047, dev-036 |
| 051 | qa | DONE | Оновити тести `index.test.js`: відсутній `WEBHOOK_API_TOKEN` → `process.exit(1)`, сервер запускається | dev-050 |

### Порядок виконання (webhook граф)

```
dev-035 (express + env)
  ├── dev-036 (scheduler CRON_ENABLED) ── qa-037
  ├── dev-038 (fetchWorkspaces filter) ── qa-039
  ├── dev-040 (createSubtask)           ── qa-041
  │
  └── dev-042 (processWorkspaceWebhook) ── qa-043
        ├── dev-038
        └── dev-040
              │
              ├── dev-044 (auth middleware)
              ├── dev-045 (validate middleware)
              └── dev-046 (webhook handler) ── qa-049
                    │
                    └── dev-047 (server.js)
                          └── dev-050 (index.js update) ── qa-051
                                qa-048 (middleware tests)
```

---

## Claude API + structured response (нова функціональність)

### Setup та конфігурація

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 052 | dev | DONE | Додати `@anthropic-ai/sdk` до `package.json`, оновити `.env.example` (`AI_PROVIDER`, `ANTHROPIC_API_KEY`, `JIRA_FIELD_*`), оновити `config.json` (claude секція) | — |

### AI Selector

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 053 | dev | DONE | Реалізувати `src/ai/selector.js` — вибір провайдера на основі `AI_PROVIDER` env | dev-052 |

### Claude Reviewer

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 054 | dev | DONE | Реалізувати 3 template-файли у `src/claude/templates/`: `no-cache.js`, `ephemeral-cache.js`, `extended-cache.js` | dev-052 |
| 055 | dev | DONE | Реалізувати `src/claude/reviewer.js`: `reviewBusinessService`, `buildPrompt`, `parseReviewResponse` | dev-053, dev-054 |
| 060 | qa | DONE | Тести для `claude/reviewer.js`: `parseReviewResponse`, `buildPrompt`, вибір шаблону по `cacheMode`, виклик API | dev-055 |

### Vertex Reviewer — structured response

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 056 | dev | DONE | Оновити `src/vertex/reviewer.js`: новий JSON prompt-формат, `parseReviewResponse`, повертає `{ reviewText, reviewScore, reviewResult }` | dev-053 |
| 061 | qa | DONE | Оновити `tests/reviewer.test.js` під новий формат: `ai.vertex` config, JSON-відповідь | dev-056 |

### Processor — selector + structured response

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 057 | dev | DONE | Оновити `src/processor.js`: використовувати `ai/selector.js`, обробляти `{ reviewText, reviewScore, reviewResult }` від AI | dev-053, dev-056 |
| 063 | qa | DONE | Оновити `tests/processWorkspace.test.js` та `tests/processWorkspaceWebhook.test.js` (mock selector замість vertex) | dev-057 |

### Jira — кастомні поля

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 058 | dev | DONE | Оновити `src/jira/issues.js`: `createReviewIssue` та `createSubtask` приймають `reviewScore`/`reviewResult`, записують у `JIRA_FIELD_*` | dev-057 |
| 062 | qa | DONE | Оновити `tests/createReviewIssue.test.js` для нових полів | dev-058 |

### index.js — ANTHROPIC_API_KEY

| ID | Префікс | Статус | Опис | Залежності |
|----|---------|--------|------|------------|
| 059 | dev | DONE | Оновити `src/index.js`: перевіряти `ANTHROPIC_API_KEY` якщо `AI_PROVIDER=claude` | dev-052 |
| 063 | qa | DONE | Оновити `tests/index.test.js`: тести для `AI_PROVIDER=claude` без ключа → exit(1) | dev-059 |
