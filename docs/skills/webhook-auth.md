# Skill: Авторизація вхідного Webhook

## Призначення
Захист `POST /api/webhook/jira` від неавторизованих викликів через Bearer токен.

## Middleware (src/webhook/middleware.js)

```js
const logger = require('../utils/logger');

/**
 * Перевіряє Bearer токен вхідного webhook запиту
 */
function webhookAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || token !== process.env.WEBHOOK_API_TOKEN) {
    logger.warn('webhook.auth.failed', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      errorCode: '401',
      errorMessage: 'Unauthorized',
    });
  }

  next();
}

/**
 * Перевіряє наявність обов'язкових полів тіла запиту
 */
function webhookValidationMiddleware(req, res, next) {
  const { jiraIssueKey, user, workspaceName } = req.body;
  const missing = [];

  if (!jiraIssueKey) missing.push('jiraIssueKey');
  if (!user)         missing.push('user');
  if (!workspaceName) missing.push('workspaceName');

  if (missing.length > 0) {
    return res.status(400).json({
      errorCode: '400',
      errorMessage: `Відсутні обов'язкові поля: ${missing.join(', ')}`,
    });
  }

  next();
}

module.exports = { webhookAuthMiddleware, webhookValidationMiddleware };
```

## Роутер (src/webhook/router.js)

```js
const express = require('express');
const { webhookAuthMiddleware, webhookValidationMiddleware } = require('./middleware');
const { handleJiraWebhook } = require('./handler');

const router = express.Router();

router.post(
  '/api/webhook/jira',
  webhookAuthMiddleware,
  webhookValidationMiddleware,
  handleJiraWebhook
);

module.exports = router;
```

## Handler (src/webhook/handler.js)

```js
const logger = require('../utils/logger');
const { createWorkspaceLogger } = require('../utils/workspaceLogger');
const { fetchWorkspaceByName } = require('../siebel/workspaces');
const { processWorkspaceWebhook } = require('../processor');

/**
 * Обробляє POST /api/webhook/jira
 */
async function handleJiraWebhook(req, res) {
  const { jiraIssueKey, user, workspaceName } = req.body;

  logger.info('webhook.received', { jiraIssueKey, user, workspaceName });

  let workspace;
  try {
    workspace = await fetchWorkspaceByName(workspaceName);
  } catch (err) {
    logger.error('webhook.siebel.error', { workspaceName, error: err.message });
    return res.status(500).json({
      errorCode: '500',
      errorMessage: 'Внутрішня помилка сервера',
    });
  }

  // Воркспейс не знайдено
  if (!workspace) {
    logger.warn('webhook.workspace.notfound', { workspaceName });
    return res.json({ errorCode: '1000', errorMessage: 'Воркспейс не знайдено' });
  }

  // Немає Business Service
  if (workspace.businessServices.length === 0) {
    logger.info('webhook.no.business.services', { workspaceName });
    return res.json({ errorCode: '0', errorMessage: 'Відсутні об\'єкти для аналізу' });
  }

  // Є що аналізувати — відповідаємо одразу, обробка асинхронна
  res.json({ errorCode: '1', errorMessage: 'Взято в роботу' });

  // Асинхронна обробка після відповіді
  setImmediate(async () => {
    const wsLog = createWorkspaceLogger(workspaceName);
    wsLog.info('Webhook ініціював обробку', { jiraIssueKey, user });
    await processWorkspaceWebhook(workspace, jiraIssueKey, wsLog);
  });
}

module.exports = { handleJiraWebhook };
```

## Правила
- `WEBHOOK_API_TOKEN` — окремий від `JIRA_API_TOKEN`, задається в `.env`
- Відповідь клієнту — завжди до початку асинхронної обробки
- Логувати `ip` та `workspaceName` при кожному виклику
- `setImmediate` — не `setTimeout(fn, 0)`, не `process.nextTick`
- Помилка в асинхронній частині — не впливає на відповідь клієнту, тільки лог
