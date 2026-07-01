'use strict';

/**
 * Повертає reviewer для поточного AI-провайдера.
 * Провайдер визначається через AI_PROVIDER env (vertex | claude).
 * @returns {{ reviewBusinessService: Function }}
 */
function getReviewer() {
  const provider = process.env.AI_PROVIDER || 'vertex';
  if (provider === 'claude') return require('../claude/reviewer');
  return require('../vertex/reviewer');
}

module.exports = { getReviewer };
