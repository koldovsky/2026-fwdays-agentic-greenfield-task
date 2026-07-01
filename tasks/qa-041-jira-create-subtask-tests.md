# qa-041-jira-create-subtask-tests.md

## Контекст

Перевіряємо `createSubtask` з dev-040.

---

## Що зробити

Додати тести до `tests/createReviewIssue.test.js` або окремий файл:

1. Тіло запиту містить `issuetype.name = 'Sub-task'`
2. Тіло запиту містить `parent.key = parentIssueKey`
3. Тіло запиту містить `assignee.name = assignee`
4. Тіло запиту НЕ містить `project.key`
5. Повертає `{ key }` з відповіді Jira

---

## Критерії готовності

- [x] 5 тестів, всі зелені
- [x] `npm test` — весь suite проходить

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
