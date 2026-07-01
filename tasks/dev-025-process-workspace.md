# dev-025-process-workspace.md

## Контекст

Усі залежності є: store.js, services.js, reviewer.js, issues.js, workspaceLogger.js.
`processWorkspace` — центральна функція, що об'єднує весь pipeline для одного воркспейсу.

---

## Що зробити

Реалізувати `processWorkspace(workspace, config)` у `src/processor.js`.

### Алгоритм

```
workspace.businessServices.length === 0
  → updateWorkspace(name, { processed: true })
  → return (без Vertex, без Jira)

інакше:
  for each bs in businessServices:
    items = fetchAllServiceScripts(workspace.name, bs.ObjName)
    payload = transformToReviewPayload(workspace.name, items)
    if payload.scripts.length > 0:
      reviewText = reviewBusinessService(payload, config)
      collect { bsName, reviewText }

  if no reviews collected:
    → updateWorkspace(name, { processed: true })
    → return

  serviceName = allReviews[].bsName joined with ', '
  reviewText = allReviews combined (## BS\n\ntext\n\n---\n\n...)
  { key } = createReviewIssue({ workspaceName, serviceName, reviewText, jiraIssueKey })
  → updateWorkspace(name, { processed: true, jiraIssueKey: key, reviewResult: reviewText, error: null })

on catch(err):
  → updateWorkspace(name, { error: err.message })
  → throw err  ← важливо для processPendingWorkspaces
```

### Важливо
- `throw err` після запису помилки — `processPendingWorkspaces` використовує `Promise.allSettled`
- `workspace.jiraIssueKey || null` передається в `createReviewIssue` — anti-duplicate захист
- Логування через `createWorkspaceLogger(workspace.name)`

---

## Критерії готовності (Definition of Done)

- [x] `src/processor.js` створено
- [x] Воркспейс без BS → `processed: true`, Vertex і Jira не викликаються
- [x] Помилка записується в `state.error`, після чого re-throw
- [x] `jiraIssueKey` зберігається після успішної публікації
- [x] Функція логує кроки через `createWorkspaceLogger`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
