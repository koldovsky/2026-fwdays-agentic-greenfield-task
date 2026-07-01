# dev-007-state-store.md

## Контекст

dev-001 виконано. `data/` директорія існує.  
`workspaces-state.json` — єдине місце зберігання стану. Всі операції — тільки через `store.js`.  
Ніхто інший не читає/пише цей файл напряму (правило з `docs/rules/general.md`).

**Ідентифікатор воркспейсу:** поле `name` (унікальне, береться з Siebel API).  
Структура з `docs/SPEC.md` не містить поля `id` — `name` є природним ключем.

---

## Що зробити

Реалізувати `src/state/store.js` з п'ятьма функціями:

### readState()
- Читає `data/workspaces-state.json`
- При відсутності файлу (`ENOENT`) → повертає `{ lastPolledAt: null, workspaces: [] }`
- При інших помилках → кидає

### writeState(state)
- Записує `JSON.stringify(state, null, 2)` у файл
- Створює `data/` якщо не існує

### updateWorkspace(workspaceName, patch)
- Знаходить воркспейс по `ws.name === workspaceName`
- Застосовує `{ ...ws, ...patch }`
- Зберігає весь стан

### getPendingWorkspaces()
- Повертає масив воркспейсів де `processed === false`

### upsertWorkspaces(fetchedWorkspaces)
- Викликається після polling
- Для кожного нового воркспейсу (якого немає в state по `name`) — додає з `processed: false`
- Існуючі воркспейси — **не чіпати** (зберігає їх `processed`, `jiraIssueKey`, `error`)
- Оновлює `lastPolledAt` на поточний час

```js
// Структура state-файлу (з docs/SPEC.md):
{
  "lastPolledAt": "2026-06-24T10:00:00.000Z",
  "workspaces": [
    {
      "name": "dev_mmorozov_20260624_fixkyivstar",
      "status": "Delivered",
      "createdByName": "MMOROZOV",
      "businessServices": [...],
      "processed": false,
      "fetchedAt": "2026-06-24T10:00:00.000Z",
      "reviewResult": null,
      "jiraIssueKey": null,
      "error": null
    }
  ]
}
```

### Шлях до файлу
```js
const STATE_FILE = path.resolve(__dirname, '../../data/workspaces-state.json');
```

---

## Критерії готовності (Definition of Done)

- [x] `src/state/store.js` експортує всі 5 функцій
- [x] `readState()` повертає `{ lastPolledAt: null, workspaces: [] }` якщо файл відсутній
- [x] `writeState()` + `readState()` round-trip зберігає дані без втрат
- [x] `updateWorkspace('name', patch)` змінює лише target воркспейс, решта незмінна
- [x] `getPendingWorkspaces()` повертає лише `processed: false`
- [x] `upsertWorkspaces()` не перезаписує вже оброблені (`processed: true`) воркспейси
- [x] `node -e "require('./src/state/store').readState().then(console.log)"` — без помилок

---

## Приклади / Референси

- `docs/skills/json-state-file.md` → патерн readState/writeState
- `docs/SPEC.md` → структура state-файлу (секція 5)
- `docs/rules/general.md` → "State-файл — тільки через store.js"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
