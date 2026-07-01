'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const TMP_FILE = path.join(os.tmpdir(), `store-test-${Date.now()}.json`);

beforeAll(() => {
  process.env.STATE_FILE_PATH = TMP_FILE;
});

afterEach(async () => {
  try {
    await fs.unlink(TMP_FILE);
  } catch {
    // файл може не існувати — це нормально
  }
});

// Ізольований require після виставлення env
const { readState, writeState, updateWorkspace, getPendingWorkspaces, upsertWorkspaces } =
  require('../src/state/store');

describe('readState()', () => {
  it('повертає порожній стан якщо файл не існує', async () => {
    const state = await readState();
    expect(state).toEqual({ lastPolledAt: null, workspaces: [] });
  });
});

describe('writeState() + readState()', () => {
  it('зберігає і зчитує стан без втрат (round-trip)', async () => {
    const data = {
      lastPolledAt: '2026-06-24T10:00:00.000Z',
      workspaces: [{ name: 'ws1', processed: false, jiraIssueKey: null }],
    };
    await writeState(data);
    expect(await readState()).toEqual(data);
  });
});

describe('updateWorkspace()', () => {
  it('змінює тільки вказаний воркспейс, решта незмінна', async () => {
    await writeState({
      lastPolledAt: null,
      workspaces: [
        { name: 'ws1', processed: false, jiraIssueKey: null },
        { name: 'ws2', processed: false, jiraIssueKey: null },
      ],
    });

    await updateWorkspace('ws1', { processed: true, jiraIssueKey: 'SBL-1' });

    const { workspaces } = await readState();
    expect(workspaces.find(w => w.name === 'ws1')).toMatchObject({ processed: true, jiraIssueKey: 'SBL-1' });
    expect(workspaces.find(w => w.name === 'ws2')).toMatchObject({ processed: false, jiraIssueKey: null });
  });
});

describe('getPendingWorkspaces()', () => {
  it('повертає тільки воркспейси з processed: false', async () => {
    await writeState({
      lastPolledAt: null,
      workspaces: [
        { name: 'ws1', processed: true },
        { name: 'ws2', processed: false },
        { name: 'ws3', processed: false },
      ],
    });

    const pending = await getPendingWorkspaces();
    expect(pending).toHaveLength(2);
    expect(pending.every(w => w.processed === false)).toBe(true);
    expect(pending.find(w => w.name === 'ws1')).toBeUndefined();
  });
});

describe('upsertWorkspaces()', () => {
  it('додає нові воркспейси без зміни існуючих', async () => {
    await writeState({
      lastPolledAt: null,
      workspaces: [
        { name: 'ws1', processed: true, jiraIssueKey: 'SBL-1' },
      ],
    });

    await upsertWorkspaces([
      { name: 'ws1', businessServices: [], processed: false },
      { name: 'ws2', businessServices: [], processed: false },
    ]);

    const { workspaces } = await readState();
    expect(workspaces).toHaveLength(2);
    expect(workspaces.find(w => w.name === 'ws1')).toMatchObject({ processed: true, jiraIssueKey: 'SBL-1' });
    expect(workspaces.find(w => w.name === 'ws2')).toMatchObject({ processed: false });
  });

  it('оновлює lastPolledAt після upsert', async () => {
    const before = new Date().toISOString();
    await upsertWorkspaces([{ name: 'ws1', businessServices: [], processed: false }]);
    const { lastPolledAt } = await readState();
    expect(lastPolledAt).not.toBeNull();
    expect(new Date(lastPolledAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
});
