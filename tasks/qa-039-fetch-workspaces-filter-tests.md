# qa-039-fetch-workspaces-filter-tests.md

## Контекст

Перевіряємо нову поведінку `fetchWorkspaces` після dev-038.

---

## Що зробити

Додати тести до `tests/` (або окремий файл):

1. `fetchWorkspaces()` без аргументу → `apiCall` отримує `body: {}`
2. `fetchWorkspaces('dev_mmorozov')` → `apiCall` отримує `body: { workspaceName: 'dev_mmorozov' }`
3. Якщо реалізовано фільтрацію на стороні додатку — перевірити що повертається тільки відповідний воркспейс

---

## Критерії готовності

- [x] Тести додані, зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
