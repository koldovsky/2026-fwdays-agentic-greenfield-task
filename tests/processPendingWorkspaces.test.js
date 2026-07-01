'use strict';

jest.mock('../src/state/store');
jest.mock('../src/siebel/services');
jest.mock('../src/vertex/reviewer');
jest.mock('../src/jira/issues');
jest.mock('../src/utils/workspaceLogger', () => ({
  createWorkspaceLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

const { getPendingWorkspaces, updateWorkspace } = require('../src/state/store');
const { fetchAllServiceScripts, transformToReviewPayload } = require('../src/siebel/services');
const { reviewBusinessService } = require('../src/vertex/reviewer');
const { createReviewIssue } = require('../src/jira/issues');
const { processPendingWorkspaces } = require('../src/processor');

const CONFIG = { siebel: { concurrency: 3 }, ai: {} };

const ACTIVE_ITEM = { Name: 'Init', Script: 'fn', 'Parent Name': 'SvcB', Inactive: 'N' };

beforeEach(() => {
  jest.clearAllMocks();
  updateWorkspace.mockResolvedValue();
});

describe('processPendingWorkspaces — порожній список', () => {
  it('нічого не робить якщо немає pending воркспейсів', async () => {
    getPendingWorkspaces.mockResolvedValue([]);
    await processPendingWorkspaces(CONFIG);
    expect(fetchAllServiceScripts).not.toHaveBeenCalled();
    expect(updateWorkspace).not.toHaveBeenCalled();
  });
});

describe('processPendingWorkspaces — ізоляція помилок', () => {
  it('один воркспейс кидає — решта обробляється', async () => {
    const ws_fail = { name: 'ws_fail', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };
    const ws_ok   = { name: 'ws_ok',   businessServices: [{ ObjName: 'SvcB' }], jiraIssueKey: null };

    getPendingWorkspaces.mockResolvedValue([ws_fail, ws_ok]);

    fetchAllServiceScripts
      .mockRejectedValueOnce(new Error('Siebel timeout'))
      .mockResolvedValueOnce([ACTIVE_ITEM]);

    transformToReviewPayload.mockReturnValue({
      workspaceName: 'ws_ok', parentName: 'SvcB',
      scripts: [{ name: 'Init', body: 'fn' }],
    });
    reviewBusinessService.mockResolvedValue('review ok');
    createReviewIssue.mockResolvedValue({ key: 'SBL-1' });

    await expect(processPendingWorkspaces(CONFIG)).resolves.not.toThrow();
  });

  it('стан помилки записується для ws_fail', async () => {
    const ws_fail = { name: 'ws_fail', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };
    const ws_ok   = { name: 'ws_ok',   businessServices: [{ ObjName: 'SvcB' }], jiraIssueKey: null };

    getPendingWorkspaces.mockResolvedValue([ws_fail, ws_ok]);

    fetchAllServiceScripts
      .mockRejectedValueOnce(new Error('Siebel timeout'))
      .mockResolvedValueOnce([ACTIVE_ITEM]);

    transformToReviewPayload.mockReturnValue({
      workspaceName: 'ws_ok', parentName: 'SvcB',
      scripts: [{ name: 'Init', body: 'fn' }],
    });
    reviewBusinessService.mockResolvedValue('review ok');
    createReviewIssue.mockResolvedValue({ key: 'SBL-1' });

    await processPendingWorkspaces(CONFIG);

    expect(updateWorkspace).toHaveBeenCalledWith(
      'ws_fail', expect.objectContaining({ error: 'Siebel timeout' })
    );
  });

  it('ws_ok успішно обробляється попри помилку ws_fail', async () => {
    const ws_fail = { name: 'ws_fail', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };
    const ws_ok   = { name: 'ws_ok',   businessServices: [{ ObjName: 'SvcB' }], jiraIssueKey: null };

    getPendingWorkspaces.mockResolvedValue([ws_fail, ws_ok]);

    fetchAllServiceScripts
      .mockRejectedValueOnce(new Error('Siebel timeout'))
      .mockResolvedValueOnce([ACTIVE_ITEM]);

    transformToReviewPayload.mockReturnValue({
      workspaceName: 'ws_ok', parentName: 'SvcB',
      scripts: [{ name: 'Init', body: 'fn' }],
    });
    reviewBusinessService.mockResolvedValue('review ok');
    createReviewIssue.mockResolvedValue({ key: 'SBL-1' });

    await processPendingWorkspaces(CONFIG);

    expect(updateWorkspace).toHaveBeenCalledWith(
      'ws_ok', expect.objectContaining({ processed: true, jiraIssueKey: 'SBL-1' })
    );
  });
});
