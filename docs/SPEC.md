# SPEC.md — Специфікація API проєкту

## Точки входу

Додаток має дві незалежні точки входу що ведуть на **спільний процес обробки**:

| # | Точка входу | Тригер | Хто викликає |
|---|-------------|--------|--------------|
| 1 | **Cron** | Розклад (`POLL_INTERVAL_CRON`) | Планувальник всередині додатку |
| 2 | **Webhook** `POST /api/webhook/jira` | Подія в Jira | Jira Datacenter (automation) |

### Спільний процес після визначення воркспейсу
```
Визначено workspaceName
  │
  ▼
POST Siebel getWorkspaceObjects (з фільтром по workspaceName або без)
  │
  ▼
Перевірка наявності Business Service
  │
  ├─ Немає → завершити (різна відповідь залежно від точки входу)
  └─ Є     → GET скрипти → AI-провайдер (Vertex або Claude) → POST Jira
```

### Вибір AI-провайдера
Визначається через env-змінну `AI_PROVIDER` (за замовчуванням: `vertex`):

| AI_PROVIDER | Модуль | Бібліотека |
|-------------|--------|------------|
| `vertex` | `src/vertex/reviewer.js` | `@google/genai` |
| `claude` | `src/claude/reviewer.js` | `@anthropic-ai/sdk` |

Вибір відбувається у `src/ai/selector.js`. Обидва модулі реалізують однаковий інтерфейс.

---

## 1. Siebel API — Отримання воркспейсів

### Endpoint
```
POST {SIEBEL_BASE_URL}/siebel/v1.0/service/Areon Code Review Service/getWorkspaceObjects
```

### Авторизація
Basic Auth: `SIEBEL_USERNAME` / `SIEBEL_PASSWORD`

### ⚠️ Обов'язкова структура тіла запиту

Siebel REST API вимагає обгортку `body` навколо параметрів:

```json
{
  "body": {
    "workspaceName": "dev_mmorozov_20260624_fixkyivstar"
  }
}
```

Без обгортки `body` — запит не поверне очікуваного результату.

### Виклик без фільтру (Cron flow)
```js
const response = await apiCall({
  method: 'POST',
  url,
  headers: buildSiebelHeaders(),
  body: { body: {} }, // порожній body — повертає всі воркспейси
});
```

### Виклик з фільтром по workspaceName (Webhook flow)
```js
const response = await apiCall({
  method: 'POST',
  url,
  headers: buildSiebelHeaders(),
  body: { body: { workspaceName } }, // повертає тільки вказаний воркспейс
});
```

### Приклад відповіді
`docs/examples/get-workspace-objects.json`

### Структура відповіді

| Поле | Тип | Опис |
|------|-----|------|
| `errorCode` | string | `"0"` = успіх, інше = помилка |
| `errorMessage` | string | Текст помилки або порожній рядок |
| `Workspace` | array | Масив воркспейсів |

### Структура воркспейсу

| Поле | Тип | Опис |
|------|-----|------|
| `Name` | string | Унікальна назва воркспейсу |
| `Status` | string | `Delivered`, `Checkpointed`, `Edit`, та ін. |
| `CreatedByName` | string | Логін автора воркспейсу |
| `Version` | array | Масив версій з переліком змін |

### Структура Version

| Поле | Тип | Опис |
|------|-----|------|
| `VerNum` | string | Номер версії (рядок з числом) |
| `Comments` | string | Коментар до версії |
| `Object` | object \| array \| відсутнє | Змінені об'єкти — див. нижче |

### ⚠️ Критична особливість: поле `Object`

Поле `Object` має **три можливих варіанти**:

**1. Відсутнє** — версія без змін об'єктів:
```json
{ "VerNum": "4", "Comments": "ok" }
```

**2. Один об'єкт** — одиночний об'єкт (не масив!):
```json
{
  "VerNum": "6",
  "Object": {
    "Operation": "Update",
    "ObjName": "SPAreonKyivstarBS",
    "ObjType": "Business Service"
  }
}
```

**3. Кілька об'єктів** — масив:
```json
{
  "VerNum": "5",
  "Object": [
    { "Operation": "Update", "ObjName": "SP Location",       "ObjType": "Business Component" },
    { "Operation": "Update", "ObjName": "SP Premise Rental", "ObjType": "Business Service"   }
  ]
}
```

**Обов'язкова нормалізація при читанні:**
```js
/**
 * Нормалізує поле Object до масиву
 * @param {object|array|undefined} raw
 * @returns {object[]}
 */
function normalizeObjects(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}
```

### Структура об'єкту

| Поле | Тип | Опис |
|------|-----|------|
| `Operation` | string | `Insert` або `Update` |
| `ObjName` | string | Назва об'єкту Siebel |
| `ObjType` | string | Тип об'єкту — перелік нижче |

### Відомі типи об'єктів (ObjType)

| ObjType | На рев'ю? | Примітка |
|---------|-----------|----------|
| `Business Service` | ✅ **ТАК** | Містить скрипти — основний предмет рев'ю |
| `Applet` | ❌ Ні | UI компонент |
| `Business Component` | ❌ Ні | Бізнес-компонент |
| `Business Object` | ❌ Ні | Бізнес-об'єкт |
| `Pick List` | ❌ Ні | Список вибору |
| `Integration Object` | ❌ Ні | Інтеграційний об'єкт |
| `Symbolic String` | ❌ Ні | Рядковий ресурс |

### Алгоритм парсингу відповіді

```js
function parseWorkspacesResponse(response) {
  if (response.errorCode !== '0') {
    throw new Error(`Siebel API error: ${response.errorMessage}`);
  }

  return (response.Workspace || []).map(ws => {
    const allObjects = (ws.Version || []).flatMap(ver =>
      normalizeObjects(ver.Object)
    );

    // Унікальні Business Service по ObjName
    const businessServices = [
      ...new Map(
        allObjects
          .filter(obj => obj.ObjType === 'Business Service')
          .map(obj => [obj.ObjName, obj])
      ).values()
    ];

    return {
      name:             ws.Name,
      status:           ws.Status,
      createdByName:    ws.CreatedByName,
      businessServices,
      processed:        false,
      fetchedAt:        new Date().toISOString(),
    };
  });
}
```

### Логіка фільтрації
```
businessServices.length === 0 → пропустити (processed: true, без лог-файлу)
businessServices.length > 0  → обробити, створити лог-файл воркспейсу
```

### Приклади реальних воркспейсів

БЕЗ Business Service → пропустити:
```
dev_dshevchuk_sun-874 → тільки Applet
dev_mhorobets_sun891  → тільки Pick List
dev_orogov_test_io    → тільки Integration Object
```

З Business Service → обробити:
```
dev_mmorozov_20260624_fixkyivstar → SPAreonKyivstarBS ✅
dev_mhorobets_sun886_fixemail     → SP Legal Department Service ✅
dev_spishchuk_sun_892             → SP Premise Rental ✅
dev_orogov_ws                     → Areon Code Review Service ✅
dev_dshevchuk_sun-882             → SP Premise Rental ✅
```

---

## 2. Siebel API — GET скриптів Business Service

### Endpoint
```
GET {SIEBEL_BASE_URL}/siebel/v1.0/workspace/{workspaceName}/Business Service/{serviceName}/Business Service Server Script
```

### Параметри URL

| Параметр | Звідки брати | Приклад |
|----------|-------------|---------|
| `workspaceName` | `workspace.name` | `dev_mmorozov_20260624_fixkyivstar` |
| `serviceName` | `businessServices[i].ObjName` | `SPAreonKyivstarBS` |

### ⚠️ Пробіли в URL — обов'язково екранувати
```js
const url = [
  process.env.SIEBEL_BASE_URL,
  '/siebel/v1.0/workspace/',
  encodeURIComponent(workspaceName),
  '/Business%20Service/',
  encodeURIComponent(serviceName),
  '/Business%20Service%20Server%20Script',
].join('');
```

### Авторизація
Basic Auth: `SIEBEL_USERNAME` / `SIEBEL_PASSWORD`

### Приклад відповіді
`docs/examples/get-business-service-scripts.json`

### Структура відповіді

| Поле | Тип | Опис |
|------|-----|------|
| `lastpage` | string | `"true"` / `"false"` — чи остання сторінка |
| `items` | array | Масив скриптів сервісу |

### ⚠️ Пагінація
```js
async function fetchAllServiceScripts(workspaceName, serviceName) {
  const allItems = [];
  let page = 1;
  let lastPage = false;

  while (!lastPage) {
    const url = buildScriptsUrl(workspaceName, serviceName) + `?page=${page}&pagesize=20`;
    const response = await apiCall({ method: 'GET', url, headers: buildSiebelHeaders() });
    allItems.push(...(response.items || []));
    lastPage = response.lastpage === 'true';
    page++;
  }

  return allItems;
}
```

### Поля item що використовуються

| Поле | Використовується | Опис |
|------|-----------------|------|
| `Name` | ✅ | Назва скрипту |
| `Script` | ✅ | Тіло скрипту |
| `Parent Name` | ✅ | Назва Business Service |
| `Inactive` | ✅ | `"N"` = активний, `"Y"` = пропустити |
| решта | ❌ | Метадані — не використовуються |

### Трансформація для AI-провайдера
```js
function transformToReviewPayload(workspaceName, items) {
  const activeItems = items.filter(item => item['Inactive'] !== 'Y');
  return {
    workspaceName,
    parentName: activeItems[0]?.['Parent Name'] ?? '',
    scripts: activeItems.map(item => ({
      name: item['Name'],
      body: item['Script'],
    })),
  };
}
```

---

## 2.5. Структура відповіді AI (Vertex та Claude)

Обидва провайдери повертають однакову структуру:

```js
{
  reviewText:   string,  // markdown текст рев'ю — конвертується у Wiki Markup для Jira
  reviewScore:  number,  // ціле число 0-100 (100 = ідеальний код)
  reviewResult: string,  // "green" | "yellow" | "red"
}
```

### Семантика reviewResult
| Значення | Score | Опис |
|----------|-------|------|
| `green` | ≥ 80 | Код якісний, зауваження несуттєві або відсутні |
| `yellow` | 50–79 | Є попередження, бажані виправлення |
| `red` | < 50 | Є **критичні зауваження**, виправлення обов'язкові |

### Публікація в Jira
| Поле AI | Куди в Jira |
|---------|-------------|
| `reviewText` | `fields.description` (Wiki Markup) |
| `reviewScore` | кастомне поле `JIRA_FIELD_REVIEW_SCORE` (якщо задано) |
| `reviewResult` | кастомне поле `JIRA_FIELD_REVIEW_RESULT` (якщо задано) |

### Кастомні поля у .env
```
JIRA_FIELD_REVIEW_SCORE=customfield_10500    # числова оцінка 0-100
JIRA_FIELD_REVIEW_RESULT=customfield_10501   # значення: green / yellow / red
```

Якщо змінні відсутні — кастомні поля не включаються до запиту Jira (зворотна сумісність).

---

## 3. Webhook API — Вхідний запит з Jira

### Endpoint
```
POST /api/webhook/jira
```

### Авторизація
Bearer токен — окремий від Jira API токену, для захисту вхідного webhook:
```
Authorization: Bearer <WEBHOOK_API_TOKEN>
```
```js
// Перевірка в middleware:
const token = req.headers['authorization']?.replace('Bearer ', '');
if (token !== process.env.WEBHOOK_API_TOKEN) {
  return res.status(401).json({ errorCode: '401', errorMessage: 'Unauthorized' });
}
```

### Тіло запиту (JSON)

| Поле | Тип | Обов'язкове | Опис |
|------|-----|-------------|------|
| `jiraIssueKey` | string | ✅ | Номер тікету в Jira (напр. `SBL-123`) |
| `user` | string | ✅ | Логін користувача що ініціював |
| `workspaceName` | string | ✅ | Назва воркспейсу Siebel для аналізу |

```json
{
  "jiraIssueKey": "SBL-123",
  "user": "MMOROZOV",
  "workspaceName": "dev_mmorozov_20260624_fixkyivstar"
}
```

### Валідація вхідних даних
```js
const { jiraIssueKey, user, workspaceName } = req.body;
if (!jiraIssueKey || !user || !workspaceName) {
  return res.status(400).json({
    errorCode: '400',
    errorMessage: 'Відсутні обов\'язкові поля: jiraIssueKey, user, workspaceName',
  });
}
```

### Коди відповідей

| Сценарій | errorCode | errorMessage | HTTP статус |
|----------|-----------|--------------|-------------|
| Воркспейс не знайдено в Siebel | `1000` | `Воркспейс не знайдено` | 200 |
| Немає об'єктів для аналізу | `0` | `Відсутні об'єкти для аналізу` | 200 |
| Є об'єкти — взято в роботу | `1` | `Взято в роботу` | 200 |
| Відсутня авторизація | `401` | `Unauthorized` | 401 |
| Відсутні поля запиту | `400` | `Відсутні обов'язкові поля: ...` | 200 |
| Внутрішня помилка | `500` | `Внутрішня помилка сервера` | 500 |

### Структура відповіді (всі сценарії)
```json
{
  "errorCode": "1",
  "errorMessage": "Взято в роботу"
}
```

### Логіка обробки webhook
```
POST /api/webhook/jira
  │
  ├─ Перевірка авторизації (Bearer токен)
  ├─ Валідація полів (jiraIssueKey, user, workspaceName)
  │
  ▼
POST Siebel getWorkspaceObjects (з workspaceName)
  │
  ├─ Workspace[] порожній або Name не співпадає
  │    └─ відповідь: errorCode=1000, errorMessage=Воркспейс не знайдено
  │
  ├─ Workspace знайдено, businessServices.length === 0
  │    └─ відповідь: errorCode=0, errorMessage=Відсутні об'єкти для аналізу
  │
  └─ Workspace знайдено, є Business Service
       ├─ відповідь одразу: errorCode=1, errorMessage=Взято в роботу
       └─ async: запустити стандартний процес обробки (не блокує відповідь)
            └─ GET скрипти → Vertex AI → POST коментар в Jira (jiraIssueKey)
```

### ⚠️ Важливо: відповідь до клієнта — негайна
Webhook повертає відповідь **одразу** після визначення що є що аналізувати.
Подальша обробка (Vertex + Jira) — асинхронна, не блокує HTTP відповідь:
```js
// Відповідаємо одразу
res.json({ errorCode: '1', errorMessage: 'Взято в роботу' });

// Запускаємо обробку асинхронно після відповіді
setImmediate(() => processWorkspaceAsync(workspaceName, jiraIssueKey, user));
```

### Відмінність від Cron flow
| | Cron flow | Webhook flow |
|---|---|---|
| Результат іде в Jira | Створює нову задачу (`Task`) | Створює **Sub-Code Review** дочірню до `jiraIssueKey` |
| Відповідальний | Не призначається | `assignee` = `user` з тіла webhook |
| State-файл | Оновлюється | Не оновлюється (одноразовий запит) |
| Логування | Файл воркспейсу | Файл воркспейсу (з міткою `source: webhook`) |

---

## 4. State-файл (data/workspaces-state.json)

Використовується **тільки Cron flow**. Webhook flow не пише в state.

```json
{
  "lastPolledAt": "2026-06-24T10:00:00.000Z",
  "workspaces": [
    {
      "name": "dev_mmorozov_20260624_fixkyivstar",
      "status": "Delivered",
      "createdByName": "MMOROZOV",
      "businessServices": [
        { "Operation": "Update", "ObjName": "SPAreonKyivstarBS", "ObjType": "Business Service" }
      ],
      "processed": false,
      "fetchedAt": "2026-06-24T10:00:00.000Z",
      "reviewResult": null,
      "jiraIssueKey": null,
      "error": null,
      "errorAt": null
    }
  ]
}
```

---

## 5. Нові змінні середовища (.env)

```
WEBHOOK_API_TOKEN=        # Bearer токен для захисту POST /api/webhook/jira
WEBHOOK_PORT=3000         # порт Express сервера (якщо окремо від основного)
```

Додати до існуючих змінних з CLAUDE.md.

---

## 6. Повні ланцюжки обробки

### Flow 1 — Cron
```
node-cron (POLL_INTERVAL_CRON)
  │
  ▼
POST Siebel getWorkspaceObjects (всі воркспейси)
  │
  ▼
Зберегти в workspaces-state.json (processed: false)
  │
  ▼
Для кожного воркспейсу де processed=false:
  ├─ немає Business Service → processed: true, далі
  └─ є Business Service
       │
       ▼
       GET скрипти (з пагінацією)
       │
       ▼
       AI-провайдер (Vertex або Claude) → { reviewText, reviewScore, reviewResult }
       │
       ▼
       Jira POST /rest/api/2/issue (створити нову задачу)
         fields.description = reviewText (Wiki Markup)
         fields[JIRA_FIELD_REVIEW_SCORE]  = reviewScore   (якщо задано)
         fields[JIRA_FIELD_REVIEW_RESULT] = reviewResult  (якщо задано)
       │
       ▼
       processed: true, jiraIssueKey: 'SBL-NNN'
```

### Flow 2 — Webhook
```
POST /api/webhook/jira
  { jiraIssueKey: 'SBL-123', user: 'MMOROZOV', workspaceName: 'dev_...' }
  │
  ├─ Auth middleware (Bearer WEBHOOK_API_TOKEN)
  ├─ Validation middleware
  │
  ▼
POST Siebel getWorkspaceObjects (workspaceName)
  │
  ├─ не знайдено → { errorCode: '1000', errorMessage: 'Воркспейс не знайдено' }
  ├─ немає BS   → { errorCode: '0',    errorMessage: 'Відсутні об'єкти для аналізу' }
  └─ є BS       → { errorCode: '1',    errorMessage: 'Взято в роботу' }
                   + async:
                     GET скрипти → AI (Vertex або Claude) → { reviewText, reviewScore, reviewResult }
                     → Jira POST /rest/api/2/issue (Sub-Code Review, parent={jiraIssueKey}, assignee={user})
                         fields.description = reviewText
                         fields[JIRA_FIELD_REVIEW_SCORE]  = reviewScore
                         fields[JIRA_FIELD_REVIEW_RESULT] = reviewResult
```
