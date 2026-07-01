'use strict';

const logger = require('../utils/logger');
const { fetchWorkspaces } = require('../siebel/workspaces');
const { processWorkspaceWebhook } = require('../processor');

/**
 * Хендлер POST /api/webhook/jira.
 * Відповідає клієнту негайно, обробку запускає асинхронно через setImmediate.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {object} config
 */
async function handleJiraWebhook(req, res, config) {
  const { jiraIssueKey, user, workspaceName } = req.body;

  let workspaces;
  try {
    workspaces = await fetchWorkspaces(workspaceName);
  } catch (err) {
    logger.error('webhook.siebel.error', { error: err.message, workspaceName });
    return res.status(500).json({ errorCode: '500', errorMessage: 'Внутрішня помилка сервера' });
  }

  const workspace = workspaces.find(ws => ws.name === workspaceName);

  if (!workspace) {
    return res.json({ errorCode: '1000', errorMessage: 'Воркспейс не знайдено' });
  }

  if (!workspace.businessServices || workspace.businessServices.length === 0) {
    return res.json({ errorCode: '0', errorMessage: 'Відсутні об\'єкти для аналізу' });
  }

  // Відповідаємо одразу — Jira automation має таймаут
  res.json({ errorCode: '1', errorMessage: 'Взято в роботу' });

  // Обробка асинхронно, не блокує HTTP відповідь
  setImmediate(() => {
    processWorkspaceWebhook({ workspaceName, jiraIssueKey, user }, config)
      .catch(err => logger.error('webhook.processing.error', {
        error: err.message,
        workspaceName,
        jiraIssueKey,
      }));
  });
}

module.exports = { handleJiraWebhook };
