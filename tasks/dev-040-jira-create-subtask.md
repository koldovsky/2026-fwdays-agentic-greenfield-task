# dev-040-jira-create-subtask.md

## Контекст

За рішенням 006 (DECISIONS.md): webhook flow створює Sub-task дочірню до батьківського тікету.
Sub-task успадковує проєкт від батька — `JIRA_PROJECT_KEY` не потрібен.
Відповідальним призначається `user` з тіла webhook.

Референс: `docs/SPEC.md` — розділ "Flow 2 — Webhook", останній крок.

---

## Що зробити

Додати `createSubtask` до `src/jira/issues.js`:

```js
/**
 * Створює Sub-task в Jira дочірню до батьківського тікету.
 * @param {object} params
 * @param {string} params.parentIssueKey - ключ батьківського тікету (SBL-123)
 * @param {string} params.workspaceName
 * @param {string} params.serviceName
 * @param {string} params.reviewText - markdown текст рев'ю
 * @param {string} params.assignee - логін користувача (Jira Datacenter: name, не email)
 * @returns {Promise<{ key: string }>}
 */
async function createSubtask({ parentIssueKey, workspaceName, serviceName, reviewText, assignee }) {
  const url = new URL('/rest/api/2/issue', process.env.JIRA_BASE_URL).toString();
  const body = {
    fields: {
      summary:     `Code Review: ${serviceName} [${workspaceName}]`,
      description: formatJiraComment(reviewText),
      issuetype:   { name: 'Sub-task' },
      parent:      { key: parentIssueKey },
      assignee:    { name: assignee },
    },
  };
  const result = await apiCall({ method: 'POST', url, headers: buildJiraHeaders(), body });
  return { key: result.key };
}
```

Експортувати поряд з `createReviewIssue`.

---

## Критерії готовності

- [x] `createSubtask` додано до `src/jira/issues.js`
- [x] Тіло запиту: `issuetype.name = 'Sub-task'`, `parent.key`, `assignee.name`
- [x] Немає `project.key` — Sub-task наслідує проєкт від батька
- [x] Функція експортована з модуля

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
