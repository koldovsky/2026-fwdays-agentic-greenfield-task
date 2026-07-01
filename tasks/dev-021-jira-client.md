# dev-021-jira-client.md

## Контекст

dev-009 (`src/siebel/client.js`) — референс. Jira-клієнт за тим самим патерном.
Авторизація: Bearer токен (Personal Access Token), не Basic Auth.
Обов'язковий заголовок Jira Datacenter: `X-Atlassian-Token: no-check`.

---

## Що зробити

Створити `src/jira/client.js` з двома функціями.

### buildJiraHeaders

```js
function buildJiraHeaders() {
  return {
    'Authorization': `Bearer ${process.env.JIRA_API_TOKEN}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Atlassian-Token': 'no-check',
  };
}
```

### apiCall

Той самий патерн що в `src/siebel/client.js`:
- `try/catch` через axios
- 401/403 → `err.isCritical = true`
- Без retry для Jira (на відміну від Siebel)

---

## Критерії готовності (Definition of Done)

- [x] `src/jira/client.js` створено
- [x] `buildJiraHeaders` включає `X-Atlassian-Token: no-check`
- [x] `buildJiraHeaders` використовує `JIRA_API_TOKEN` з env
- [x] `apiCall` — обгортка навколо axios з логуванням помилок
- [x] 401/403 → `err.isCritical = true`
- [x] Модуль експортує `{ apiCall, buildJiraHeaders }`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
