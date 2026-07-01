# dev-022-jira-issues.md

## Контекст

dev-021 виконано — `src/jira/client.js` є.
Цей модуль реалізує дві функції: форматування тексту та створення задачі.

---

## Що зробити

Створити `src/jira/issues.js`.

### formatJiraComment

Конвертація Markdown → Jira Wiki Markup:

```js
function formatJiraComment(reviewText) {
  return reviewText
    .replace(/^## (.+)$/gm,       'h2. $1')
    .replace(/^### (.+)$/gm,      'h3. $1')
    .replace(/\*\*(.+?)\*\*/g,    '*$1*')
    .replace(/`([^`]+)`/g,        '{{$1}}')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '{code}$1{code}');
}
```

### createReviewIssue

Захист від дублювання: якщо `jiraIssueKey` вже є — повертати його без нового запиту.

```js
async function createReviewIssue({ workspaceName, serviceName, reviewText, jiraIssueKey }) {
  if (jiraIssueKey) return { key: jiraIssueKey };

  const url = new URL('/rest/api/2/issue', process.env.JIRA_BASE_URL).toString();

  const body = {
    fields: {
      project:     { key: process.env.JIRA_PROJECT_KEY },
      summary:     `Code Review: ${serviceName} [${workspaceName}]`,
      description: formatJiraComment(reviewText),
      issuetype:   { name: process.env.JIRA_ISSUE_TYPE || 'Task' },
    },
  };

  const result = await apiCall({ method: 'POST', url, headers: buildJiraHeaders(), body });
  return { key: result.key };
}
```

**Важливо:**
- `/rest/api/2/` (не v3 — Datacenter 9 підтримує тільки v2)
- `JIRA_PROJECT_KEY` береться з env
- `JIRA_ISSUE_TYPE` — env або default `'Task'`

---

## Критерії готовності (Definition of Done)

- [x] `src/jira/issues.js` створено
- [x] `formatJiraComment` конвертує `##`→`h2.`, `**text**`→`*text*`, `` `code` ``→`{{code}}`, code blocks→`{code}`
- [x] `createReviewIssue` повертає `{ key }` без HTTP-запиту якщо `jiraIssueKey` передано
- [x] URL використовує `/rest/api/2/issue`
- [x] Модуль експортує `{ createReviewIssue, formatJiraComment }`

---

## Приклади / Референси

- `docs/skills/jira-publishing.md`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
