# dev-009-siebel-client.md

## Контекст

dev-001 (`axios` встановлено), dev-005 (`logger.js` є) — виконано.  
`src/siebel/client.js` — єдина точка всіх HTTP-звернень до Siebel REST API.  
Жодні інші модулі не імпортують `axios` напряму (правило з `docs/rules/general.md`).

---

## Що зробити

Реалізувати `src/siebel/client.js` з двома публічними функціями:

### buildSiebelHeaders()
Формує заголовки Basic Auth із `process.env.SIEBEL_USERNAME` / `SIEBEL_PASSWORD`.

```js
function buildSiebelHeaders() {
  const credentials = Buffer.from(
    `${process.env.SIEBEL_USERNAME}:${process.env.SIEBEL_PASSWORD}`
  ).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}
```

### apiCall({ method, url, headers, body })
Виконує HTTP-запит через `axios`. Обробляє помилки згідно `docs/rules/external-apis.md`:

| HTTP статус | Дія |
|-------------|-----|
| 401 / 403 | `logger.error` CRITICAL + throw з `err.isCritical = true` |
| 429 | `logger.warn` + чекати 5 с + один retry; якщо знов 429 — throw |
| 5xx / інші | `logger.error` + throw з `err.status` |

```js
async function apiCall({ method, url, headers = {}, body = null }) {
  const config = { method: method.toUpperCase(), url, headers };
  if (body !== null && method.toUpperCase() !== 'GET') {
    config.data = body;
  }
  // ... try/catch з обробкою статусів
}
```

**Не робити retry** при 4xx (крім 429) — це помилки конфігурації.  
**URL** завжди передається готовим — `buildScriptsUrl` та `workspaces.js` збирають його самостійно.

---

## Критерії готовності (Definition of Done)

- [x] `src/siebel/client.js` експортує `{ apiCall, buildSiebelHeaders }`
- [x] `buildSiebelHeaders()` повертає об'єкт з `Authorization: Basic ...` із закодованими credentials
- [x] `apiCall` при 401/403 кидає помилку з `err.isCritical = true`
- [x] `apiCall` при 429 робить один retry після 5 с затримки
- [x] `apiCall` при 5xx кидає помилку з `err.status`
- [x] Усі помилки логуються через `logger` (не `console`)
- [x] `axios` не імпортується ніде крім `src/siebel/client.js`
- [x] `node -e "require('./src/siebel/client')"` — без помилок

---

## Приклади / Референси

- `docs/skills/http-rest-api.md` → патерн `apiCall` та Basic Auth
- `docs/rules/external-apis.md` → правила обробки HTTP-статусів Siebel
- `docs/rules/general.md` → "Зовнішні виклики — тільки через відповідні client.js"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
