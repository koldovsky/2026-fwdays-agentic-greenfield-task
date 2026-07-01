# dev-002-config-setup.md

## Контекст

dev-001 виконано: є `package.json` з `dotenv`, структура директорій готова.  
Конфігурація проєкту розділена на два джерела (з CLAUDE.md):

- **`config.json`** (корінь, в репозиторії) — статичні не-секретні параметри: AI модель, RAG corpus, thinkingBudget тощо.
- **`config/default.js`** — єдина точка отримання конфігурації в коді: зчитує `config.json` + `process.env`, експортує об'єднаний об'єкт.

Жодні секрети (`baseUrl`, токени, паролі) не зберігаються в `config.json` — вони беруться тільки з `.env` через `process.env`.

---

## Що зробити

### 1. Створити `config.json` у корені проєкту

Файл містить лише статичні не-секретні параметри (потрапляє в git):

```json
{
  "port": 5000,
  "siebel": {
    "concurrency": 3
  },
  "ai": {
    "vertexAi": {
      "location": "europe-central2"
    },
    "model": "gemini-2.5-flash",
    "generationConfig": {
      "maxOutputTokens": 65535,
      "temperature": 1,
      "topP": 0.95,
      "safetySettings": [
        { "category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "OFF" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF" },
        { "category": "HARM_CATEGORY_HARASSMENT",        "threshold": "OFF" }
      ]
    },
    "systemInstructionFile": "instructions.md",
    "thinkingConfig": {
      "thinkingBudget": 8192
    },
    "tools": [
      {
        "retrieval": {
          "vertexRagStore": {
            "ragResources": [
              {
                "ragCorpus": "projects/areonsbl/locations/europe-central2/ragCorpora/6917529027641081856"
              }
            ]
          }
        }
      }
    ]
  }
}
```

### 2. Створити `config/default.js`

Модуль:
- Завантажує `.env` через `dotenv`
- Читає `config.json`
- Експортує єдиний об'єкт `config` для всього застосунку

```js
'use strict';

require('dotenv').config();
const path = require('path');

const rawConfig = require(path.join(__dirname, '../config.json'));

const config = {
  port: parseInt(process.env.PORT || String(rawConfig.port || 5000)),
  poll: {
    cronExpression: process.env.POLL_INTERVAL_CRON || '*/15 * * * *',
  },
  siebel: {
    concurrency: parseInt(process.env.SIEBEL_CONCURRENCY || String(rawConfig.siebel?.concurrency || 3)),
  },
  jira: {
    issueType: process.env.JIRA_ISSUE_TYPE || 'Task',
  },
  ai: rawConfig.ai,
};

module.exports = config;
```

> Секрети (`SIEBEL_BASE_URL`, `SIEBEL_USERNAME`, `SIEBEL_PASSWORD`, `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`) не входять в об'єкт `config` — вони читаються через `process.env` безпосередньо у відповідних `client.js` модулях.

### 3. Видалити `.gitkeep` з `config/`

Після створення `default.js` файл `config/.gitkeep` можна видалити.

---

## Критерії готовності (Definition of Done)

- [x] `config.json` є в корені, не містить секретів, валідний JSON
- [x] `config/default.js` експортує об'єкт з полями `port`, `poll`, `siebel`, `jira`, `ai`
- [x] `require('dotenv').config()` викликається в `config/default.js`
- [x] `config.ai` містить всі поля з `config.json` (model, generationConfig, tools, thinkingConfig)
- [x] `siebel.concurrency` береться з `SIEBEL_CONCURRENCY` env або fallback `3`
- [x] `poll.cronExpression` береться з `POLL_INTERVAL_CRON` env або fallback `*/15 * * * *`
- [x] Модуль підключається без помилок: `node -e "require('./config/default.js')"`

---

## Приклади / Референси

- `CLAUDE.md` → секція "Конфігурація та змінні середовища"
- `docs/skills/vertex-ai-prompt.md` → використання `config.ai` у `reviewBusinessService`
- `docs/rules/external-apis.md` → `SIEBEL_CONCURRENCY`
- `docs/rules/general.md` → "Ніяких магічних чисел — константи в `config/default.js`"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
