'use strict';

jest.mock('../src/siebel/client', () => ({
  apiCall: jest.fn(),
  buildSiebelHeaders: jest.fn(() => ({})),
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const { apiCall } = require('../src/siebel/client');
const { fetchWorkspaces } = require('../src/siebel/workspaces');

const OK_RESPONSE = { errorCode: '0', errorMessage: '', Workspace: [] };

beforeEach(() => {
  process.env.SIEBEL_BASE_URL = 'https://siebel.example.com';
  jest.clearAllMocks();
  apiCall.mockResolvedValue(OK_RESPONSE);
});

describe('fetchWorkspaces — тіло запиту', () => {
  it('без аргументу → body: { body: {} }', async () => {
    await fetchWorkspaces();
    expect(apiCall).toHaveBeenCalledWith(
      expect.objectContaining({ body: { body: {} } })
    );
  });

  it('з workspaceName → body: { body: { workspaceName } }', async () => {
    await fetchWorkspaces('dev_mmorozov_test');
    expect(apiCall).toHaveBeenCalledWith(
      expect.objectContaining({ body: { body: { workspaceName: 'dev_mmorozov_test' } } })
    );
  });

  it('завжди POST до getWorkspaceObjects', async () => {
    await fetchWorkspaces();
    expect(apiCall).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: expect.stringContaining('getWorkspaceObjects') })
    );
  });
});
