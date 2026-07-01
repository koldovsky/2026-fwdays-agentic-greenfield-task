# dev-045-validate-middleware.md

## Контекст

Webhook вимагає три обов'язкові поля в тілі запиту.
Валідація — в окремому middleware.

---

## Що зробити

Створити `src/api/middleware/validate.js`:

```js
'use strict';

/**
 * Express middleware: валідація обов'язкових полів тіла webhook запиту.
 * Очікує: jiraIssueKey, user, workspaceName
 */
function validateWebhookBody(req, res, next) {
  const required = ['jiraIssueKey', 'user', 'workspaceName'];
  const missing = required.filter(field => !req.body?.[field]);

  if (missing.length > 0) {
    return res.status(400).json({
      errorCode: '400',
      errorMessage: `Відсутні обов'язкові поля: ${missing.join(', ')}`,
    });
  }

  next();
}

module.exports = { validateWebhookBody };
```

---

## Критерії готовності

- [x] `src/api/middleware/validate.js` створено
- [x] Відсутнє будь-яке поле → 400 з переліком відсутніх
- [x] Всі поля присутні → `next()` викликається

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
