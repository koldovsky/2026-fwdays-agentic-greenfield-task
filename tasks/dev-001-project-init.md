# dev-001-project-init.md

## Контекст

Репозиторій вже ініціалізований: є `package.json` з базовими полями (`name`, `version`, `"type": "commonjs"`), але без залежностей і без робочих npm scripts. Директорії `src/`, `config/`, `data/`, `logs/`, `tests/` відсутні.

Це задача нульового рівня — всі інші dev-задачі залежать від неї.

---

## Що зробити

### 1. Встановити залежності

```bash
npm install axios node-cron @google/genai winston dotenv
```

| Пакет | Версія (мін.) | Призначення |
|-------|--------------|-------------|
| `axios` | ^1.x | HTTP-клієнт для Siebel і Jira |
| `node-cron` | ^3.x | Scheduler для polling |
| `@google/genai` | ^1.x | Vertex AI SDK (не `@google-cloud/vertexai`) |
| `winston` | ^3.x | Логування |
| `dotenv` | ^16.x | Завантаження `.env` |

### 2. Встановити dev-залежності

```bash
npm install --save-dev jest
```

### 3. Оновити `package.json`

Встановити `scripts`:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "jest"
  }
}
```

Поле `"main"` змінити на `"src/index.js"`.

Переконатись, що `"type": "commonjs"` збережено.

### 4. Створити структуру директорій

Створити порожні директорії (з `.gitkeep` щоб потрапили в git):

```
src/
  siebel/
  vertex/
  jira/
  state/
  utils/
config/
data/
logs/
  workspaces/
tests/
tasks/        ← вже існує
docs/         ← вже існує
```

Команда:
```bash
mkdir -p src/siebel src/vertex src/jira src/state src/utils config data logs/workspaces tests
```

> `data/` і `logs/` — в `.gitignore` (задача dev-004), але директорії потрібні локально.

### 5. Перевірити `package.json` після встановлення

Перевірити що в `dependencies` є всі п'ять пакетів, у `devDependencies` — `jest`, `"type"` — `"commonjs"`.

---

## Критерії готовності (Definition of Done)

- [x] `npm install` виконується без помилок
- [x] `package.json` містить всі п'ять `dependencies`: `axios`, `node-cron`, `@google/genai`, `winston`, `dotenv`
- [x] `package.json` містить `jest` у `devDependencies`
- [x] `scripts.start` запускає `node src/index.js`
- [x] `scripts.test` запускає `jest`
- [x] `"type": "commonjs"` збережено
- [x] Директорії `src/siebel/`, `src/vertex/`, `src/jira/`, `src/state/`, `src/utils/`, `config/`, `data/`, `logs/workspaces/`, `tests/` створені
- [x] `node_modules/` НЕ закомічено (є або буде в `.gitignore`)

---

## Приклади / Референси

- Поточний `package.json` → вже є в корені, тип CommonJS підтверджено
- `docs/skills/http-rest-api.md` → підтверджує вибір `axios`
- `docs/skills/vertex-ai-prompt.md` → підтверджує `@google/genai` (не `@google-cloud/vertexai`)
- `docs/skills/logging.md` → підтверджує `winston`
- `CLAUDE.md` → стек проєкту, секція "Стек"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
