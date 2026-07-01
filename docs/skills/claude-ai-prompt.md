# Skill: Claude API для рев'ю коду

## Призначення
Виклик Anthropic Claude API для рев'ю коду Siebel Business Service.
Альтернатива Vertex AI — перемикається через `AI_PROVIDER=claude`.

## Залежність
```
npm install @anthropic-ai/sdk
```

Змінна середовища:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Конфігурація (config.json)

```json
{
  "ai": {
    "claude": {
      "model": "claude-sonnet-4-6",
      "maxTokens": 16000,
      "cacheMode": "ephemeral",
      "systemInstructionFile": "instructions.md"
    }
  }
}
```

| Параметр | Тип | Опис |
|----------|-----|------|
| `model` | string | ID моделі Claude |
| `maxTokens` | integer | Максимум токенів у відповіді |
| `cacheMode` | string | `"none"` / `"ephemeral"` / `"extended"` |
| `systemInstructionFile` | string | Шлях до файлу системної інструкції |

## Формат відповіді

Claude **завжди** повертає JSON (wrapped у ```json блок):

```json
{
  "reviewScore": 75,
  "reviewResult": "yellow",
  "reviewText": "## Загальна оцінка\n..."
}
```

| Поле | Тип | Опис |
|------|-----|------|
| `reviewScore` | integer 0–100 | Числова оцінка якості коду |
| `reviewResult` | string | `green` / `yellow` / `red` |
| `reviewText` | string | Повний markdown текст рев'ю для Jira |

## Патерн виклику (src/claude/reviewer.js)

```js
'use strict';

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Виконує рев'ю коду Business Service через Claude API
 * @param {object} serviceData - { workspaceName, parentName, scripts[] }
 * @param {object} config - вміст config.json
 * @returns {Promise<{ reviewText: string, reviewScore: number, reviewResult: string }>}
 */
async function reviewBusinessService(serviceData, config) {
  const claudeConfig = config.ai?.claude || {};
  const model      = claudeConfig.model    || 'claude-sonnet-4-6';
  const maxTokens  = claudeConfig.maxTokens || 16000;
  const cacheMode  = claudeConfig.cacheMode || 'none';

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemInstruction = loadSystemInstruction(claudeConfig.systemInstructionFile);
  const userPrompt        = buildPrompt(serviceData);
  const messages          = buildMessages(userPrompt, cacheMode);

  const systemBlock = buildSystemBlock(systemInstruction, cacheMode);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemBlock,
    messages,
  });

  const rawText = response.content[0]?.text || '';
  return parseReviewResponse(rawText);
}

module.exports = { reviewBusinessService };
```

## Формування системного блоку

```js
/**
 * @param {string} systemInstruction
 * @param {string} cacheMode - "none" | "ephemeral" | "extended"
 * @returns {Array<object>}
 */
function buildSystemBlock(systemInstruction, cacheMode) {
  const block = { type: 'text', text: systemInstruction };

  if (cacheMode === 'ephemeral') {
    block.cache_control = { type: 'ephemeral' };
  } else if (cacheMode === 'extended') {
    block.cache_control = { type: 'ephemeral', ttl: 3600 };
  }

  return [block];
}
```

## Формування messages

```js
/**
 * @param {string} userPrompt
 * @param {string} cacheMode
 * @returns {Array<object>}
 */
function buildMessages(userPrompt, cacheMode) {
  const content = [{ type: 'text', text: userPrompt }];

  // 5-хвилинний кеш для великого prompt (якщо увімкнено)
  if (cacheMode === 'ephemeral') {
    content[0].cache_control = { type: 'ephemeral' };
  }

  return [{ role: 'user', content }];
}
```

## Формування промпту (buildPrompt)

```js
/**
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

## Парсинг відповіді

```js
/**
 * @param {string} rawText - відповідь від Claude
 * @returns {{ reviewText: string, reviewScore: number, reviewResult: string }}
 */
function parseReviewResponse(rawText) {
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);

  if (!jsonMatch) {
    throw new Error('Claude не повернув JSON блок у очікуваному форматі');
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

## Завантаження системної інструкції

```js
function loadSystemInstruction(filename) {
  if (!filename) return '';
  const filePath = path.join(__dirname, '../../', filename);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8').trim();
}
```

---

## Template-файли (src/claude/templates/)

### no-cache.js — без кешування

```js
module.exports = function buildRequest({ model, maxTokens, systemInstruction, userPrompt }) {
  return {
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemInstruction }],
    messages: [{ role: 'user', content: [{ type: 'text', text: userPrompt }] }],
  };
};
```

### ephemeral-cache.js — 5-хвилинний кеш

Кешуються: системна інструкція + prompt (якщо ≥2048 токенів).

```js
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
```

### extended-cache.js — 1-годинний кеш

Кешується тільки системна інструкція (статичний блок).
Потрібні: Claude Sonnet 3.7+ / Claude 4.x.

```js
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
```

---

## Selector (src/ai/selector.js)

```js
'use strict';

/**
 * Повертає reviewer для поточного AI-провайдера
 * @returns {{ reviewBusinessService: Function }}
 */
function getReviewer() {
  const provider = process.env.AI_PROVIDER || 'vertex';
  if (provider === 'claude') return require('../claude/reviewer');
  return require('../vertex/reviewer');
}

module.exports = { getReviewer };
```

Використання у `processor.js`:
```js
const { getReviewer } = require('./ai/selector');
// ...
const { reviewBusinessService } = getReviewer();
const result = await reviewBusinessService(serviceData, config);
// result: { reviewText, reviewScore, reviewResult }
```

---

## Правила
- `ANTHROPIC_API_KEY` — обов'язковий при `AI_PROVIDER=claude`
- Не викликати Claude якщо `scripts` порожній — повернути `null`
- При `cacheMode: "extended"` — тільки системна інструкція, не prompt
- Кеш активується автоматично Anthropic-стороною якщо блок ≥2048 токенів
- Модель задається тільки через `config.ai.claude.model`, не хардкодиться
- `maxTokens` — обов'язковий параметр для Claude API (на відміну від Vertex)
