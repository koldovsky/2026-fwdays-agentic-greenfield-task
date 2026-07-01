# dev-052-claude-setup.md

## Контекст
Додаємо підтримку Claude API як альтернативного AI-провайдера.
Перший крок — оновити залежності, конфіг та env-шаблон.

## Що зробити
- Додати `@anthropic-ai/sdk` до `package.json`
- Оновити `config.json`: додати секцію `ai.claude` (model, maxTokens, cacheMode, systemInstructionFile)
- Оновити `config.json`: перейменувати `ai.vertexAi` → `ai.vertex`
- Оновити `.env.example`: `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `JIRA_FIELD_REVIEW_SCORE`, `JIRA_FIELD_REVIEW_RESULT`

## Критерії готовності

- [x] `@anthropic-ai/sdk` у `dependencies` в `package.json`
- [x] `config.json` містить секцію `ai.claude` з `model`, `maxTokens`, `cacheMode`, `systemInstructionFile`
- [x] `config.json` секція `ai.vertex` (замість `ai.vertexAi`)
- [x] `.env.example` містить `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `JIRA_FIELD_REVIEW_SCORE`, `JIRA_FIELD_REVIEW_RESULT`
- [x] `npm install` виконується без помилок

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
