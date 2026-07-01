# dev-004-gitignore.md

## Контекст

dev-001 виконано. Директорії `data/` і `logs/` вже існують (з `.gitkeep`), але їх вміст не має потрапляти в git.  
`service-account.json` — Google credentials, критичний секрет.

---

## Що зробити

Створити `.gitignore` у корені проєкту.

Обов'язково виключити:
- `.env` — секрети застосунку
- `service-account.json` — Google Vertex AI credentials
- `node_modules/` — npm пакети
- `data/` — state-файл з даними воркспейсів (може містити чутливі назви)
- `logs/` — логи (можуть містити sensitive дані у трейсах)

Також виключити типові артефакти:
- `*.log` — окремі log-файли якщо з'являться поза `logs/`

---

## Критерії готовності (Definition of Done)

- [x] `.gitignore` є в корені
- [x] `git check-ignore -v .env` повертає `.gitignore`
- [x] `git check-ignore -v service-account.json` повертає `.gitignore`
- [x] `git check-ignore -v data/workspaces-state.json` повертає `.gitignore`
- [x] `git check-ignore -v logs/app.log` повертає `.gitignore`
- [x] `node_modules/` виключено

---

## Приклади / Референси

- `CLAUDE.md` → секція "Заборони", "Структура проєкту"
- `docs/rules/general.md` → "`.env` та `data/` — в `.gitignore`"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
