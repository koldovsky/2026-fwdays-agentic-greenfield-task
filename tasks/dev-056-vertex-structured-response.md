# dev-056-vertex-structured-response.md

## Контекст
Vertex reviewer повертав сирий текст. Тепер обидва провайдери мають повертати
однаковий структурований формат `{ reviewText, reviewScore, reviewResult }`.

## Що зробити
Оновити `src/vertex/reviewer.js`:
- Оновити `buildPrompt` — новий формат відповіді: JSON з `reviewScore`, `reviewResult`, `reviewText`
- Додати `parseReviewResponse(rawText)` — витягує і валідує JSON блок (аналогічно claude)
- `reviewBusinessService` тепер повертає `parseReviewResponse(response.text)`
- Оновити шлях конфігу: `config.ai.vertex` замість `config.ai` / `config.ai.vertexAi`

## Критерії готовності

- [x] `buildPrompt` запитує JSON формат відповіді з `reviewScore`, `reviewResult`, `reviewText`
- [x] `parseReviewResponse` валідує `reviewResult` значення `green/yellow/red`
- [x] `reviewBusinessService` повертає `{ reviewText, reviewScore, reviewResult }`
- [x] Конфіг береться з `config.ai.vertex`
- [x] Модуль експортує `{ buildPrompt, parseReviewResponse, reviewBusinessService }`

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
