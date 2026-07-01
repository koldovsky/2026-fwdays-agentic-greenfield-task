# dev-042-process-workspace-webhook.md

## Контекст

Webhook flow потребує окремої функції обробки — відмінності від Cron:
- Не пише в state-файл (рішення 003 в DECISIONS.md)
- Публікує Sub-task (а не нову задачу) з `assignee`
- Логує з міткою `source: 'webhook'`

---

## Що зробити

Додати `processWorkspaceWebhook` до `src/processor.js`:

```js
/**
 * Обробляє воркспейс у контексті webhook: Siebel → Vertex → Jira Sub-task.
 * Не пише в state-файл.
 * @param {{ workspaceName: string, jiraIssueKey: string, user: string }} params
 * @param {object} config
 * @returns {Promise<{ subtaskKey: string }|null>}
 */
async function processWorkspaceWebhook({ workspaceName, jiraIssueKey, user }, config) {
  const wsLogger = createWorkspaceLogger(workspaceName);
  wsLogger.info('webhook.processing.start', { workspaceName, jiraIssueKey, source: 'webhook' });

  // ... той самий цикл по BS що і в processWorkspace
  // Але в кінці — createSubtask замість createReviewIssue
  // і NO updateWorkspace calls
}
```

### Алгоритм
```
fetchWorkspaces(workspaceName) → знайти ws з ws.name === workspaceName
  → bs = ws.businessServices
  → for each bs: fetchAllServiceScripts → transformToReviewPayload → reviewBusinessService
  → combinedReview (як у processWorkspace)
  → createSubtask({ parentIssueKey: jiraIssueKey, workspaceName, serviceName, reviewText: combinedReview, assignee: user })
  → return { subtaskKey: key }
```

Помилки — логувати через wsLogger, пробрасовувати далі (webhook handler їх ловить).

---

## Критерії готовності

- [x] `processWorkspaceWebhook` додано та експортовано з `processor.js`
- [x] `updateWorkspace` не викликається
- [x] Використовує `createSubtask` з jira/issues.js
- [x] Логує з `source: 'webhook'`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
