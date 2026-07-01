'use strict';

const mockReviewBusinessService = jest.fn();

jest.mock('../src/siebel/workspaces',   () => ({ fetchWorkspaces: jest.fn() }));
jest.mock('../src/siebel/services',     () => ({ fetchAllServiceScripts: jest.fn(), transformToReviewPayload: jest.fn() }));
jest.mock('../src/ai/selector',         () => ({ getReviewer: jest.fn(() => ({ reviewBusinessService: mockReviewBusinessService })) }));
jest.mock('../src/jira/issues',         () => ({ createReviewIssue: jest.fn(), createSubtask: jest.fn() }));
jest.mock('../src/state/store',         () => ({ getPendingWorkspaces: jest.fn(), updateWorkspace: jest.fn() }));
jest.mock('../src/utils/logger',        () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../src/utils/workspaceLogger', () => ({
  createWorkspaceLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

const { fetchWorkspaces }        = require('../src/siebel/workspaces');
const { fetchAllServiceScripts, transformToReviewPayload } = require('../src/siebel/services');
const { createSubtask, createReviewIssue } = require('../src/jira/issues');
const { updateWorkspace }        = require('../src/state/store');
const { processWorkspaceWebhook } = require('../src/processor');

const CONFIG = { ai: {}, siebel: {} };
const PARAMS = { workspaceName: 'dev_test', jiraIssueKey: 'SBL-123', user: 'MMOROZOV' };

const BS = [{ ObjName: 'MySvc', ObjType: 'Business Service' }];
const WORKSPACE = { name: 'dev_test', businessServices: BS };
const REVIEW_RESULT = { reviewText: '## Висновок\nOK', reviewScore: 80, reviewResult: 'green' };

beforeEach(() => {
  jest.clearAllMocks();
  fetchWorkspaces.mockResolvedValue([WORKSPACE]);
  fetchAllServiceScripts.mockResolvedValue([{ Name: 'Init', Script: 'var x;', 'Parent Name': 'MySvc', Inactive: 'N' }]);
  transformToReviewPayload.mockReturnValue({ workspaceName: 'dev_test', parentName: 'MySvc', scripts: [{ name: 'Init', body: 'var x;' }] });
  mockReviewBusinessService.mockResolvedValue(REVIEW_RESULT);
  createSubtask.mockResolvedValue({ key: 'SBL-124' });
});

describe('processWorkspaceWebhook', () => {
  it('викликає createSubtask (не createReviewIssue)', async () => {
    await processWorkspaceWebhook(PARAMS, CONFIG);
    expect(createSubtask).toHaveBeenCalledTimes(1);
    expect(createReviewIssue).not.toHaveBeenCalled();
  });

  it('updateWorkspace не викликається жодного разу', async () => {
    await processWorkspaceWebhook(PARAMS, CONFIG);
    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it('повертає { subtaskKey } при успіху', async () => {
    const result = await processWorkspaceWebhook(PARAMS, CONFIG);
    expect(result).toEqual({ subtaskKey: 'SBL-124' });
  });

  it('передає reviewScore та reviewResult у createSubtask', async () => {
    await processWorkspaceWebhook(PARAMS, CONFIG);
    expect(createSubtask).toHaveBeenCalledWith(
      expect.objectContaining({ reviewScore: 80, reviewResult: 'green' })
    );
  });

  it('пробрасовує помилку якщо fetchWorkspaces кидає', async () => {
    fetchWorkspaces.mockRejectedValue(new Error('Siebel down'));
    await expect(processWorkspaceWebhook(PARAMS, CONFIG)).rejects.toThrow('Siebel down');
    expect(updateWorkspace).not.toHaveBeenCalled();
  });
});
