# dev-010-siebel-workspaces.md

## Контекст

dev-009 виконано — `src/siebel/client.js` (apiCall, buildSiebelHeaders) є.  
`src/siebel/workspaces.js` відповідає за отримання воркспейсів з Siebel та їх парсинг.  
Це перший крок головного циклу: `polling → workspaces.js → state → processor`.

Критична особливість: поле `Object` у версії воркспейсу може бути відсутнім, одиночним об'єктом або масивом — обов'язкова нормалізація через `normalizeObjects`.

---

## Що зробити

### 1. `normalizeObjects(raw)`

Нормалізує поле `Object` з версії воркспейсу до масиву.

```js
// undefined → []
// { ObjName: 'X', ... } → [{ ObjName: 'X', ... }]
// [{ ... }, { ... }] → [{ ... }, { ... }]
function normalizeObjects(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}
```

### 2. `parseWorkspacesResponse(response)`

Парсить сиру відповідь Siebel API.

- `errorCode !== '0'` → кидає `new Error(response.errorMessage)`
- Для кожного воркспейсу збирає всі об'єкти з усіх `Version[].Object`
- Фільтрує лише `ObjType === 'Business Service'`
- Дедуплікує по `ObjName` через `Map`
- Повертає масив об'єктів для state-файлу

Структура поверненого воркспейсу (відповідає `SPEC.md` секція 5):
```js
{
  name:            ws.Name,
  status:          ws.Status,
  createdByName:   ws.CreatedByName,
  businessServices, // [] якщо немає BS → processed: true одразу (логіка в processor)
  processed:       false,
  fetchedAt:       new Date().toISOString(),
  reviewResult:    null,
  jiraIssueKey:    null,
  error:           null,
}
```

### 3. `fetchWorkspaces()`

Викликає Siebel POST endpoint і повертає розпарсені воркспейси.

```js
const url = new URL(
  '/siebel/v1.0/service/Areon Code Review Service/getWorkspaceObjects',
  process.env.SIEBEL_BASE_URL
).toString();

// body: {} — пусте тіло, саме таке за специфікацією
const response = await apiCall({ method: 'POST', url, headers: buildSiebelHeaders(), body: {} });
return parseWorkspacesResponse(response);
```

Обгортається в `try/catch`: помилки логуються через `logger.error` і перекидаються далі.

---

## Критерії готовності (Definition of Done)

- [x] `src/siebel/workspaces.js` експортує `{ fetchWorkspaces, parseWorkspacesResponse, normalizeObjects }`
- [x] `normalizeObjects(undefined)` → `[]`
- [x] `normalizeObjects({ ObjName: 'X' })` → `[{ ObjName: 'X' }]`
- [x] `normalizeObjects([{ ObjName: 'X' }, { ObjName: 'Y' }])` → масив з 2 елементів
- [x] `parseWorkspacesResponse` з `errorCode !== '0'` → кидає `Error`
- [x] `parseWorkspacesResponse` повертає лише воркспейси з `ObjType === 'Business Service'` у полі `businessServices`
- [x] `parseWorkspacesResponse` дедуплікує `Business Service` по `ObjName` в межах одного воркспейсу
- [x] Повернені об'єкти мають поля `reviewResult: null`, `jiraIssueKey: null`, `error: null`
- [x] `node -e "require('./src/siebel/workspaces')"` — без помилок

---

## Приклади / Референси

- `docs/SPEC.md` → секції 1–4: endpoint, структура відповіді, алгоритм парсингу
- `docs/SPEC.md` → секція 5: структура state-файлу (поля що має повертати функція)
- `src/siebel/client.js` → `apiCall`, `buildSiebelHeaders`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
