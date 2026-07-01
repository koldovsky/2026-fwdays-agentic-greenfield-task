# Skill: Робота з JSON state-файлом

## Призначення
`data/workspaces-state.json` — єдине місце зберігання стану воркспейсів.
Всі операції з ним — тільки через `src/state/store.js`.

## Структура файлу

```json
{
  "lastPolledAt": "2024-01-15T10:30:00.000Z",
  "workspaces": [
    {
      "id": "workspace-001",
      "name": "WS_FEATURE_X",
      "fetchedAt": "2024-01-15T10:30:00.000Z",
      "processed": false,
      "objects": [
        {
          "type": "Business Service",
          "name": "MyBusinessService"
        },
        {
          "type": "Applet",
          "name": "MyApplet"
        }
      ],
      "reviewResult": null,
      "jiraIssueKey": null,
      "error": null
    }
  ]
}
```

## Патерн читання/запису (store.js)

```js
const fs = require('fs').promises;
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '../../data/workspaces-state.json');

/**
 * Зчитує поточний стан
 * @returns {Promise<object>}
 */
async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { lastPolledAt: null, workspaces: [] };
    }
    throw err;
  }
}

/**
 * Записує оновлений стан
 * @param {object} state
 * @returns {Promise<void>}
 */
async function writeState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Оновлює конкретний воркспейс за id
 * @param {string} workspaceId
 * @param {object} patch - поля для оновлення
 * @returns {Promise<void>}
 */
async function updateWorkspace(workspaceId, patch) {
  const state = await readState();
  state.workspaces = state.workspaces.map(ws =>
    ws.id === workspaceId ? { ...ws, ...patch } : ws
  );
  await writeState(state);
}

/**
 * Повертає всі необроблені воркспейси
 * @returns {Promise<object[]>}
 */
async function getPendingWorkspaces() {
  const state = await readState();
  return state.workspaces.filter(ws => ws.processed === false);
}

module.exports = { readState, writeState, updateWorkspace, getPendingWorkspaces };
```

## Правила
- Ніколи не читати/писати state-файл напряму поза `store.js`
- Після кожного запису перевіряти що файл валідний JSON (автоматично через `JSON.stringify`)
- Поле `processed` виставляти в `true` тільки після успішної публікації в Jira
- При помилці на будь-якому кроці — записати в поле `error`, `processed` залишити `false`
- `data/` папка має бути в `.gitignore`
