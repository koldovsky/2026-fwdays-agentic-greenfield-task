# dev-055-claude-reviewer.md

## Контекст
Основний модуль для Claude API. Повторює інтерфейс vertex reviewer щоб
`processor.js` міг використовувати обидва провайдери без зміни коду.

## Що зробити
Реалізувати `src/claude/reviewer.js`:

- `buildPrompt({ workspaceName, parentName, scripts })` — формує prompt, null якщо scripts порожній
- `parseReviewResponse(rawText)` — витягує JSON з ```json блоку, валідує поля
- `reviewBusinessService(serviceData, config)` — основна функція
  - завантажує системну інструкцію з `config.ai.claude.systemInstructionFile`
  - вибирає шаблон за `config.ai.claude.cacheMode` (`none` / `ephemeral` / `extended`)
  - викликає `Anthropic.messages.create()`
  - повертає `{ reviewText, reviewScore, reviewResult }`

## Критерії готовності

- [x] `reviewBusinessService` повертає `null` якщо `scripts` порожній
- [x] `parseReviewResponse` кидає якщо немає JSON блоку
- [x] `parseReviewResponse` кидає якщо `reviewScore` не число
- [x] `parseReviewResponse` кидає якщо `reviewResult` не green/yellow/red
- [x] Вибір шаблону: `none` → `no-cache.js`, `ephemeral` → `ephemeral-cache.js`, `extended` → `extended-cache.js`
- [x] `ANTHROPIC_API_KEY` береться з `process.env`
- [x] Модуль експортує `{ reviewBusinessService, buildPrompt, parseReviewResponse }`

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
