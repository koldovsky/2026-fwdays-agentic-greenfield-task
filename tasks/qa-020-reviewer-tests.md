# qa-020-reviewer-tests.md

## Контекст

dev-018 виконано — `reviewBusinessService` є в `src/vertex/reviewer.js`.
Функція робить I/O (читання файлів, виклик Vertex AI) → потрібні mock.

---

## Що зробити

Створити `tests/reviewer.test.js`.

### Стратегія мокування

```js
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));
jest.mock('fs');
```

`fs.readFileSync` для service-account.json повертає:
```js
JSON.stringify({ project_id: 'test-project' })
```

`fs.existsSync` для instructions.md → `false` (спрощуємо: без системної інструкції)

`GoogleGenAI` mock:
```js
const mockGenerateContent = jest.fn().mockResolvedValue({ text: 'review result' });
GoogleGenAI.mockImplementation(() => ({
  models: { generateContent: mockGenerateContent }
}));
```

### Тест-кейси

- `scripts: []` → повертає `null` без виклику `GoogleGenAI`
- `project_id` береться з service-account.json (не з config)
- `GoogleGenAI` викликається з `vertexai: true`, `project: 'test-project'`, `location` з config
- `safetySettings` з `config.generationConfig` передаються в `generateContent`
- `thinkingConfig` з config передається в `generateContent`
- Повертає `response.text` при успіху

---

## Критерії готовності (Definition of Done)

- [x] `tests/reviewer.test.js` існує
- [x] `jest.mock('@google/genai')` та `jest.mock('fs')` використовуються
- [x] `npx jest tests/reviewer.test.js` — всі тести зелені
- [x] Покрито: null-guard, PROJECT_ID з файлу, safetySettings, thinkingConfig, response.text

---

## Приклади / Референси

- `src/vertex/reviewer.js` — реалізація
- `docs/skills/vertex-ai-prompt.md`

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
