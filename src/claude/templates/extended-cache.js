'use strict';

/**
 * Формує тіло запиту до Claude API з 1-годинним кешем системної інструкції.
 * ttl: 3600 доступний на Claude Sonnet 3.7+ / Claude 4.x.
 * User prompt НЕ кешується — він змінюється з кожним запитом.
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
    system: [
      {
        type: 'text',
        text: systemInstruction,
        cache_control: { type: 'ephemeral', ttl: 3600 },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }],
      },
    ],
  };
};
