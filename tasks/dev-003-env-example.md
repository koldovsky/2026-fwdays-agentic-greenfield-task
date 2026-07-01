# dev-003-env-example.md

## Контекст

dev-001 виконано. Секрети проєкту не мають потрапляти в git — вони зберігаються лише в `.env`.  
`.env.example` — шаблон без реальних значень, що документує всі обов'язкові та опціональні змінні.

---

## Що зробити

Створити `.env.example` у корені проєкту з усіма змінними, згрупованими за модулем.

Обов'язкові змінні (без них застосунок не стартує — перевіряється в `index.js`):
- `SIEBEL_BASE_URL`, `SIEBEL_USERNAME`, `SIEBEL_PASSWORD`
- `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`

Опціональні (є fallback у `config/default.js`):
- `SIEBEL_CONCURRENCY` → default `3`
- `JIRA_ISSUE_TYPE` → default `Task`
- `POLL_INTERVAL_CRON` → default `*/15 * * * *`
- `PORT` → default `5000`
- `LOG_LEVEL` → default `info`

---

## Критерії готовності (Definition of Done)

- [x] Файл `.env.example` є в корені проєкту
- [x] Всі 6 обов'язкових змінних присутні з порожніми значеннями
- [x] Всі опціональні змінні присутні з дефолтними значеннями у коментарі
- [x] Реальних секретів у файлі немає

---

## Приклади / Референси

- `CLAUDE.md` → секція "Конфігурація та змінні середовища"
- `docs/skills/jira-publishing.md` → перелік JIRA_* змінних
- `docs/rules/external-apis.md` → `SIEBEL_CONCURRENCY`
- `docs/skills/logging.md` → `LOG_LEVEL`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
