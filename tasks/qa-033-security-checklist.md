# qa-033-security-checklist.md

## Контекст

Фінальна перевірка безпеки перед завершенням проєкту.

---

## Що перевірити

### .gitignore
- [x] `.env` присутній
- [x] `data/` присутній
- [x] `logs/` присутній
- [x] `service-account.json` присутній

### Вихідний код — відсутність секретів
- [x] Жодних токенів/паролів у `.js` файлах — `Bearer` тільки через `process.env.JIRA_API_TOKEN`
- [x] Жодних хардкоджених URL (`https://jira.`, `https://siebel.`) — всі через `process.env`
- [x] Всі `.env` змінні використовуються через `process.env`

### Структура проєкту
- [x] `.env.example` є в репозиторії з порожніми значеннями
- [x] `data/workspaces-state.json` не потрапляє в git (covered by `data/` у .gitignore)

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
