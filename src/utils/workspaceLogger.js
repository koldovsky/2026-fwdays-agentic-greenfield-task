'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const WORKSPACE_LOGS_DIR = path.resolve(__dirname, '../../logs/workspaces');

/**
 * Створює логер для конкретного воркспейсу.
 * Файл: logs/workspaces/YYYY-MM-DD_<safeName>.log
 * Якщо той самий воркспейс обробляється повторно того ж дня — дописується в той самий файл.
 * @param {string} workspaceName
 * @returns {winston.Logger}
 */
function createWorkspaceLogger(workspaceName) {
  if (!fs.existsSync(WORKSPACE_LOGS_DIR)) {
    fs.mkdirSync(WORKSPACE_LOGS_DIR, { recursive: true });
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const safeName = workspaceName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const filename = path.join(WORKSPACE_LOGS_DIR, `${date}_${time}_${safeName}.log`);

  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
      })
    ),
    transports: [
      new winston.transports.File({ filename }),
    ],
  });
}

module.exports = { createWorkspaceLogger };
