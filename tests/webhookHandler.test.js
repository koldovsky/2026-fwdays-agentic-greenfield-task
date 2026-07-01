'use strict';

jest.mock('../src/siebel/workspaces',   () => ({ fetchWorkspaces: jest.fn() }));
jest.mock('../src/processor',           () => ({ processWorkspaceWebhook: jest.fn() }));
jest.mock('../src/utils/logger',        () => ({ info: jest.fn(), error: jest.fn() }));

const { fetchWorkspaces }         = require('../src/siebel/workspaces');
const { processWorkspaceWebhook } = require('../src/processor');
const { handleJiraWebhook }       = require('../src/api/webhook');

const CONFIG = {};
const BODY = { jiraIssueKey: 'SBL-123', user: 'MMOROZOV', workspaceName: 'dev_test' };

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  processWorkspaceWebhook.mockResolvedValue({ subtaskKey: 'SBL-124' });
});

describe('handleJiraWebhook', () => {
  it('fetchWorkspaces порожній → errorCode 1000', async () => {
    fetchWorkspaces.mockResolvedValue([]);
    const res = mockRes();
    await handleJiraWebhook({ body: BODY }, res, CONFIG);
    expect(res.json).toHaveBeenCalledWith({ errorCode: '1000', errorMessage: 'Воркспейс не знайдено' });
  });

  it('воркспейс знайдено, businessServices порожній → errorCode 0', async () => {
    fetchWorkspaces.mockResolvedValue([{ name: 'dev_test', businessServices: [] }]);
    const res = mockRes();
    await handleJiraWebhook({ body: BODY }, res, CONFIG);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: '0', errorMessage: 'Відсутні об\'єкти для аналізу' })
    );
  });

  it('є BS → errorCode 1 відразу, processWorkspaceWebhook запускається', async () => {
    fetchWorkspaces.mockResolvedValue([{ name: 'dev_test', businessServices: [{ ObjName: 'MySvc' }] }]);
    const res = mockRes();
    await handleJiraWebhook({ body: BODY }, res, CONFIG);
    expect(res.json).toHaveBeenCalledWith({ errorCode: '1', errorMessage: 'Взято в роботу' });
    // setImmediate виконається в наступній ітерації event loop
    await new Promise(resolve => setImmediate(resolve));
    expect(processWorkspaceWebhook).toHaveBeenCalledWith(
      { workspaceName: 'dev_test', jiraIssueKey: 'SBL-123', user: 'MMOROZOV' },
      CONFIG
    );
  });

  it('fetchWorkspaces кидає → HTTP 500', async () => {
    fetchWorkspaces.mockRejectedValue(new Error('Siebel down'));
    const res = mockRes();
    await handleJiraWebhook({ body: BODY }, res, CONFIG);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: '500' }));
  });

  it('при errorCode 1 — res.json викликається ДО processWorkspaceWebhook', async () => {
    fetchWorkspaces.mockResolvedValue([{ name: 'dev_test', businessServices: [{ ObjName: 'MySvc' }] }]);
    const callOrder = [];
    const res = mockRes();
    res.json.mockImplementation(() => { callOrder.push('res.json'); return res; });
    processWorkspaceWebhook.mockImplementation(async () => { callOrder.push('process'); });

    await handleJiraWebhook({ body: BODY }, res, CONFIG);
    await new Promise(resolve => setImmediate(resolve));

    expect(callOrder[0]).toBe('res.json');
    expect(callOrder[1]).toBe('process');
  });
});
