'use strict';

const express = require('express');
const { authMiddleware }      = require('./middleware/auth');
const { validateWebhookBody } = require('./middleware/validate');
const { handleJiraWebhook }   = require('./webhook');

/**
 * Створює та повертає Express app з налаштованими маршрутами.
 * @param {object} config
 * @returns {import('express').Application}
 */
function createServer(config) {
  const app = express();
  app.use(express.json());

  app.post(
    '/api/webhook/jira',
    authMiddleware,
    validateWebhookBody,
    (req, res) => handleJiraWebhook(req, res, config)
  );

  return app;
}

module.exports = { createServer };
