'use strict';

require('dotenv').config();

const logger = require('./utils/logger');
const config = require('../config/default');
const { startScheduler } = require('./scheduler');
const { createServer }   = require('./api/server');

const REQUIRED_ENV = [
  'SIEBEL_BASE_URL',
  'SIEBEL_USERNAME',
  'SIEBEL_PASSWORD',
  'JIRA_BASE_URL',
  'JIRA_API_TOKEN',
  'JIRA_PROJECT_KEY',
  'WEBHOOK_API_TOKEN',
];

const missing = REQUIRED_ENV.filter(key => !process.env[key]);

if (process.env.AI_PROVIDER === 'claude' && !process.env.ANTHROPIC_API_KEY) {
  missing.push('ANTHROPIC_API_KEY');
}

if (missing.length > 0) {
  logger.error('Missing required environment variables', { missing });
  process.exit(1);
}

logger.info('Starting Siebel Review Agent');

startScheduler(config);

const port = process.env.PORT || config.port || 5000;
const app = createServer(config);
app.listen(port, () => {
  logger.info('server.started', { port });
});
