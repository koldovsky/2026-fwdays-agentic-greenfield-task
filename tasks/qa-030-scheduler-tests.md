# qa-030-scheduler-tests.md

## Контекст

dev-029 виконано — `scheduler.js` з `isRunning` lock є.
`isRunning` — модульна змінна → потребує `jest.resetModules()` між тестами для ізоляції.

---

## Що зробити

Створити `tests/scheduler.test.js`.

### Стратегія ізоляції стану

```js
beforeEach(() => {
  jest.resetModules();
  jest.mock('../src/siebel/workspaces');
  jest.mock('../src/state/store');
  jest.mock('../src/processor');
  jest.mock('../src/utils/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  }));
});
```

Після `resetModules` — модуль перезавантажується свіжим, `isRunning = false`.

### Тест-кейси

- Перший `runCycle` виконується: `fetchWorkspaces` → `upsertWorkspaces` → `processPendingWorkspaces`
- Два паралельних `runCycle`: другий пропускається (warn, без fetchWorkspaces)
- Після успішного циклу `isRunning` знову `false` → наступний `runCycle` виконується
- Помилка у `fetchWorkspaces` → `isRunning` скидається (finally), цикл не крашить

---

## Критерії готовності (Definition of Done)

- [x] `tests/scheduler.test.js` існує
- [x] `jest.resetModules()` в `beforeEach`
- [x] `npx jest tests/scheduler.test.js` — всі тести зелені
- [x] Покрито: isRunning lock, reset після помилки, успішний цикл

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
