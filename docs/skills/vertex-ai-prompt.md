# Skill: Формування промпту для Vertex AI

## Призначення
Підготовка та виклик Google Vertex AI для рев'ю коду Siebel Business Service.
Використовується `@google/genai` з Vertex AI режимом через service account.

## Конфігурація (config.json)

```json
{
  "ai": {
    "vertexAi": {
      "projectId": "areonsbl",
      "location": "europe-central2"
    },
    "model": "gemini-2.5-flash",
    "generationConfig": {
      "maxOutputTokens": 65535,
      "temperature": 1,
      "topP": 0.95,
      "safetySettings": [
        { "category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "OFF" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF" },
        { "category": "HARM_CATEGORY_HARASSMENT",        "threshold": "OFF" }
      ]
    },
    "systemInstructionFile": "instructions.md",
    "thinkingConfig": {
      "thinkingBudget": 8192
    },
    "tools": [
      {
        "retrieval": {
          "vertexRagStore": {
            "ragResources": [
              {
                "ragCorpus": "projects/areonsbl/locations/europe-central2/ragCorpora/6917529027641081856"
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Структура вхідних даних

```js
// Те що приходить після збору по воркспейсу з Siebel:
const serviceData = {
  workspaceName: 'WS_FEATURE_X',
  parentName: 'MyBusinessService',
  scripts: [
    { name: 'Initialize',               body: 'function Initialize() { ... }' },
    { name: 'Service_PreInvokeMethod',  body: 'function Service_PreInvokeMethod(...) { ... }' },
  ],
};
```

## Патерн виклику (src/vertex/reviewer.js)

```js
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

/**
 * Виконує рев'ю коду Business Service через Vertex AI
 * @param {object} serviceData - { workspaceName, parentName, scripts[] }
 * @param {object} config - вміст config.json
 * @returns {Promise<string>} - текст рев'ю
 */
async function reviewBusinessService(serviceData, config) {
  // Авторизація через service account
  const KEYFILEPATH = path.join(__dirname, '../../service-account.json');
  process.env.GOOGLE_APPLICATION_CREDENTIALS = KEYFILEPATH;

  const serviceAccount = require(KEYFILEPATH);
  const PROJECT_ID = serviceAccount.project_id;

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: config.ai.vertexAi.location || 'europe-central2',
  });

  // Завантаження системної інструкції
  let systemInstruction;
  const instructionFile = config.ai?.systemInstructionFile;
  if (instructionFile) {
    const instructionPath = path.join(__dirname, '../../', instructionFile);
    if (fs.existsSync(instructionPath)) {
      systemInstruction = fs.readFileSync(instructionPath, 'utf8').trim();
    }
  }

  const model = config.ai?.model || 'gemini-2.5-flash';
  const { safetySettings, ...generationConfig } = config.ai?.generationConfig || {};
  const tools = config.ai?.tools || [];
  const thinkingConfig = config.ai?.thinkingConfig || null;

  const prompt = buildPrompt(serviceData);

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      ...generationConfig,
      ...(safetySettings  ? { safetySettings }  : {}),
      ...(tools.length > 0 ? { tools }           : {}),
      ...(thinkingConfig  ? { thinkingConfig }   : {}),
      ...(systemInstruction ? { systemInstruction } : {}),
    },
  });

  return response.text;
}

module.exports = { reviewBusinessService };
```

## Формування промпту (buildPrompt)

```js
/**
 * Формує промпт для рев'ю Business Service
 * @param {object} param0 - { workspaceName, parentName, scripts[] }
 * @returns {string}
 */
function buildPrompt({ workspaceName, parentName, scripts }) {
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
```

## Системна інструкція (instructions.md)
Файл `instructions.md` у корені проєкту — контекст для моделі про Siebel CRM.
Агент повинен створити його як окрему задачу. Містить:
- Що таке Siebel Business Service
- Типові антипатерни Siebel JavaScript
- Специфіка платформи (eScript, обмеження)

## Парсинг відповіді Vertex AI

Vertex повертає текст що **містить JSON-блок**. Необхідно витягти та розпарсити:

```js
/**
 * Парсить відповідь Vertex AI — витягує структурований JSON
 * @param {string} rawText - response.text від Vertex
 * @returns {{ reviewText: string, reviewScore: number, reviewResult: string }}
 */
function parseReviewResponse(rawText) {
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);

  if (!jsonMatch) {
    throw new Error('Vertex AI не повернув JSON блок у очікуваному форматі');
  }

  const parsed = JSON.parse(jsonMatch[1].trim());

  if (typeof parsed.reviewScore !== 'number') {
    throw new Error('reviewScore відсутній або не є числом');
  }
  if (!['green', 'yellow', 'red'].includes(parsed.reviewResult)) {
    throw new Error(`Невалідний reviewResult: ${parsed.reviewResult}`);
  }
  if (typeof parsed.reviewText !== 'string') {
    throw new Error('reviewText відсутній');
  }

  return {
    reviewText:   parsed.reviewText,
    reviewScore:  parsed.reviewScore,
    reviewResult: parsed.reviewResult,
  };
}
```

### Що зберігати в state після рев'ю

```js
await updateWorkspace(workspace.id, {
  reviewResult: {
    score:      reviewResult.reviewScore,   // 0-100
    status:     reviewResult.reviewResult,  // green | yellow | red
    text:       reviewResult.reviewText,    // markdown текст для Jira
    reviewedAt: new Date().toISOString(),
  },
});
```

---

## Правила
- `service-account.json` — в корені проєкту, в `.gitignore`
- `PROJECT_ID` завжди братии з `service-account.json`, не з `config.json`
- `config.json` — `vertexAi.projectId` використовується лише як резервний параметр
- Не викликати Vertex якщо `scripts` порожній — повернути `null`
- Зберігати `response.text` у `state` до публікації в Jira
- Не змінювати `safetySettings` та `thinkingConfig` без явного завдання
- Бібліотека: `@google/genai` (не `@google-cloud/vertexai`)
