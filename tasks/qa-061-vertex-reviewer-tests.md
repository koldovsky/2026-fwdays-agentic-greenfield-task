# qa-061-vertex-reviewer-tests.md

## Контекст
`tests/reviewer.test.js` використовував старий `ai.vertexAi` конфіг та очікував сирий текст.
Після dev-056 потрібно оновити під нову структуру.

## Що зробити
Оновити `tests/reviewer.test.js`:
- `BASE_CONFIG.ai.vertex` замість `ai.vertexAi`
- Mock `mockGenerateContent` повертає валідний JSON блок
- Тест "повертає response.text" → "повертає `{ reviewText, reviewScore, reviewResult }`"
- Додати тести `parseReviewResponse` (успіх, помилки)
- Додати тест: кидає якщо Vertex не повернув JSON блок

## Критерії готовності

- [x] `tests/reviewer.test.js` оновлено
- [x] `BASE_CONFIG` використовує `ai.vertex`
- [x] Всі тести зелені
- [x] Перевірено: `parseReviewResponse`, null guard, PROJECT_ID, safetySettings, thinkingConfig, structured result

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
