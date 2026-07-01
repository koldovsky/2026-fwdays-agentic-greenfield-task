# dev-018-vertex-reviewer.md

## Контекст

dev-017 виконано — `instructions.md` є. Тепер реалізуємо `src/vertex/reviewer.js`.
Два ключові правила з skills/vertex-ai-prompt.md:
- `PROJECT_ID` береться ТІЛЬКИ з `service-account.json`, не з конфігу
- `buildPrompt` повертає `null` якщо `scripts` порожній

---

## Що зробити

Створити `src/vertex/reviewer.js` з двома функціями.

### buildPrompt

```js
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
**Загальна оцінка:** [OK / ПОПЕРЕДЖЕННЯ / КРИТИЧНО]

**Знайдені проблеми:**
- [КРИТИЧНО/ПОПЕРЕДЖЕННЯ/ІНФО] Script \`<назва>\`, рядок <N>: <опис>

**Рекомендації:**
<конкретні кроки для виправлення>
`.trim();
}
```

### reviewBusinessService

```js
async function reviewBusinessService(serviceData, config) {
  const prompt = buildPrompt(serviceData);
  if (!prompt) return null;

  const KEYFILEPATH = path.join(__dirname, '../../service-account.json');
  process.env.GOOGLE_APPLICATION_CREDENTIALS = KEYFILEPATH;

  const serviceAccount = JSON.parse(fs.readFileSync(KEYFILEPATH, 'utf8'));
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

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      ...generationConfig,
      ...(safetySettings   ? { safetySettings }   : {}),
      ...(tools.length > 0 ? { tools }             : {}),
      ...(thinkingConfig   ? { thinkingConfig }     : {}),
      ...(systemInstruction ? { systemInstruction } : {}),
    },
  });

  return response.text;
}
```

**Важливо:** використовувати `fs.readFileSync` (не `require`) для service-account.json —
так простіше мокати в тестах.

---

## Критерії готовності (Definition of Done)

- [x] `src/vertex/reviewer.js` створено
- [x] `buildPrompt` повертає `null` якщо `scripts` порожній або `[]`
- [x] `buildPrompt` формує секції: воркспейс, Business Service, скрипти, що перевірити
- [x] `reviewBusinessService` читає `PROJECT_ID` з `service-account.json`
- [x] `reviewBusinessService` передає `safetySettings` і `thinkingConfig` з конфігу
- [x] Повертає `null` без виклику Vertex якщо `buildPrompt` повернув `null`
- [x] Модуль експортує `{ buildPrompt, reviewBusinessService }`

---

## Приклади / Референси

- `docs/skills/vertex-ai-prompt.md` — повний патерн виклику

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
