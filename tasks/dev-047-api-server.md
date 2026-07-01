# dev-047-api-server.md

## Контекст

Express-додаток з одним маршрутом. Запускається з `index.js`.

---

## Що зробити

Створити `src/api/server.js`:

```js
'use strict';

const express = require('express');
const { authMiddleware }    = require('./middleware/auth');
const { validateWebhookBody } = require('./middleware/validate');
const { handleJiraWebhook } = require('./webhook');

/**
 * Створює та повертає Express app з налаштованими маршрутами.
 * @param {object} config
 * @returns {import('express').Application}
 */
function createServer(config) {
  const app = express();
  app.use(express.json());

  app.post(
    '/api/webhook/jira',
    authMiddleware,
    validateWebhookBody,
    (req, res) => handleJiraWebhook(req, res, config)
  );

  return app;
}

module.exports = { createServer };
```

---

## Критерії готовності

- [x] `src/api/server.js` створено
- [x] `POST /api/webhook/jira` — маршрут зареєстрований з обома middleware
- [x] `createServer(config)` повертає Express app (не запускає `listen`)
- [x] `express.json()` middleware підключено

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
