# dev-057-processor-selector.md

## Контекст
`processor.js` напряму імпортував `src/vertex/reviewer`. Треба перейти на
`ai/selector.js` щоб підтримувати обидва провайдери.

## Що зробити
Оновити `src/processor.js`:
- Замінити `require('./vertex/reviewer')` на `const { getReviewer } = require('./ai/selector')`
- Викликати `getReviewer()` всередині `processWorkspace` та `processWorkspaceWebhook`
- Обробляти structured response `{ reviewText, reviewScore, reviewResult }` від AI
- Комбінувати оцінки кількох BS: avgScore (середнє), combinedResult (worst-case: red > yellow > green)
- Передавати `reviewScore` та `reviewResult` у `createReviewIssue` / `createSubtask`

## Критерії готовності

- [x] `getReviewer()` викликається — не прямий import vertex
- [x] `reviewBusinessService` повертає `{ reviewText, reviewScore, reviewResult }`
- [x] avgScore — середнє округлене значення по всіх BS
- [x] combinedResult — найгірший результат: red > yellow > green
- [x] `createReviewIssue` отримує `reviewScore` та `reviewResult`
- [x] `createSubtask` отримує `reviewScore` та `reviewResult`

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
