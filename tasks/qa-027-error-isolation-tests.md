# qa-027-error-isolation-tests.md

## Контекст

dev-026 виконано. Перевіряємо що `processPendingWorkspaces` ізолює помилки між воркспейсами.

---

## Що зробити

Створити `tests/processPendingWorkspaces.test.js`.

### Стратегія мокування

Мокати всі залежності `processor.js`:

```js
jest.mock('../src/state/store');
jest.mock('../src/siebel/services');
jest.mock('../src/vertex/reviewer');
jest.mock('../src/jira/issues');
jest.mock('../src/utils/workspaceLogger', () => ({
  createWorkspaceLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));
```

### Тест-кейси

- Жодних pending воркспейсів → функція завершується без помилок
- Один воркспейс кидає виняток → решта (другий) обробляється до кінця
- Після помилки першого → `updateWorkspace` викликано з `{ error: ... }` для нього
- Успішний другий воркспейс → `updateWorkspace` з `{ processed: true }`

---

## Критерії готовності (Definition of Done)

- [x] `tests/processPendingWorkspaces.test.js` існує
- [x] `npx jest tests/processPendingWorkspaces.test.js` — всі тести зелені
- [x] Покрито: порожній список, ізоляція помилки, обидва updateWorkspace виклики

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
