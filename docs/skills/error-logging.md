# Skill: Логування помилок

## Призначення
Єдиний стандарт обробки та логування помилок у всьому проєкті.

## Патерн (вбудований у кожен модуль)

```js
/**
 * Логує помилку з контекстом
 * @param {string} module - назва модуля (напр. 'siebel/client')
 * @param {string} operation - що виконувалось (напр. 'fetchWorkspaces')
 * @param {Error} err - об'єкт помилки
 * @param {object} [meta] - додатковий контекст
 */
function logError(module, operation, err, meta = {}) {
  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    module,
    operation,
    message: err.message,
    stack: err.stack,
    ...meta,
  }));
}

module.exports = { logError };
```

## Як використовувати в модулях

```js
const { logError } = require('../utils/logger');

// В siebel/client.js
async function fetchWorkspaces() {
  try {
    return await apiCall({ ... });
  } catch (err) {
    logError('siebel/client', 'fetchWorkspaces', err);
    throw err; // прокидати далі — не ковтати помилки
  }
}

// В processor.js — помилка по конкретному воркспейсу
async function processWorkspace(workspace) {
  try {
    // ...
  } catch (err) {
    logError('processor', 'processWorkspace', err, {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
    // Записати помилку в state, але не зупиняти обробку інших
    await updateWorkspace(workspace.id, {
      error: err.message,
      errorAt: new Date().toISOString(),
    });
  }
}
```

## Рівні та коли що використовувати

| Рівень | Коли | Що робити далі |
|--------|------|----------------|
| `ERROR` | Зовнішній API недоступний, файл не читається | Логувати + записати в state.error + продовжити |
| `WARN` | Воркспейс без Business Service, пустий результат | Логувати + позначити processed |
| `INFO` | Успішні операції (в dev-режимі) | Тільки під `DEBUG=true` env |

```js
function logWarn(module, operation, message, meta = {}) {
  console.warn(JSON.stringify({
    level: 'WARN',
    timestamp: new Date().toISOString(),
    module,
    operation,
    message,
    ...meta,
  }));
}

function logInfo(module, operation, message, meta = {}) {
  if (process.env.DEBUG !== 'true') return;
  console.log(JSON.stringify({
    level: 'INFO',
    timestamp: new Date().toISOString(),
    module,
    operation,
    message,
    ...meta,
  }));
}
```

## Правила
- Ніколи не ковтати помилки мовчки (`catch (err) {}` — заборонено)
- Завжди передавати контекст: який модуль, яка операція, який workspaceId
- `console.log` в продакшн-коді — заборонено (тільки `logInfo` під `DEBUG=true`)
- Помилка одного воркспейсу не зупиняє обробку інших — ізолювати try/catch
- JSON-формат логів — для зручності парсингу в майбутньому (CloudWatch, Datadog)
