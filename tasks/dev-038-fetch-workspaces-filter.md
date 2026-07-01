# dev-038-fetch-workspaces-filter.md

## Контекст

Webhook flow викликає Siebel `getWorkspaceObjects` з фільтром по `workspaceName`.
Cron flow викликає без фільтру (порожнє тіло).
Обидва flow використовують ту саму функцію `fetchWorkspaces`.

---

## Що зробити

Змінити `src/siebel/workspaces.js` — `fetchWorkspaces` приймає опціональний `workspaceName`:

```js
/**
 * @param {string} [workspaceName] - якщо задано, Siebel фільтрує по цьому воркспейсу
 */
async function fetchWorkspaces(workspaceName) {
  const url = `${process.env.SIEBEL_BASE_URL}/siebel/v1.0/service/Areon Code Review Service/getWorkspaceObjects`;
  const body = workspaceName ? { workspaceName } : {};
  const response = await apiCall({ method: 'POST', url, headers: buildSiebelHeaders(), body });
  return parseWorkspacesResponse(response);
}
```

> ⚠️ Якщо Siebel не підтримує фільтр — отримувати всі і фільтрувати на стороні:
> `return result.filter(ws => ws.name === workspaceName)`

---

## Критерії готовності

- [x] `fetchWorkspaces()` без аргументу — поведінка як раніше (порожнє тіло)
- [x] `fetchWorkspaces('dev_mmorozov_...')` — body містить `{ workspaceName }`
- [x] Cron flow (`scheduler.js`) продовжує викликати без аргументу

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
