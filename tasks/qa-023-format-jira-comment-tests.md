# qa-023-format-jira-comment-tests.md

## Контекст

dev-022 виконано — `formatJiraComment` є в `src/jira/issues.js`.
Чиста функція без I/O — тестується без mock.

---

## Що зробити

Створити `tests/formatJiraComment.test.js`.

### Тест-кейси

- `## Title` → `h2. Title`
- `### Subtitle` → `h3. Subtitle`
- `**bold**` → `*bold*`
- `` `inline code` `` → `{{inline code}}`
- ` ```js\ncode\n``` ` → `{code}code\n{code}`
- Порожній рядок → повертає порожній рядок без помилок
- Комбінований вхід → всі правила застосовуються одночасно

---

## Критерії готовності (Definition of Done)

- [x] `tests/formatJiraComment.test.js` існує
- [x] `npx jest tests/formatJiraComment.test.js` — всі тести зелені
- [x] Покрито: h2, h3, bold, inline code, code block, порожній рядок

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
