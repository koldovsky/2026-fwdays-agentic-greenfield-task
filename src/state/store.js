'use strict';

const fs = require('fs').promises;
const path = require('path');

const DEFAULT_STATE_FILE = path.resolve(__dirname, '../../data/workspaces-state.json');

function getStateFile() {
  return process.env.STATE_FILE_PATH || DEFAULT_STATE_FILE;
}

/**
 * Зчитує поточний стан з файлу.
 * При відсутності файлу повертає порожній стан.
 * @returns {Promise<{ lastPolledAt: string|null, workspaces: object[] }>}
 */
async function readState() {
  try {
    const raw = await fs.readFile(getStateFile(), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { lastPolledAt: null, workspaces: [] };
    }
    throw err;
  }
}

/**
 * Записує оновлений стан у файл.
 * @param {{ lastPolledAt: string|null, workspaces: object[] }} state
 * @returns {Promise<void>}
 */
async function writeState(state) {
  const dir = path.dirname(getStateFile());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getStateFile(), JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Оновлює конкретний воркспейс за назвою (name — унікальний ідентифікатор).
 * @param {string} workspaceName
 * @param {object} patch - поля для оновлення
 * @returns {Promise<void>}
 */
async function updateWorkspace(workspaceName, patch) {
  const state = await readState();
  state.workspaces = state.workspaces.map(ws =>
    ws.name === workspaceName ? { ...ws, ...patch } : ws
  );
  await writeState(state);
}

/**
 * Повертає всі необроблені воркспейси (processed === false).
 * @returns {Promise<object[]>}
 */
async function getPendingWorkspaces() {
  const state = await readState();
  return state.workspaces.filter(ws => ws.processed === false);
}

/**
 * Оновлює state після polling: додає нові воркспейси, не чіпає вже оброблені.
 * @param {object[]} fetchedWorkspaces - масив воркспейсів з Siebel API
 * @returns {Promise<void>}
 */
async function upsertWorkspaces(fetchedWorkspaces) {
  const state = await readState();

  const existingByName = new Map(state.workspaces.map(ws => [ws.name, ws]));

  for (const fetched of fetchedWorkspaces) {
    if (!existingByName.has(fetched.name)) {
      existingByName.set(fetched.name, fetched);
    }
  }

  state.workspaces = Array.from(existingByName.values());
  state.lastPolledAt = new Date().toISOString();

  await writeState(state);
}

module.exports = { readState, writeState, updateWorkspace, getPendingWorkspaces, upsertWorkspaces };
