# qa-012-parse-workspaces.md

## Контекст

dev-010 виконано — `parseWorkspacesResponse` є в `src/siebel/workspaces.js`.
Ця задача тестує складнішу логіку: фільтрацію, дедуплікацію, перевірку errorCode.

---

## Що зробити

Створити `tests/parseWorkspacesResponse.test.js`.

### Тест-кейси

- `errorCode !== '0'` → кидає `Error` з текстом `errorMessage`
- Порожній `Workspace` → повертає `[]`
- Фільтрує лише `Business Service`, інші `ObjType` ігноруються
- Дедуплікує по `ObjName` (один BS зустрічається у кількох версіях)
- Воркспейс без `Version` → `businessServices: []`
- Повернений об'єкт має всі поля: `name`, `status`, `createdByName`, `businessServices`, `processed: false`, `fetchedAt`, `reviewResult: null`, `jiraIssueKey: null`, `error: null`

---

## Критерії готовності (Definition of Done)

- [x] `tests/parseWorkspacesResponse.test.js` існує
- [x] `npx jest tests/parseWorkspacesResponse.test.js` — всі тести зелені (9/9)
- [x] Покрито: errorCode, фільтрація, дедуплікація, структура результату

---

## Приклади / Референси

- `docs/SPEC.md` → секції 2–3

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
