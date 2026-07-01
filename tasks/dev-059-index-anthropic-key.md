# dev-059-index-anthropic-key.md

## Контекст
`ANTHROPIC_API_KEY` потрібен тільки при `AI_PROVIDER=claude`.
При `AI_PROVIDER=vertex` (або не заданому) ключ не обов'язковий.

## Що зробити
Оновити `src/index.js`:
- Після збору `missing` зі стандартних `REQUIRED_ENV` — окрема перевірка:
  `if (process.env.AI_PROVIDER === 'claude' && !process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY')`

## Критерії готовності

- [x] `AI_PROVIDER=claude` без `ANTHROPIC_API_KEY` → `process.exit(1)`
- [x] `AI_PROVIDER=vertex` без `ANTHROPIC_API_KEY` → нормальний старт
- [x] `AI_PROVIDER` не задано → нормальний старт (vertex за замовчуванням)

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
