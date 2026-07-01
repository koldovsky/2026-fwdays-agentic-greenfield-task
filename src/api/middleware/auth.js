'use strict';

/**
 * Express middleware: перевірка Bearer токена для webhook endpoint.
 * Очікує заголовок: Authorization: Bearer <WEBHOOK_API_TOKEN>
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== process.env.WEBHOOK_API_TOKEN) {
    return res.status(401).json({ errorCode: '401', errorMessage: 'Unauthorized' });
  }

  next();
}

module.exports = { authMiddleware };
