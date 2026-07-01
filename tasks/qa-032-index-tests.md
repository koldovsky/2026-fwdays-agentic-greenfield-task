# qa-032-index-tests.md

## Контекст

dev-031 виконано. `index.js` має top-level код → `jest.resetModules()` + spy на `process.exit`.

---

## Що зробити

Створити `tests/index.test.js`.

### Стратегія

```js
beforeEach(() => {
  jest.resetModules();
  jest.mock('../src/scheduler', () => ({ startScheduler: jest.fn() }));
  jest.mock('../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));
  jest.mock('../config/default', () => ({ poll: { cronExpression: '*/15 * * * *' }, siebel: {}, ai: {} }));
  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
});
```

### Тест-кейси

- Відсутній `SIEBEL_BASE_URL` → `process.exit(1)`
- Відсутній `JIRA_API_TOKEN` → `process.exit(1)`
- Відсутні кілька змінних → `process.exit(1)` (не окремо кожна)
- Всі 6 змінних є → `startScheduler` викликається, `process.exit` не викликається

---

## Критерії готовності (Definition of Done)

- [x] `tests/index.test.js` існує
- [x] `process.exit` замінено mock-ом щоб тести не падали
- [x] `npx jest tests/index.test.js` — всі тести зелені
- [x] Покрито: кожна з REQUIRED_ENV викликає exit, success path

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
