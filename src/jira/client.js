'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Формує заголовки Bearer-авторизації для Jira Datacenter 9.
 * @returns {{ Authorization: string, Accept: string, 'Content-Type': string, 'X-Atlassian-Token': string }}
 */
function buildJiraHeaders() {
  return {
    'Authorization': `Bearer ${process.env.JIRA_API_TOKEN}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Atlassian-Token': 'no-check',
  };
}

/**
 * Виконує HTTP-запит до Jira REST API.
 * 401/403 → err.isCritical = true, решта помилок — логуються та кидаються далі.
 * @param {object} options
 * @param {string} options.method - GET | POST
 * @param {string} options.url - повний URL
 * @param {object} [options.headers]
 * @param {object|null} [options.body]
 * @returns {Promise<object>}
 */
async function apiCall({ method, url, headers = {}, body = null }) {
  const config = {
    method: method.toUpperCase(),
    url,
    headers,
  };

  if (body !== null && method.toUpperCase() !== 'GET') {
    config.data = body;
  }

  const start = Date.now();
  logger.debug('Jira → request', { method: config.method, url, body: body ?? null });

  try {
    const response = await axios(config);
    logger.debug('Jira ← response', {
      method: config.method,
      url,
      status: response.status,
      durationMs: Date.now() - start,
      body: response.data,
    });
    return response.data;
  } catch (err) {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      logger.error('Jira API: помилка автентифікації — CRITICAL', { status, url });
      const authError = new Error(`Jira auth failed: HTTP ${status}`);
      authError.status = status;
      authError.isCritical = true;
      throw authError;
    }

    logger.error('Jira API: запит завершився помилкою', {
      status: status ?? 'no response',
      url,
      message: err.message,
      responseBody: err.response?.data,
    });

    const apiError = new Error(`Jira API error: HTTP ${status ?? 'unknown'} — ${err.message}`);
    apiError.status = status;
    throw apiError;
  }
}

module.exports = { apiCall, buildJiraHeaders };
