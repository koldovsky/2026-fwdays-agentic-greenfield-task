'use strict';

const logger = require('./utils/logger');
const { createWorkspaceLogger } = require('./utils/workspaceLogger');
const { getPendingWorkspaces, updateWorkspace } = require('./state/store');
const { fetchAllServiceScripts, transformToReviewPayload } = require('./siebel/services');
const { getReviewer } = require('./ai/selector');
const { fetchWorkspaces } = require('./siebel/workspaces');
const { createReviewIssue, createSubtask } = require('./jira/issues');

/**
 * Обробляє один воркспейс: Siebel → AI → Jira → state.
 * Воркспейс без Business Service одразу отримує processed: true без AI і Jira.
 * @param {object} workspace - запис з state-файлу
 * @param {object} config - вміст config.json
 * @returns {Promise<void>}
 */
async function processWorkspace(workspace, config) {
  const wsLogger = createWorkspaceLogger(workspace.name);

  if (!workspace.businessServices || workspace.businessServices.length === 0) {
    wsLogger.info('No Business Services, skipping review', { workspace: workspace.name });
    await updateWorkspace(workspace.name, { processed: true });
    return;
  }

  try {
    wsLogger.info('Starting processing', {
      workspace: workspace.name,
      bsCount: workspace.businessServices.length,
    });

    const { reviewBusinessService } = getReviewer();
    const allReviews = [];

    for (const bs of workspace.businessServices) {
      wsLogger.info('Fetching scripts', { bs: bs.ObjName });
      const items = await fetchAllServiceScripts(workspace.name, bs.ObjName);
      const payload = transformToReviewPayload(workspace.name, items);

      if (payload.scripts.length === 0) {
        wsLogger.info('No active scripts, skipping', { bs: bs.ObjName });
        continue;
      }

      wsLogger.info('Sending to AI', { bs: bs.ObjName, scripts: payload.scripts.length });
      const reviewResult = await reviewBusinessService(payload, config);
      if (reviewResult) {
        allReviews.push({ bsName: bs.ObjName, ...reviewResult });
      }
    }

    if (allReviews.length === 0) {
      wsLogger.info('No reviews generated, marking as processed');
      await updateWorkspace(workspace.name, { processed: true });
      return;
    }

    const serviceName    = allReviews.map(r => r.bsName).join(', ');
    const combinedText   = allReviews.map(r => `## ${r.bsName}\n\n${r.reviewText}`).join('\n\n---\n\n');
    const avgScore       = Math.round(allReviews.reduce((s, r) => s + r.reviewScore, 0) / allReviews.length);
    const combinedResult = allReviews.some(r => r.reviewResult === 'red')
      ? 'red'
      : allReviews.some(r => r.reviewResult === 'yellow')
        ? 'yellow'
        : 'green';

    wsLogger.info('Publishing to Jira', { serviceName, score: avgScore, result: combinedResult });
    const { key } = await createReviewIssue({
      workspaceName: workspace.name,
      serviceName,
      reviewText:   combinedText,
      reviewScore:  avgScore,
      reviewResult: combinedResult,
      jiraIssueKey: workspace.jiraIssueKey || null,
    });

    wsLogger.info('Done', { jiraKey: key });

    await updateWorkspace(workspace.name, {
      processed:    true,
      jiraIssueKey: key,
      reviewResult: { score: avgScore, result: combinedResult, text: combinedText },
      error:        null,
    });
  } catch (err) {
    wsLogger.error('Processing failed', { workspace: workspace.name, error: err.message });
    await updateWorkspace(workspace.name, { error: err.message });
    throw err;
  }
}

/**
 * Обробляє всі pending воркспейси батчами.
 * Помилка одного воркспейсу не зупиняє обробку решти.
 * @param {object} config - вміст config.json
 * @returns {Promise<void>}
 */
async function processPendingWorkspaces(config) {
  const pending = await getPendingWorkspaces();

  if (pending.length === 0) {
    logger.info('No pending workspaces to process');
    return;
  }

  logger.info('Processing pending workspaces', { count: pending.length });

  const concurrency = config.siebel?.concurrency || 3;

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(ws => processWorkspace(ws, config))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'rejected') {
        logger.error('Workspace processing failed', {
          workspace: batch[j].name,
          error: results[j].reason?.message,
        });
      }
    }
  }
}

/**
 * Обробляє воркспейс у контексті webhook: Siebel → AI → Jira Sub-task.
 * Не пише в state-файл (рішення 003 DECISIONS.md).
 * @param {{ workspaceName: string, jiraIssueKey: string, user: string }} params
 * @param {object} config
 * @returns {Promise<{ subtaskKey: string }|null>}
 */
async function processWorkspaceWebhook({ workspaceName, jiraIssueKey, user }, config) {
  const wsLogger = createWorkspaceLogger(workspaceName);
  wsLogger.info('webhook.processing.start', { workspaceName, jiraIssueKey, source: 'webhook' });

  try {
    const workspaces = await fetchWorkspaces(workspaceName);
    const workspace = workspaces.find(ws => ws.name === workspaceName);

    if (!workspace || !workspace.businessServices || workspace.businessServices.length === 0) {
      wsLogger.info('webhook.no.bs', { workspaceName });
      return null;
    }

    const { reviewBusinessService } = getReviewer();
    const allReviews = [];

    for (const bs of workspace.businessServices) {
      wsLogger.info('Fetching scripts', { bs: bs.ObjName });
      const items = await fetchAllServiceScripts(workspaceName, bs.ObjName);
      const payload = transformToReviewPayload(workspaceName, items);

      if (payload.scripts.length === 0) continue;

      wsLogger.info('Sending to AI', { bs: bs.ObjName, scripts: payload.scripts.length });
      const reviewResult = await reviewBusinessService(payload, config);
      if (reviewResult) allReviews.push({ bsName: bs.ObjName, ...reviewResult });
    }

    if (allReviews.length === 0) {
      wsLogger.info('webhook.no.reviews', { workspaceName });
      return null;
    }

    const serviceName    = allReviews.map(r => r.bsName).join(', ');
    const combinedText   = allReviews.map(r => `## ${r.bsName}\n\n${r.reviewText}`).join('\n\n---\n\n');
    const avgScore       = Math.round(allReviews.reduce((s, r) => s + r.reviewScore, 0) / allReviews.length);
    const combinedResult = allReviews.some(r => r.reviewResult === 'red')
      ? 'red'
      : allReviews.some(r => r.reviewResult === 'yellow')
        ? 'yellow'
        : 'green';

    wsLogger.info('Creating Sub-task in Jira', { serviceName, parentIssueKey: jiraIssueKey, score: avgScore });
    const { key } = await createSubtask({
      parentIssueKey: jiraIssueKey,
      workspaceName,
      serviceName,
      reviewText:   combinedText,
      reviewScore:  avgScore,
      reviewResult: combinedResult,
      assignee:     user,
    });

    wsLogger.info('webhook.done', { subtaskKey: key });
    return { subtaskKey: key };
  } catch (err) {
    wsLogger.error('webhook.processing.failed', { workspaceName, error: err.message });
    throw err;
  }
}

module.exports = { processWorkspace, processPendingWorkspaces, processWorkspaceWebhook };
