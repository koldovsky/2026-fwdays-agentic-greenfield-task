'use strict';

const cron = require('node-cron');
const logger = require('./utils/logger');
const { fetchWorkspaces } = require('./siebel/workspaces');
const { upsertWorkspaces } = require('./state/store');
const { processPendingWorkspaces } = require('./processor');

let isRunning = false;

/**
 * Виконує один цикл: polling Siebel → збереження стану → обробка pending воркспейсів.
 * Якщо попередній цикл ще не завершився — пропускає тік.
 * @param {object} config - вміст config.json
 * @returns {Promise<void>}
 */
async function runCycle(config) {
  if (isRunning) {
    logger.warn('Previous cycle still running, skipping tick');
    return;
  }

  isRunning = true;
  try {
    logger.info('Cycle started');

    const workspaces = await fetchWorkspaces();
    await upsertWorkspaces(workspaces);
    await processPendingWorkspaces(config);

    logger.info('Cycle completed');
  } catch (err) {
    logger.error('Cycle failed', { error: err.message });
  } finally {
    isRunning = false;
  }
}

/**
 * Запускає cron-scheduler за розкладом з конфігурації.
 * @param {object} config - вміст config.json
 */
function startScheduler(config) {
  if (process.env.CRON_ENABLED !== 'true') {
    logger.info('scheduler.disabled', { reason: 'CRON_ENABLED != true' });
    return;
  }
  const cronExpression = process.env.POLL_INTERVAL_CRON || config.poll?.cronExpression || '*/15 * * * *';
  logger.info('scheduler.started', { cron: cronExpression });
  cron.schedule(cronExpression, () => runCycle(config));
}

module.exports = { startScheduler, runCycle };
