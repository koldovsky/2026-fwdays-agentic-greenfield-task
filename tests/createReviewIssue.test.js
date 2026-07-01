'use strict';

jest.mock('../src/jira/client', () => ({
  apiCall: jest.fn(),
  buildJiraHeaders: jest.fn(() => ({})),
}));

const { apiCall } = require('../src/jira/client');
const { createReviewIssue, createSubtask } = require('../src/jira/issues');

const BASE_PARAMS = {
  workspaceName: 'dev_test_ws',
  serviceName: 'MyBusinessService',
  reviewText: '## Загальна оцінка\n**OK**',
  reviewScore: 85,
  reviewResult: 'green',
  jiraIssueKey: null,
};

beforeEach(() => {
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  process.env.JIRA_PROJECT_KEY = 'SBL';
  process.env.JIRA_ISSUE_TYPE = 'Task';
  delete process.env.JIRA_FIELD_REVIEW_SCORE;
  delete process.env.JIRA_FIELD_REVIEW_RESULT;
  jest.clearAllMocks();
});

// ─── createReviewIssue — захист від дублювання ────────────────────────────────

describe('createReviewIssue — захист від дублювання', () => {
  it('повертає наявний key без виклику apiCall якщо jiraIssueKey передано', async () => {
    const result = await createReviewIssue({ ...BASE_PARAMS, jiraIssueKey: 'SBL-42' });
    expect(result).toEqual({ key: 'SBL-42' });
    expect(apiCall).not.toHaveBeenCalled();
  });
});

// ─── createReviewIssue — створення нової задачі ───────────────────────────────

describe('createReviewIssue — створення нової задачі', () => {
  beforeEach(() => {
    apiCall.mockResolvedValue({ key: 'SBL-99' });
  });

  it('викликає apiCall якщо jiraIssueKey відсутній', async () => {
    await createReviewIssue(BASE_PARAMS);
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('повертає { key } з відповіді apiCall', async () => {
    const result = await createReviewIssue(BASE_PARAMS);
    expect(result).toEqual({ key: 'SBL-99' });
  });

  it('URL містить /rest/api/2/issue', async () => {
    await createReviewIssue(BASE_PARAMS);
    const { url } = apiCall.mock.calls[0][0];
    expect(url).toContain('/rest/api/2/issue');
  });

  it('summary містить serviceName та workspaceName', async () => {
    await createReviewIssue(BASE_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.summary).toContain('MyBusinessService');
    expect(body.fields.summary).toContain('dev_test_ws');
  });

  it('description є результатом formatJiraComment', async () => {
    await createReviewIssue(BASE_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.description).toContain('h2. Загальна оцінка');
    expect(body.fields.description).toContain('*OK*');
  });

  it('project.key береться з JIRA_PROJECT_KEY', async () => {
    await createReviewIssue(BASE_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.project.key).toBe('SBL');
  });
});

// ─── createReviewIssue — кастомні поля ───────────────────────────────────────

describe('createReviewIssue — кастомні поля reviewScore/reviewResult', () => {
  beforeEach(() => {
    apiCall.mockResolvedValue({ key: 'SBL-99' });
    process.env.JIRA_FIELD_REVIEW_SCORE  = 'customfield_10500';
    process.env.JIRA_FIELD_REVIEW_RESULT = 'customfield_10501';
  });

  it('додає reviewScore у customfield_10500', async () => {
    await createReviewIssue(BASE_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields['customfield_10500']).toBe(85);
  });

  it('додає reviewResult як { value } у customfield_10501', async () => {
    await createReviewIssue(BASE_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields['customfield_10501']).toEqual({ value: 'green' });
  });

  it('без JIRA_FIELD_* — кастомних полів немає у body', async () => {
    delete process.env.JIRA_FIELD_REVIEW_SCORE;
    delete process.env.JIRA_FIELD_REVIEW_RESULT;
    await createReviewIssue(BASE_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields['customfield_10500']).toBeUndefined();
    expect(body.fields['customfield_10501']).toBeUndefined();
  });
});

// ─── createSubtask ────────────────────────────────────────────────────────────

describe('createSubtask', () => {
  const SUBTASK_PARAMS = {
    parentIssueKey: 'SBL-123',
    workspaceName: 'dev_test_ws',
    serviceName: 'MyBusinessService',
    reviewText: '## Висновок\n**OK**',
    reviewScore: 72,
    reviewResult: 'yellow',
    assignee: 'MMOROZOV',
  };

  beforeEach(() => {
    apiCall.mockResolvedValue({ key: 'SBL-124' });
  });

  it('issuetype.name === Sub-Code Review', async () => {
    await createSubtask(SUBTASK_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.issuetype.name).toBe('Sub-Code Review');
  });

  it('parent.key === parentIssueKey', async () => {
    await createSubtask(SUBTASK_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.parent.key).toBe('SBL-123');
  });

  it('assignee.name === assignee', async () => {
    await createSubtask(SUBTASK_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.assignee.name).toBe('MMOROZOV');
  });

  it('project.key витягується з parentIssueKey', async () => {
    await createSubtask(SUBTASK_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields.project.key).toBe('SBL');
  });

  it('повертає { key } з відповіді', async () => {
    const result = await createSubtask(SUBTASK_PARAMS);
    expect(result).toEqual({ key: 'SBL-124' });
  });

  it('додає customfield_10500 і customfield_10501 коли env задані', async () => {
    process.env.JIRA_FIELD_REVIEW_SCORE  = 'customfield_10500';
    process.env.JIRA_FIELD_REVIEW_RESULT = 'customfield_10501';
    await createSubtask(SUBTASK_PARAMS);
    const { body } = apiCall.mock.calls[0][0];
    expect(body.fields['customfield_10500']).toBe(72);
    expect(body.fields['customfield_10501']).toEqual({ value: 'yellow' });
  });
});
