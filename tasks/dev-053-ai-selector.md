# dev-053-ai-selector.md

## Контекст
Потрібен єдиний вхід для вибору AI-провайдера без зміни коду в `processor.js`.
Вибір відбувається через env-змінну `AI_PROVIDER`.

## Що зробити
Реалізувати `src/ai/selector.js`:
- `getReviewer()` — повертає reviewer для поточного провайдера
- `AI_PROVIDER=claude` → `require('../claude/reviewer')`
- Інакше → `require('../vertex/reviewer')` (за замовчуванням)

## Критерії готовності

- [x] `src/ai/selector.js` створено
- [x] `getReviewer()` повертає правильний модуль залежно від `AI_PROVIDER`
- [x] `AI_PROVIDER` не задано → vertex (безпечний default)
- [x] Модуль експортує `{ getReviewer }`

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
