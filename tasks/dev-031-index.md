# dev-031-index.md

## Контекст

Фінальна точка входу. Валідує env, стартує scheduler.
Список обов'язкових змінних з `docs/skills/jira-publishing.md`.

---

## Що зробити

Створити `src/index.js`.

```js
const REQUIRED_ENV = [
  'SIEBEL_BASE_URL', 'SIEBEL_USERNAME', 'SIEBEL_PASSWORD',
  'JIRA_BASE_URL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
];

const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  logger.error('Missing required environment variables', { missing });
  process.exit(1);
}

logger.info('Starting Siebel Review Agent', { cron: config.poll.cronExpression });
startScheduler(config);
```

**Важливо:** `process.exit(1)` — без проміжної обробки, одразу завершує процес.

---

## Критерії готовності (Definition of Done)

- [x] `src/index.js` створено
- [x] Відсутня будь-яка зі змінних REQUIRED_ENV → `process.exit(1)`
- [x] Всі змінні є → `startScheduler(config)` викликається
- [x] Жодних токенів/URL у коді — тільки через `process.env`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
