# qa-024-jira-no-duplicate-tests.md

## Контекст

dev-022 виконано. `createReviewIssue` має захист від дублювання через `jiraIssueKey`.
Потрібен mock `src/jira/client.js`.

---

## Що зробити

Створити `tests/createReviewIssue.test.js`.

### Стратегія мокування

```js
jest.mock('../src/jira/client', () => ({
  apiCall: jest.fn(),
  buildJiraHeaders: jest.fn(() => ({})),
}));
const { apiCall } = require('../src/jira/client');
```

### Тест-кейси

- Якщо `jiraIssueKey` передано → повертає `{ key: jiraIssueKey }` без виклику `apiCall`
- Якщо `jiraIssueKey` відсутній → викликає `apiCall` і повертає `{ key }` з відповіді
- Summary містить `serviceName` та `workspaceName`
- URL містить `/rest/api/2/issue`
- `description` у тілі запиту — результат `formatJiraComment`

---

## Критерії готовності (Definition of Done)

- [x] `tests/createReviewIssue.test.js` існує
- [x] `jest.mock` для `src/jira/client`
- [x] `npx jest tests/createReviewIssue.test.js` — всі тести зелені
- [x] Покрито: захист від дублювання, виклик apiCall, структура тіла запиту

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
