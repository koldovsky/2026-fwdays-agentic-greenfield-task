'use strict';

/**
 * Формує тіло запиту до Claude API з 5-хвилинним prompt caching.
 * cache_control застосовується до системної інструкції та user prompt.
 * Anthropic кешує блок якщо він ≥2048 токенів — без мінімуму запит не падає.
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
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
      },
    ],
  };
};
