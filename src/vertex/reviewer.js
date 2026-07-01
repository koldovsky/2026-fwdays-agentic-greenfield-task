'use strict';

const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const VALID_RESULTS = ['green', 'yellow', 'red'];

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
Поверни відповідь ТІЛЬКИ у форматі JSON у \`\`\`json блоці:

\`\`\`json
{
  "reviewScore": <ціле число 0-100>,
  "reviewResult": "<green|yellow|red>",
  "reviewText": "<повний markdown текст рев'ю>"
}
\`\`\`

Де:
- reviewScore: числова оцінка якості (100=ідеальний, 0=критичні проблеми)
- reviewResult: green (якісний, score≥80), yellow (попередження, 50-79), red (критично, <50)
- reviewText: повний markdown текст з розділами: Загальна оцінка, Знайдені проблеми, Рекомендації
`.trim();
}

/**
 * Парсить відповідь Vertex AI — витягує JSON з ```json блоку.
 * @param {string} rawText - response.text від Vertex
 * @returns {{ reviewText: string, reviewScore: number, reviewResult: string }}
 */
function parseReviewResponse(rawText) {
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) {
    throw new Error('Vertex AI не повернув JSON блок у очікуваному форматі');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[1].trim());
  } catch (e) {
    throw new Error(`Помилка парсингу JSON відповіді Vertex: ${e.message}`);
  }

  if (typeof parsed.reviewScore !== 'number') {
    throw new Error('reviewScore відсутній або не є числом');
  }
  if (!VALID_RESULTS.includes(parsed.reviewResult)) {
    throw new Error(`Невалідний reviewResult: ${parsed.reviewResult}`);
  }
  if (typeof parsed.reviewText !== 'string' || !parsed.reviewText) {
    throw new Error('reviewText відсутній або порожній');
  }

  return {
    reviewText:   parsed.reviewText,
    reviewScore:  parsed.reviewScore,
    reviewResult: parsed.reviewResult,
  };
}

/**
 * Виконує рев'ю Business Service через Vertex AI.
 * @param {object} serviceData - { workspaceName, parentName, scripts[] }
 * @param {object} config - вміст config.json
 * @returns {Promise<{ reviewText: string, reviewScore: number, reviewResult: string }|null>}
 */
async function reviewBusinessService(serviceData, config) {
  const prompt = buildPrompt(serviceData);
  if (!prompt) return null;

  const KEYFILEPATH = path.join(__dirname, '../../service-account.json');
  process.env.GOOGLE_APPLICATION_CREDENTIALS = KEYFILEPATH;

  const serviceAccount = JSON.parse(fs.readFileSync(KEYFILEPATH, 'utf8'));
  const PROJECT_ID = serviceAccount.project_id;

  const vertexConfig = config.ai?.vertex || {};

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: vertexConfig.location || 'europe-central2',
  });

  let systemInstruction;
  const instructionFile = vertexConfig.systemInstructionFile;
  if (instructionFile) {
    const instructionPath = path.join(__dirname, '../../', instructionFile);
    if (fs.existsSync(instructionPath)) {
      systemInstruction = fs.readFileSync(instructionPath, 'utf8').trim();
    }
  }

  const model = vertexConfig.model || 'gemini-2.5-flash';
  const { safetySettings, ...generationConfig } = vertexConfig.generationConfig || {};
  const tools = vertexConfig.tools || [];
  const thinkingConfig = vertexConfig.thinkingConfig || null;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      ...generationConfig,
      ...(safetySettings    ? { safetySettings }    : {}),
      ...(tools.length > 0  ? { tools }              : {}),
      ...(thinkingConfig    ? { thinkingConfig }      : {}),
      ...(systemInstruction ? { systemInstruction }   : {}),
    },
  });

  return parseReviewResponse(response.text);
}

module.exports = { buildPrompt, parseReviewResponse, reviewBusinessService };
