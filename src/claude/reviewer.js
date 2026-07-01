'use strict';

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

const TEMPLATES = {
  none:      require('./templates/no-cache'),
  ephemeral: require('./templates/ephemeral-cache'),
  extended:  require('./templates/extended-cache'),
};

const VALID_RESULTS = ['green', 'yellow', 'red'];

/**
 * Завантажує системну інструкцію з файлу.
 * @param {string|undefined} filename - відносний шлях від кореня проєкту
 * @returns {string}
 */
function loadSystemInstruction(filename) {
  if (!filename) return '';
  const filePath = path.join(__dirname, '../../', filename);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8').trim();
}

/**
 * Формує промпт для рев'ю Business Service.
 * @param {object} param0
 * @param {string} param0.workspaceName
 * @param {string} param0.parentName
 * @param {Array<{name: string, body: string}>} param0.scripts
 * @returns {string|null} - null якщо scripts порожній
 */
function buildPrompt({ workspaceName, parentName, scripts }) {
  if (!scripts || scripts.length === 0) return null;

  const scriptsText = scripts
    .map(s => `### Script: ${s.name}\n\`\`\`javascript\n${s.body}\n\`\`\``)
    .join('\n\n');

  return `
Виконай рев'ю коду Siebel Business Service з воркспейсу "${workspaceName}".

## Business Service: ${parentName}

${scriptsText}

## Що перевірити:
1. Обробка помилок (try/catch, перевірка null/undefined)
2. Витоки пам'яті (незакриті об'єкти: BusComp, BusObj, PropertySet)
3. Продуктивність (зайві запити в циклах, N+1)
4. Читабельність та іменування змінних
5. Коректне використання Inputs/Outputs

## Формат відповіді:
Спочатку напиши повний markdown текст рев'ю (reviewText) — розділи: Загальна оцінка, Знайдені проблеми, Рекомендації.
Після тексту рев'ю, в самому кінці відповіді, додай JSON блок ТІЛЬКИ з двома полями:

\`\`\`json
{
  "reviewScore": <ціле число 0-100>,
  "reviewResult": "<green|yellow|red>"
}
\`\`\`

Де:
- reviewScore: числова оцінка якості (100=ідеальний, 0=критичні проблеми)
- reviewResult: green (якісний, score≥80), yellow (попередження, 50-79), red (критично, <50)
`.trim();
}

/**
 * Парсить відповідь Claude — витягує JSON з ```json блоку.
 * @param {string} rawText - відповідь від Claude API
 * @returns {{ reviewText: string, reviewScore: number, reviewResult: string }}
 */
function parseReviewResponse(rawText) {
  const jsonStart = rawText.lastIndexOf('```json');
  if (jsonStart === -1) {
    throw new Error('Claude не повернув JSON блок у очікуваному форматі');
  }

  const jsonEnd = rawText.indexOf('```', jsonStart + 7);
  if (jsonEnd === -1) {
    throw new Error('Claude не повернув JSON блок у очікуваному форматі');
  }

  const jsonContent = rawText.slice(jsonStart + 7, jsonEnd).trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error(`Помилка парсингу JSON відповіді Claude: ${e.message}`);
  }

  if (typeof parsed.reviewScore !== 'number') {
    throw new Error('reviewScore відсутній або не є числом');
  }
  if (!VALID_RESULTS.includes(parsed.reviewResult)) {
    throw new Error(`Невалідний reviewResult: ${parsed.reviewResult}`);
  }

  const reviewText = rawText.slice(0, jsonStart).trim();
  if (!reviewText) {
    throw new Error('reviewText відсутній або порожній');
  }

  return {
    reviewText,
    reviewScore:  parsed.reviewScore,
    reviewResult: parsed.reviewResult,
  };
}

/**
 * Виконує рев'ю Business Service через Claude API.
 * @param {object} serviceData - { workspaceName, parentName, scripts[] }
 * @param {object} config - вміст config.json
 * @returns {Promise<{ reviewText: string, reviewScore: number, reviewResult: string }|null>}
 */
async function reviewBusinessService(serviceData, config) {
  const userPrompt = buildPrompt(serviceData);
  if (!userPrompt) return null;

  const claudeConfig    = config.ai?.claude || {};
  const model           = claudeConfig.model     || 'claude-sonnet-4-6';
  const maxTokens       = claudeConfig.maxTokens || 16000;
  const cacheMode       = claudeConfig.cacheMode || 'none';
  const systemInstruction = loadSystemInstruction(claudeConfig.systemInstructionFile);

  const buildRequest = TEMPLATES[cacheMode] || TEMPLATES.none;
  const requestBody  = buildRequest({ model, maxTokens, systemInstruction, userPrompt });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  logger.debug('claude.request', {
    model,
    cacheMode,
    promptLength: userPrompt.length,
    workspace: serviceData.workspaceName,
  });

  const response = await client.messages.create(requestBody);

  const rawText = response.content[0]?.text || '';
  const result  = parseReviewResponse(rawText);

  logger.debug('claude.response', {
    reviewScore:  result.reviewScore,
    reviewResult: result.reviewResult,
    usage:        response.usage,
  });

  return result;
}

module.exports = { reviewBusinessService, buildPrompt, parseReviewResponse };
