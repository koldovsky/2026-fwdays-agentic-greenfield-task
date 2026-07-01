'use strict';

/**
 * Формує тіло запиту до Claude API без кешування.
 * @param {object} params
 * @param {string} params.model
 * @param {number} params.maxTokens
 * @param {string} params.systemInstruction
 * @param {string} params.userPrompt
 * @returns {object}
 */
module.exports = function buildRequest({ model, maxTokens, systemInstruction, userPrompt }) {
  return {
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemInstruction }],
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }],
      },
    ],
  };
};
