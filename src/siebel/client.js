'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const RETRY_DELAY_MS = 5000;

/**
 * Формує заголовки Basic Auth для Siebel REST API.
 * @returns {{ Authorization: string, Accept: string, 'Content-Type': string }}
 */
function buildSiebelHeaders() {
  const credentials = Buffer.from(
    `${process.env.SIEBEL_USERNAME}:${process.env.SIEBEL_PASSWORD}`
  ).toString('base64');

  return {
    'Authorization': `Basic ${credentials}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Виконує HTTP-запит до Siebel REST API.
 * Обробляє помилки за правилами: 401/403 — CRITICAL, 429 — один retry, 5xx — ERROR.
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
  logger.debug('Siebel → request', { method: config.method, url, body: body ?? null });

  try {
    const response = await axios(config);
    logger.debug('Siebel ← response', {
      method: config.method,
      url,
      status: response.status,
      durationMs: Date.now() - start,
      body: response.data,
    });
    return response.data;
  } catch (err) {
    return handleAxiosError(err, config);
  }
}

/**
 * @param {Error} err
 * @param {object} config - axios config для retry
 * @returns {Promise<object>}
 */
async function handleAxiosError(err, config) {
  const status = err.response?.status;
  const url = config.url;

  if (status === 401 || status === 403) {
    logger.error('Siebel API: помилка автентифікації — CRITICAL', { status, url });
    const authError = new Error(`Siebel auth failed: HTTP ${status}`);
    authError.status = status;
    authError.isCritical = true;
    throw authError;
  }

  if (status === 429) {
    logger.warn('Siebel API: rate limit, очікуємо і повторюємо запит', { url });
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      const retry = await axios(config);
      return retry.data;
    } catch (retryErr) {
      const retryStatus = retryErr.response?.status;
      logger.error('Siebel API: повторний запит також завершився помилкою', { status: retryStatus, url });
      const retryError = new Error(`Siebel retry failed: HTTP ${retryStatus ?? 'unknown'}`);
      retryError.status = retryStatus;
      throw retryError;
    }
  }

  logger.error('Siebel API: запит завершився помилкою', {
    status: status ?? 'no response',
    url,
    message: err.message,
  });

  const apiError = new Error(`Siebel API error: HTTP ${status ?? 'unknown'} — ${err.message}`);
  apiError.status = status;
  throw apiError;
}

module.exports = { apiCall, buildSiebelHeaders };
