# qa-028-skip-no-bs-tests.md

## Контекст

dev-025 виконано. Перевіряємо поведінку `processWorkspace` для воркспейсу без Business Service.

---

## Що зробити

Створити `tests/processWorkspace.test.js` (або додати до існуючого файлу).

### Тест-кейси для processWorkspace

- `businessServices: []` → `updateWorkspace` з `{ processed: true }`, жодних викликів Vertex/Jira
- `businessServices: undefined` → те саме
- Успішний повний цикл: fetch → review → Jira → `{ processed: true, jiraIssueKey }`
- Помилка у `fetchAllServiceScripts` → `updateWorkspace` з `{ error }`, функція кидає

---

## Критерії готовності (Definition of Done)

- [x] `tests/processWorkspace.test.js` існує
- [x] `npx jest tests/processWorkspace.test.js` — всі тести зелені
- [x] Покрито: skip без BS, golden path, помилка з записом у state

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
