# qa-060-claude-reviewer-tests.md

## Контекст
Перевірити всі функції `src/claude/reviewer.js` через unit-тести.

## Що зробити
Створити `tests/claudeReviewer.test.js`:

### buildPrompt
- null якщо scripts порожній або undefined
- містить workspaceName, parentName
- містить секцію "Формат відповіді" з полями JSON

### parseReviewResponse
- успішний парсинг green/yellow/red
- кидає при відсутньому JSON блоці
- кидає якщо reviewScore не число
- кидає якщо reviewResult невалідний
- кидає якщо reviewText відсутній
- кидає при невалідному JSON

### reviewBusinessService
- повертає null якщо scripts порожній
- повертає `{ reviewText, reviewScore, reviewResult }`
- model та max_tokens беруться з config
- cacheMode=none → немає cache_control
- cacheMode=ephemeral → cache_control на system і messages
- cacheMode=extended → cache_control з ttl на system, не на messages

## Критерії готовності

- [x] `tests/claudeReviewer.test.js` створено
- [x] Всі тести зелені
- [x] Покриття: null guard, успішний парсинг, всі типи помилок, всі cacheMode

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
