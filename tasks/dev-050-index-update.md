# dev-050-index-update.md

## Контекст

`src/index.js` потрібно оновити: додати запуск Express сервера і `WEBHOOK_API_TOKEN` до обов'язкових змінних.

---

## Що зробити

Змінити `src/index.js`:

```js
const REQUIRED_ENV = [
  'SIEBEL_BASE_URL', 'SIEBEL_USERNAME', 'SIEBEL_PASSWORD',
  'JIRA_BASE_URL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
  'WEBHOOK_API_TOKEN',  // ← новий
];

// після валідації env і startScheduler:
const { createServer } = require('./api/server');
const port = process.env.PORT || config.port || 5000;
const app = createServer(config);
app.listen(port, () => {
  logger.info('server.started', { port });
});
```

---

## Критерії готовності

- [x] `WEBHOOK_API_TOKEN` додано до `REQUIRED_ENV`
- [x] Express сервер запускається після валідації env
- [x] Порт береться з `process.env.PORT` або `config.port` або 5000

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
