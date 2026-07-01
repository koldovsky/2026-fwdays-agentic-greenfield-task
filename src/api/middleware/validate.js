'use strict';

const REQUIRED_FIELDS = ['jiraIssueKey', 'user', 'workspaceName'];

/**
 * Express middleware: валідація обов'язкових полів тіла webhook запиту.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateWebhookBody(req, res, next) {
  const missing = REQUIRED_FIELDS.filter(field => !req.body?.[field]);

  if (missing.length > 0) {
    return res.json({
      errorCode: '400',
      errorMessage: `Відсутні обов'язкові поля: ${missing.join(', ')}`,
    });
  }

  next();
}

module.exports = { validateWebhookBody };
