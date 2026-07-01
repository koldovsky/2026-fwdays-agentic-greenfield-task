# dev-058-jira-custom-fields.md

## Контекст
Jira Datacenter дозволяє записувати кастомні поля при створенні задачі.
Треба публікувати `reviewScore` (число) та `reviewResult` (green/yellow/red)
у поля що задаються через env.

## Що зробити
Оновити `src/jira/issues.js`:
- Додати `applyReviewFields(fields, reviewScore, reviewResult)` — додає кастомні поля якщо env задані
  - `JIRA_FIELD_REVIEW_SCORE` → `fields[fieldId] = reviewScore`
  - `JIRA_FIELD_REVIEW_RESULT` → `fields[fieldId] = { value: reviewResult }`
- `createReviewIssue` приймає `reviewScore`, `reviewResult` → викликає `applyReviewFields`
- `createSubtask` приймає `reviewScore`, `reviewResult` → викликає `applyReviewFields`

## Критерії готовності

- [x] `createReviewIssue` підтримує `reviewScore`, `reviewResult` параметри
- [x] `createSubtask` підтримує `reviewScore`, `reviewResult` параметри
- [x] Якщо `JIRA_FIELD_*` не задані — поля не включаються до body (зворотна сумісність)
- [x] `reviewResult` записується як `{ value: '...' }` (список значень у Jira)
- [x] `applyReviewFields` не мутує fields при відсутніх env

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
