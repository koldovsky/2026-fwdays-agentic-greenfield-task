# qa-062-jira-custom-fields-tests.md

## Контекст
Оновити `tests/createReviewIssue.test.js` під нові параметри `reviewScore`/`reviewResult`
та кастомні Jira-поля.

## Що зробити
Оновити `tests/createReviewIssue.test.js`:
- Додати `reviewScore: 85, reviewResult: 'green'` до `BASE_PARAMS`
- Новий describe "кастомні поля reviewScore/reviewResult":
  - `JIRA_FIELD_REVIEW_SCORE` задано → `customfield_10500 = 85`
  - `JIRA_FIELD_REVIEW_RESULT` задано → `customfield_10501 = { value: 'green' }`
  - без `JIRA_FIELD_*` → поля відсутні у body
- Оновити createSubtask тести: `reviewScore: 72, reviewResult: 'yellow'` + перевірка кастомних полів

## Критерії готовності

- [x] `tests/createReviewIssue.test.js` оновлено
- [x] Всі тести зелені (включно з попередніми)
- [x] Перевірено: score + result в body, відсутність полів без env

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
