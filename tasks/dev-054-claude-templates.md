# dev-054-claude-templates.md

## Контекст
Claude API підтримує prompt caching — можна зменшити витрати на токени.
Потрібні три окремих шаблони для різних режимів кешу.

## Що зробити
Реалізувати три файли у `src/claude/templates/`:

### no-cache.js
Виклик без кешування — стандартний запит.

### ephemeral-cache.js
5-хвилинний кеш: `cache_control: { type: 'ephemeral' }` на системній інструкції та user prompt.

### extended-cache.js
1-годинний кеш: `cache_control: { type: 'ephemeral', ttl: 3600 }` тільки на системній інструкції.
Доступний на Claude Sonnet 3.7+ / Claude 4.x.

Кожен шаблон — функція `buildRequest({ model, maxTokens, systemInstruction, userPrompt }) → object`.

## Критерії готовності

- [x] `src/claude/templates/no-cache.js` — без `cache_control`
- [x] `src/claude/templates/ephemeral-cache.js` — `cache_control` на system і messages
- [x] `src/claude/templates/extended-cache.js` — `cache_control` з `ttl: 3600` тільки на system
- [x] Кожен файл — функція що приймає `{ model, maxTokens, systemInstruction, userPrompt }`

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
