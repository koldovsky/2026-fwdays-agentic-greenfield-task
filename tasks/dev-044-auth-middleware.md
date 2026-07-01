# dev-044-auth-middleware.md

## Контекст

Webhook endpoint захищений Bearer токеном `WEBHOOK_API_TOKEN` (рішення 004 DECISIONS.md).
Перевірка — в окремому middleware.

---

## Що зробити

Створити `src/api/middleware/auth.js`:

```js
'use strict';

/**
 * Express middleware: перевірка Bearer токена для webhook endpoint.
 * Очікує заголовок: Authorization: Bearer <WEBHOOK_API_TOKEN>
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== process.env.WEBHOOK_API_TOKEN) {
    return res.status(401).json({ errorCode: '401', errorMessage: 'Unauthorized' });
  }

  next();
}

module.exports = { authMiddleware };
```

---

## Критерії готовності

- [x] `src/api/middleware/auth.js` створено
- [x] Відсутній заголовок → 401
- [x] Неправильний токен → 401
- [x] Правильний токен → `next()` викликається

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
