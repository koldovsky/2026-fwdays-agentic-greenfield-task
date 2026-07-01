# qa-063-processor-index-tests.md

## Контекст
Оновити тести processor та index під нові залежності та поведінку.

## Що зробити

### tests/processWorkspace.test.js
- Замінити mock `../src/vertex/reviewer` на `../src/ai/selector`
- `reviewBusinessService` тепер mock повертає `{ reviewText, reviewScore, reviewResult }`
- Додати перевірку: `createReviewIssue` отримує `reviewScore` та `reviewResult`

### tests/processWorkspaceWebhook.test.js
- Замінити mock `../src/vertex/reviewer` на `../src/ai/selector`
- `reviewBusinessService` повертає structured object
- Додати перевірку: `createSubtask` отримує `reviewScore` та `reviewResult`

### tests/index.test.js
- Додати cleanup `delete process.env.AI_PROVIDER` та `delete process.env.ANTHROPIC_API_KEY` у `afterEach`
- Додати describe "AI_PROVIDER=claude без ANTHROPIC_API_KEY":
  - claude + без ключа → exit(1)
  - claude + є ключ → нормальний старт
  - vertex → ключ не потрібен

## Критерії готовності

- [x] `tests/processWorkspace.test.js` оновлено (mock selector)
- [x] `tests/processWorkspaceWebhook.test.js` оновлено (mock selector + score/result)
- [x] `tests/index.test.js` оновлено (3 нові тести AI_PROVIDER)
- [x] Всі 167 тестів зелені

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
