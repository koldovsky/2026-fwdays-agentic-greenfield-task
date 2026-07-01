# qa-008-store-tests.md

## Контекст

dev-007 виконано — `src/state/store.js` реалізовано.  
Ця задача перевіряє коректність усіх п'яти функцій store.js через Jest unit-тести.  
Тести мають бути ізольованими: використовувати тимчасовий файл (не реальний `data/workspaces-state.json`).

---

## Що зробити

Створити `tests/store.test.js` з покриттям усіх сценаріїв.

### Стратегія ізоляції
Замокати `STATE_FILE` шлях через `jest.mock` або модифікувати `store.js` щоб прийняти `STATE_FILE` ззовні.  
Альтернатива — використати `os.tmpdir()` + унікальне ім'я файлу, видаляти у `afterEach`.

```js
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

// Патч шляху до тимчасового файлу перед require
const tmpFile = path.join(os.tmpdir(), `store-test-${Date.now()}.json`);
jest.mock('../src/state/store', () => {
  // ... або просто використати os.tmpdir у store.js через env
});
```

Простіший підхід: store.js читає `STATE_FILE` з `process.env.STATE_FILE_PATH || default`.  
Тоді в тестах: `process.env.STATE_FILE_PATH = tmpFile` до `require`.

### Тест-кейси

**readState() — файл відсутній:**
```js
it('повертає порожній стан якщо файл не існує', async () => {
  const state = await readState();
  expect(state).toEqual({ lastPolledAt: null, workspaces: [] });
});
```

**writeState() + readState() — round-trip:**
```js
it('зберігає і зчитує стан без втрат', async () => {
  const data = { lastPolledAt: '2026-06-24T10:00:00.000Z', workspaces: [{ name: 'ws1', processed: false }] };
  await writeState(data);
  expect(await readState()).toEqual(data);
});
```

**updateWorkspace() — патч лише цільового:**
```js
it('змінює тільки вказаний воркспейс', async () => {
  await writeState({ lastPolledAt: null, workspaces: [
    { name: 'ws1', processed: false },
    { name: 'ws2', processed: false },
  ]});
  await updateWorkspace('ws1', { processed: true, jiraIssueKey: 'SBL-1' });
  const { workspaces } = await readState();
  expect(workspaces.find(w => w.name === 'ws1')).toMatchObject({ processed: true, jiraIssueKey: 'SBL-1' });
  expect(workspaces.find(w => w.name === 'ws2')).toMatchObject({ processed: false });
});
```

**getPendingWorkspaces() — лише processed: false:**
```js
it('повертає тільки необроблені воркспейси', async () => {
  await writeState({ lastPolledAt: null, workspaces: [
    { name: 'ws1', processed: true },
    { name: 'ws2', processed: false },
    { name: 'ws3', processed: false },
  ]});
  const pending = await getPendingWorkspaces();
  expect(pending).toHaveLength(2);
  expect(pending.every(w => w.processed === false)).toBe(true);
});
```

**upsertWorkspaces() — не перезаписує оброблені:**
```js
it('не змінює processed:true воркспейси при upsert', async () => {
  await writeState({ lastPolledAt: null, workspaces: [
    { name: 'ws1', processed: true, jiraIssueKey: 'SBL-1' },
  ]});
  await upsertWorkspaces([
    { name: 'ws1', businessServices: [] },
    { name: 'ws2', businessServices: [] },
  ]);
  const { workspaces } = await readState();
  expect(workspaces.find(w => w.name === 'ws1')).toMatchObject({ processed: true, jiraIssueKey: 'SBL-1' });
  expect(workspaces.find(w => w.name === 'ws2')).toMatchObject({ processed: false });
});
```

---

## Критерії готовності (Definition of Done)

- [x] `tests/store.test.js` існує
- [x] `npm test` виконується без помилок
- [x] Всі 5 тест-кейсів зелені (фактично 6 — додано тест для `lastPolledAt`)
- [x] Тести не читають/пишуть реальний `data/workspaces-state.json`
- [x] `afterEach` або `afterAll` видаляє тимчасовий файл

---

## Приклади / Референси

- `src/state/store.js` — реалізація що тестується
- `docs/skills/json-state-file.md` → очікувана поведінка кожної функції

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
