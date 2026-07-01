# Skill: HTTP-запити до REST API

## Коли використовувати
Будь-який виклик зовнішнього API: Siebel, Jira, Vertex AI.

## Патерн

```js
const axios = require('axios');

/**
 * Виконує HTTP-запит до зовнішнього API
 * @param {object} options
 * @param {string} options.method - GET | POST | PUT | PATCH | DELETE
 * @param {string} options.url - повний URL
 * @param {object} [options.headers] - заголовки
 * @param {object} [options.body] - тіло запиту (для не-GET)
 * @returns {Promise<object>} - розпарсена відповідь
 */
async function apiCall({ method, url, headers = {}, body = null }) {
  const config = {
    method: method.toUpperCase(),
    url,
    headers,
  };

  if (body && method.toUpperCase() !== 'GET') {
    config.data = body;
  }

  const response = await axios(config);
  return response.data;
}
```

## Авторизація

### Bearer токен (Jira)
```js
const headers = {
  'Authorization': `Bearer ${process.env.JIRA_API_TOKEN}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Atlassian-Token': 'no-check',
};
```

### Basic Auth (Siebel)
```js
const credentials = Buffer.from(
  `${process.env.SIEBEL_USERNAME}:${process.env.SIEBEL_PASSWORD}`
).toString('base64');

const headers = {
  'Authorization': `Basic ${credentials}`,
  'Accept': 'application/json',
};
```

## Специфіка Siebel REST API

Siebel вимагає обгортку `body` навколо параметрів запиту:

```js
// ✅ З параметром (webhook flow — фільтр по воркспейсу)
body: { body: { workspaceName: 'dev_mmorozov_20260624_fixkyivstar' } }

// ✅ Без параметрів (cron flow — всі воркспейси)
body: { body: {} }

// ❌ Неправильно — Siebel не розпізнає параметри
body: { workspaceName: 'dev_mmorozov_20260624_fixkyivstar' }
```

## Правила
- Завжди `await` — ніяких `.then()`
- URL збирати через `new URL(path, base).toString()` — не конкатенацією рядків
- Токени та паролі — тільки з `process.env`
- Обробку помилок — в модулях-клієнтах, не у бізнес-логіці (див. skill: error-logging)
