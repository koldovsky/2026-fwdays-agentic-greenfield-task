# Skill: Публікація результату рев'ю в Jira Datacenter 9

## Призначення
Відправка результату рев'ю коду як коментаря до існуючого Jira-тікету або створення нового.

## Авторизація
Jira Datacenter 9 — Bearer токен (Personal Access Token).

```js
const headers = {
  'Authorization': `Bearer ${process.env.JIRA_API_TOKEN}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Atlassian-Token': 'no-check',
};
```

## Патерн 1: Додати коментар до існуючого тікету

```js
const { apiCall } = require('../http/client');

/**
 * Додає коментар з результатом рев'ю до Jira-тікету
 * @param {string} issueKey - напр. 'PROJ-123'
 * @param {string} reviewText - результат рев'ю від Vertex AI
 * @returns {Promise<object>}
 */
async function addReviewComment(issueKey, reviewText) {
  const url = new URL(
    `/rest/api/2/issue/${issueKey}/comment`,
    process.env.JIRA_BASE_URL
  ).toString();

  const body = {
    body: formatJiraComment(reviewText),
  };

  return await apiCall({
    method: 'POST',
    url,
    headers: buildHeaders(),
    body,
  });
}
```

## Патерн 2: Створити нову задачу з результатом рев'ю

```js
/**
 * Створює Jira-задачу з результатом рев'ю
 * @param {object} params
 * @param {string} params.workspaceName
 * @param {string} params.serviceName
 * @param {string} params.reviewText
 * @returns {Promise<{ key: string }>} - ключ створеної задачі
 */
async function createReviewIssue({ workspaceName, serviceName, reviewText }) {
  const url = new URL('/rest/api/2/issue', process.env.JIRA_BASE_URL).toString();

  const body = {
    fields: {
      project: { key: process.env.JIRA_PROJECT_KEY },
      summary: `Code Review: ${serviceName} [${workspaceName}]`,
      description: formatJiraComment(reviewText),
      issuetype: { name: 'Task' },
    },
  };

  const result = await apiCall({
    method: 'POST',
    url,
    headers: buildHeaders(),
    body,
  });

  return { key: result.key };
}
```

## Форматування тексту для Jira

```js
/**
 * Форматує результат рев'ю у Jira Wiki Markup
 * @param {string} reviewText - markdown з Vertex AI
 * @returns {string}
 */
function formatJiraComment(reviewText) {
  // Jira Datacenter 9 підтримує Wiki Markup, не Markdown
  // Базова конвертація:
  return reviewText
    .replace(/^## (.+)$/gm, 'h2. $1')
    .replace(/^### (.+)$/gm, 'h3. $1')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/`([^`]+)`/g, '{{$1}}')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '{code}$1{code}');
}

function buildHeaders() {
  return {
    'Authorization': `Bearer ${process.env.JIRA_API_TOKEN}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Atlassian-Token': 'no-check',
  };
}
```

## Параметри конфігурації (.env)

Всі Jira-параметри — через `.env`, жодних hardcoded значень:

```
JIRA_BASE_URL=https://jira.bankit.com.ua   # без слешу в кінці
JIRA_API_TOKEN=your_personal_access_token
JIRA_PROJECT_KEY=SBL                        # ключ проєкту в Jira (напр. SBL, CRM, DEV)
JIRA_ISSUE_TYPE=Task                        # тип задачі: Task / Bug / Story
```

Читання в коді:
```js
const JIRA_CONFIG = {
  baseUrl:    process.env.JIRA_BASE_URL,
  token:      process.env.JIRA_API_TOKEN,
  projectKey: process.env.JIRA_PROJECT_KEY,
  issueType:  process.env.JIRA_ISSUE_TYPE || 'Task',
};
```

Використання при створенні задачі:
```js
fields: {
  project:   { key: JIRA_CONFIG.projectKey },
  issuetype: { name: JIRA_CONFIG.issueType },
  summary:   `Code Review: ${serviceName} [${workspaceName}]`,
  description: formatJiraComment(reviewText),
},
```

## Патерн 3: Публікація reviewScore та reviewResult у кастомні поля

Jira Datacenter 9 підтримує запис у кастомні поля при створенні задачі або sub-task.
ID полів задаються через `.env`:

```
JIRA_FIELD_REVIEW_SCORE=customfield_10500    # числова оцінка 0-100
JIRA_FIELD_REVIEW_RESULT=customfield_10501   # green / yellow / red
```

### Додавання до body при createSubtask / createReviewIssue

```js
/**
 * Будує fields для Jira issue з урахуванням кастомних полів рев'ю
 * @param {object} params
 * @param {string} params.reviewText   - markdown текст (конвертується у Wiki Markup)
 * @param {number} params.reviewScore  - 0-100
 * @param {string} params.reviewResult - "green" | "yellow" | "red"
 * @returns {object} fields
 */
function buildReviewFields({ reviewText, reviewScore, reviewResult, ...rest }) {
  const fields = {
    ...rest,
    description: formatJiraComment(reviewText),
  };

  if (process.env.JIRA_FIELD_REVIEW_SCORE && reviewScore !== undefined) {
    fields[process.env.JIRA_FIELD_REVIEW_SCORE] = reviewScore;
  }

  if (process.env.JIRA_FIELD_REVIEW_RESULT && reviewResult) {
    fields[process.env.JIRA_FIELD_REVIEW_RESULT] = { value: reviewResult };
  }

  return fields;
}
```

### Зворотна сумісність
Якщо `JIRA_FIELD_REVIEW_SCORE` / `JIRA_FIELD_REVIEW_RESULT` не задані —
кастомні поля не включаються до запиту. Jira не кидає помилку — просто
поля залишаються порожніми.

### Як дізнатися ID кастомного поля
```
GET {JIRA_BASE_URL}/rest/api/2/field
```
Шукати серед результатів за `name` або `clauseNames`.

---

## Правила
- `JIRA_BASE_URL` — без слешу в кінці
- `JIRA_PROJECT_KEY` — обов'язковий параметр, без нього кидати помилку зі зрозумілим повідомленням
- `JIRA_ISSUE_TYPE` — опціональний, default `Task`
- Завжди використовувати `/rest/api/2/` (не v3 — Datacenter 9 підтримує v2)
- Після успішної публікації — зберегти `jiraIssueKey` у state-файлі
- Якщо тікет вже має коментар рев'ю (є `jiraIssueKey` у state) — не дублювати, оновлювати
- `X-Atlassian-Token: no-check` — обов'язковий заголовок для Datacenter
- `JIRA_FIELD_REVIEW_SCORE` / `JIRA_FIELD_REVIEW_RESULT` — опціональні; якщо відсутні, поля не публікуються
- Перевіряти наявність обов'язкових змінних при старті застосунку (в `index.js`):

```js
const REQUIRED_ENV = [
  'SIEBEL_BASE_URL', 'SIEBEL_USERNAME', 'SIEBEL_PASSWORD',
  'JIRA_BASE_URL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
];

const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  logger.error('Відсутні обов\'язкові змінні середовища', { missing });
  process.exit(1);
}
```
