'use strict';

require('dotenv').config();
const path = require('path');

const rawConfig = require(path.join(__dirname, '../config.json'));

/**
 * Єдина точка конфігурації застосунку.
 * Не-секретні параметри: config.json
 * Секрети (токени, URL, паролі): process.env безпосередньо у client.js модулях
 */
const config = {
  port: parseInt(process.env.PORT || String(rawConfig.port || 5000)),

  poll: {
    cronExpression: process.env.POLL_INTERVAL_CRON || '*/15 * * * *',
  },

  siebel: {
    concurrency: parseInt(process.env.SIEBEL_CONCURRENCY || String(rawConfig.siebel?.concurrency || 3)),
  },

  jira: {
    issueType: process.env.JIRA_ISSUE_TYPE || 'Task',
  },

  ai: rawConfig.ai,
};

module.exports = config;
