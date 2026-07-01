'use strict';

const { authMiddleware }      = require('../src/api/middleware/auth');
const { validateWebhookBody } = require('../src/api/middleware/validate');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  process.env.WEBHOOK_API_TOKEN = 'secret-token';
});

describe('authMiddleware', () => {
  it('відсутній Authorization заголовок → 401', () => {
    const req  = { headers: {} };
    const res  = mockRes();
    const next = jest.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: '401' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('неправильний токен → 401', () => {
    const req  = { headers: { authorization: 'Bearer wrong-token' } };
    const res  = mockRes();
    const next = jest.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('правильний токен → next() викликається', () => {
    const req  = { headers: { authorization: 'Bearer secret-token' } };
    const res  = mockRes();
    const next = jest.fn();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('validateWebhookBody', () => {
  it('всі три поля присутні → next() викликається', () => {
    const req  = { body: { jiraIssueKey: 'SBL-1', user: 'USER', workspaceName: 'ws' } };
    const res  = mockRes();
    const next = jest.fn();
    validateWebhookBody(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('відсутній jiraIssueKey → HTTP 200, errorCode 400', () => {
    const req  = { body: { user: 'USER', workspaceName: 'ws' } };
    const res  = mockRes();
    const next = jest.fn();
    validateWebhookBody(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: '400', errorMessage: expect.stringContaining('jiraIssueKey') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('відсутні два поля → обидва перелічені в errorMessage', () => {
    const req  = { body: { workspaceName: 'ws' } };
    const res  = mockRes();
    const next = jest.fn();
    validateWebhookBody(req, res, next);
    const { errorMessage } = res.json.mock.calls[0][0];
    expect(errorMessage).toContain('jiraIssueKey');
    expect(errorMessage).toContain('user');
  });

  it('порожнє тіло → HTTP 200, errorCode 400', () => {
    const req  = { body: {} };
    const res  = mockRes();
    const next = jest.fn();
    validateWebhookBody(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: '400' }));
    expect(next).not.toHaveBeenCalled();
  });
});
