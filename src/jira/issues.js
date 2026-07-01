'use strict';

const { apiCall, buildJiraHeaders } = require('./client');

/**
 * Форматує результат рев'ю у Jira Wiki Markup.
 * Jira Datacenter 9 підтримує Wiki Markup, не Markdown.
 * @param {string} reviewText - markdown текст від AI
 * @returns {string}
 */
function formatJiraComment(reviewText) {
  return reviewText
    .replace(/```[\w]*\n([\s\S]*?)```/g,     '{code}$1{code}')
    .replace(/^## (.+)$/gm,                   'h2. $1')
    .replace(/^### (.+)$/gm,                  'h3. $1')
    .replace(/\*\*(.+?)\*\*/g,               '*$1*')
    .replace(/`([^`]+)`/g,                   '{{$1}}');
}

/**
 * Додає reviewScore та reviewResult у кастомні Jira-поля (якщо задані в env).
 * @param {object} fields - об'єкт fields для Jira API
 * @param {number|undefined} reviewScore
 * @param {string|undefined} reviewResult
 */
function applyReviewFields(fields, reviewScore, reviewResult) {
  const scoreField  = process.env.JIRA_FIELD_REVIEW_SCORE;
  const resultField = process.env.JIRA_FIELD_REVIEW_RESULT;

  if (scoreField && reviewScore !== undefined && reviewScore !== null) {
    fields[scoreField] = reviewScore;
  }
  if (resultField && reviewResult) {
    fields[resultField] = { value: reviewResult };
  }
}

/**
 * Створює Jira-задачу з результатом рев'ю.
 * Захист від дублювання: якщо jiraIssueKey вже є — повертає його без нового запиту.
 * @param {object} params
 * @param {string} params.workspaceName
 * @param {string} params.serviceName
 * @param {string} params.reviewText
 * @param {number} [params.reviewScore]
 * @param {string} [params.reviewResult]
 * @param {string|null} [params.jiraIssueKey] - якщо задача вже створена
 * @returns {Promise<{ key: string }>}
 */
async function createReviewIssue({ workspaceName, serviceName, reviewText, reviewScore, reviewResult, jiraIssueKey }) {
  if (jiraIssueKey) return { key: jiraIssueKey };

  const url = new URL('/rest/api/2/issue', process.env.JIRA_BASE_URL).toString();

  const fields = {
    project:     { key: process.env.JIRA_PROJECT_KEY },
    summary:     `Code Review: ${serviceName} [${workspaceName}]`,
    description: formatJiraComment(reviewText),
    issuetype:   { name: process.env.JIRA_ISSUE_TYPE || 'Task' },
  };

  applyReviewFields(fields, reviewScore, reviewResult);

  const result = await apiCall({ method: 'POST', url, headers: buildJiraHeaders(), body: { fields } });
  return { key: result.key };
}

/**
 * Створює Sub-task дочірню до батьківського тікету.
 * @param {object} params
 * @param {string} params.parentIssueKey - ключ батьківського тікету (напр. SBL-123)
 * @param {string} params.workspaceName
 * @param {string} params.serviceName
 * @param {string} params.reviewText
 * @param {number} [params.reviewScore]
 * @param {string} [params.reviewResult]
 * @param {string} params.assignee - логін користувача (Jira Datacenter: name, не email)
 * @returns {Promise<{ key: string }>}
 */
async function createSubtask({ parentIssueKey, workspaceName, serviceName, reviewText, reviewScore, reviewResult, assignee }) {
  const url = new URL('/rest/api/2/issue', process.env.JIRA_BASE_URL).toString();

  // Jira DC REST API v2 вимагає project.key навіть для Sub-task
  const projectKey = parentIssueKey.split('-')[0];

  const fields = {
    project:     { key: projectKey },
    summary:     `Code Review: ${serviceName} [${workspaceName}]`,
    description: formatJiraComment(reviewText),
    issuetype:   { name: 'Sub-Code Review' },
    parent:      { key: parentIssueKey },
    assignee:    { name: assignee },
  };

  applyReviewFields(fields, reviewScore, reviewResult);

  const result = await apiCall({ method: 'POST', url, headers: buildJiraHeaders(), body: { fields } });
  return { key: result.key };
}

module.exports = { createReviewIssue, createSubtask, formatJiraComment };
