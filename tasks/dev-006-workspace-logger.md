# dev-006-workspace-logger.md

## Контекст

dev-005 виконано — загальний `logger` є.  
Per-workspace логер потрібен для детального трейсу кожного воркспейсу що містить Business Service.  
Воркспейси без Business Service — лише рядок у `app.log`, окремого файлу не отримують.

---

## Що зробити

Реалізувати `src/utils/workspaceLogger.js` за патерном з `docs/skills/logging.md`.

**Функція:** `createWorkspaceLogger(workspaceName)` → `winston.Logger`

**Назва файлу:** `logs/workspaces/YYYY-MM-DD_<safeName>.log`  
де `safeName = workspaceName.replace(/[^a-zA-Z0-9_\-\.]/g, '_')`

**Приклад:**
- вхід: `dev_mmorozov_20260624_fixkyivstar`
- файл: `logs/workspaces/2026-06-24_dev_mmorozov_20260624_fixkyivstar.log`

**Формат рядка:**
```
2026-06-24 10:30:00 [INFO] Завантаження Business Service скриптів з Siebel
```

**Якщо той самий воркспейс обробляється повторно того ж дня** — дописується в той самий файл (не перезаписується).

**Директорія** `logs/workspaces/` — створити якщо не існує (`fs.mkdirSync(..., { recursive: true })`).

---

## Критерії готовності (Definition of Done)

- [x] `src/utils/workspaceLogger.js` експортує `{ createWorkspaceLogger }`
- [x] Виклик `createWorkspaceLogger('dev_test_ws')` повертає логер без помилок
- [x] Файл `logs/workspaces/YYYY-MM-DD_dev_test_ws.log` створюється після першого запису
- [x] Назва файлу sanitize: символи поза `[a-zA-Z0-9_\-\.]` замінюються на `_`
- [x] `node -e "require('./src/utils/workspaceLogger').createWorkspaceLogger('test').info('ok')"` — без помилок

---

## Приклади / Референси

- `docs/skills/logging.md` → `createWorkspaceLogger` патерн

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
