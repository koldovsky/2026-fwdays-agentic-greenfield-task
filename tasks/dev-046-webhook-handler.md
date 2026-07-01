# dev-046-webhook-handler.md

## Контекст

Основна логіка webhook-обробника. Відповідає негайно (Jira automation timeout ~30с),
обробку запускає асинхронно через `setImmediate`.

Референс: `docs/SPEC.md` — розділ "3. Webhook API", "Логіка обробки webhook".

---

## Що зробити

Створити `src/api/webhook.js`:

```js
'use strict';

const logger = require('../utils/logger');
const { fetchWorkspaces } = require('../siebel/workspaces');
const { processWorkspaceWebhook } = require('../processor');

async function handleJiraWebhook(req, res, config) {
  const { jiraIssueKey, user, workspaceName } = req.body;

  let workspaces;
  try {
    workspaces = await fetchWorkspaces(workspaceName);
  } catch (err) {
    logger.error('webhook.siebel.error', { error: err.message, workspaceName });
    return res.status(500).json({ errorCode: '500', errorMessage: 'Внутрішня помилка сервера' });
  }

  // Знайти воркспейс з відповідним ім'ям
  const workspace = workspaces.find(ws => ws.name === workspaceName);

  if (!workspace) {
    return res.json({ errorCode: '1000', errorMessage: 'Воркспейс не знайдено' });
  }

  if (!workspace.businessServices || workspace.businessServices.length === 0) {
    return res.json({ errorCode: '0', errorMessage: 'Відсутні об\'єкти для аналізу' });
  }

  // Є Business Service — відповідаємо негайно, обробку запускаємо асинхронно
  res.json({ errorCode: '1', errorMessage: 'Взято в роботу' });

  setImmediate(() => {
    processWorkspaceWebhook({ workspaceName, jiraIssueKey, user }, config)
      .catch(err => logger.error('webhook.processing.error', { error: err.message, workspaceName, jiraIssueKey }));
  });
}

module.exports = { handleJiraWebhook };
```

---

## Критерії готовності

- [x] `src/api/webhook.js` створено
- [x] Воркспейс не знайдено → `{ errorCode: '1000' }`
- [x] Немає BS → `{ errorCode: '0' }`
- [x] Є BS → `{ errorCode: '1' }` + `setImmediate` запускає обробку
- [x] Помилка Siebel → 500
- [x] `res.json` викликається до `setImmediate`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
