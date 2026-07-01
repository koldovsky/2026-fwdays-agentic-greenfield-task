'use strict';

const mockReviewBusinessService = jest.fn();

jest.mock('../src/state/store');
jest.mock('../src/siebel/services');
jest.mock('../src/ai/selector', () => ({
  getReviewer: jest.fn(() => ({ reviewBusinessService: mockReviewBusinessService })),
}));
jest.mock('../src/jira/issues');
jest.mock('../src/utils/workspaceLogger', () => ({
  createWorkspaceLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

const { updateWorkspace } = require('../src/state/store');
const { fetchAllServiceScripts, transformToReviewPayload } = require('../src/siebel/services');
const { createReviewIssue } = require('../src/jira/issues');
const { processWorkspace } = require('../src/processor');

const CONFIG = { siebel: { concurrency: 3 }, ai: { vertex: { location: 'europe-central2' } } };

const ACTIVE_ITEM = { Name: 'Init', Script: 'fn', 'Parent Name': 'SvcA', Inactive: 'N' };
const PAYLOAD = { workspaceName: 'ws1', parentName: 'SvcA', scripts: [{ name: 'Init', body: 'fn' }] };

const REVIEW_RESULT = { reviewText: '**OK**', reviewScore: 85, reviewResult: 'green' };

beforeEach(() => {
  jest.clearAllMocks();
  updateWorkspace.mockResolvedValue();
});

describe('processWorkspace — воркспейс без Business Service', () => {
  it('businessServices: [] → processed: true без AI і Jira', async () => {
    const ws = { name: 'ws_empty', businessServices: [], jiraIssueKey: null };
    await processWorkspace(ws, CONFIG);

    expect(updateWorkspace).toHaveBeenCalledWith('ws_empty', { processed: true });
    expect(fetchAllServiceScripts).not.toHaveBeenCalled();
    expect(mockReviewBusinessService).not.toHaveBeenCalled();
    expect(createReviewIssue).not.toHaveBeenCalled();
  });

  it('businessServices: undefined → processed: true без AI і Jira', async () => {
    const ws = { name: 'ws_undef', jiraIssueKey: null };
    await processWorkspace(ws, CONFIG);

    expect(updateWorkspace).toHaveBeenCalledWith('ws_undef', { processed: true });
    expect(fetchAllServiceScripts).not.toHaveBeenCalled();
  });
});

describe('processWorkspace — успішний повний цикл', () => {
  beforeEach(() => {
    fetchAllServiceScripts.mockResolvedValue([ACTIVE_ITEM]);
    transformToReviewPayload.mockReturnValue(PAYLOAD);
    mockReviewBusinessService.mockResolvedValue(REVIEW_RESULT);
    createReviewIssue.mockResolvedValue({ key: 'SBL-42' });
  });

  it('викликає fetchAllServiceScripts для кожного BS', async () => {
    const ws = { name: 'ws1', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };
    await processWorkspace(ws, CONFIG);
    expect(fetchAllServiceScripts).toHaveBeenCalledWith('ws1', 'SvcA');
  });

  it('зберігає jiraIssueKey після успішної публікації', async () => {
    const ws = { name: 'ws1', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };
    await processWorkspace(ws, CONFIG);
    expect(updateWorkspace).toHaveBeenCalledWith(
      'ws1',
      expect.objectContaining({ processed: true, jiraIssueKey: 'SBL-42' })
    );
  });

  it('передає наявний jiraIssueKey в createReviewIssue для anti-duplicate', async () => {
    const ws = { name: 'ws1', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: 'SBL-10' };
    await processWorkspace(ws, CONFIG);
    expect(createReviewIssue).toHaveBeenCalledWith(
      expect.objectContaining({ jiraIssueKey: 'SBL-10' })
    );
  });

  it('передає reviewScore та reviewResult у createReviewIssue', async () => {
    const ws = { name: 'ws1', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };
    await processWorkspace(ws, CONFIG);
    expect(createReviewIssue).toHaveBeenCalledWith(
      expect.objectContaining({ reviewScore: 85, reviewResult: 'green' })
    );
  });
});

describe('processWorkspace — обробка помилок', () => {
  it('помилка у fetchAllServiceScripts → updateWorkspace з { error }, функція кидає', async () => {
    fetchAllServiceScripts.mockRejectedValue(new Error('Network timeout'));
    const ws = { name: 'ws1', businessServices: [{ ObjName: 'SvcA' }], jiraIssueKey: null };

    await expect(processWorkspace(ws, CONFIG)).rejects.toThrow('Network timeout');
    expect(updateWorkspace).toHaveBeenCalledWith('ws1', expect.objectContaining({ error: 'Network timeout' }));
    expect(updateWorkspace).not.toHaveBeenCalledWith('ws1', expect.objectContaining({ processed: true }));
  });
});
