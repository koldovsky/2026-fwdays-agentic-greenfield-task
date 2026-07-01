# qa-016-services-tests.md

## Контекст

dev-013/014/015 виконано — `services.js` з усіма трьома функціями є.
`fetchAllServiceScripts` робить реальні HTTP-запити → потрібен mock `apiCall`.

---

## Що зробити

Створити `tests/services.test.js`. Мокати `src/siebel/client.js` через `jest.mock`.

### Стратегія мокування
```js
jest.mock('../src/siebel/client', () => ({
  apiCall: jest.fn(),
  buildSiebelHeaders: jest.fn(() => ({})),
}));
const { apiCall } = require('../src/siebel/client');
```

### Тест-кейси для `buildScriptsUrl`
- Містить `encodeURIComponent` для workspaceName та serviceName
- Фіксовані частини мають `%20` замість пробілів
- Базується на `SIEBEL_BASE_URL` з env

### Тест-кейси для `fetchAllServiceScripts`
- Одна сторінка (`lastpage: 'true'`) → повертає items
- Дві сторінки (`lastpage: 'false'` → `lastpage: 'true'`) → об'єднує items
- Порожній `items` (або `undefined`) → не падає, повертає `[]`

### Тест-кейси для `transformToReviewPayload`
- Фільтрує `Inactive: 'Y'`
- `parentName` береться з `Parent Name` першого активного item
- Порожній масив → `{ scripts: [], parentName: '' }`
- Структура скрипту: `{ name, body }` ← `{ Name, Script }`

---

## Критерії готовності (Definition of Done)

- [x] `tests/services.test.js` існує
- [x] `jest.mock` використовується для `apiCall`
- [x] `npx jest tests/services.test.js` — всі тести зелені
- [x] Покрито: buildScriptsUrl, пагінація, фільтрація inactive, transformToReviewPayload

---

## Приклади / Референси

- `src/siebel/services.js` — реалізація
- `docs/SPEC.md` → секція 6

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
