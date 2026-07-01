# Rules: Робота із зовнішніми API

## Siebel REST API
- ✅ Авторизація — Basic Auth через `SIEBEL_USERNAME` / `SIEBEL_PASSWORD`
- ✅ Всі виклики — через `src/siebel/client.js`
- ✅ GET воркспейсів та GET скриптів — окремі функції з окремими URL
- ❌ Не кешувати відповіді Siebel у пам'яті між циклами — завжди з файлу
- ❌ Не робити паралельних запитів до Siebel без ліміту (rate limit)

### Ліміт паралельних запитів до Siebel
```js
// Максимум N одночасних запитів — через Promise.allSettled з батчингом
const SIEBEL_CONCURRENCY = parseInt(process.env.SIEBEL_CONCURRENCY || '3');
```

## AI-провайдери (Vertex AI та Claude API)

### Спільні правила
- ✅ Вибір провайдера — тільки через `AI_PROVIDER` env, не хардкодити
- ✅ Обидва провайдери повертають `{ reviewText, reviewScore, reviewResult }`
- ✅ Зберігати результат у state перед публікацією в Jira
- ✅ Валідувати структуру відповіді (reviewScore — число, reviewResult — green/yellow/red)
- ❌ Не викликати AI якщо `scripts` порожній — повернути `null`
- ❌ Не робити retry автоматично — логувати і чекати наступного циклу

### Vertex AI
- ✅ Авторизація через `service-account.json`, шлях через `GOOGLE_APPLICATION_CREDENTIALS`
- ✅ `PROJECT_ID` — з `service-account.json`, не з env або config
- ❌ Не змінювати `safetySettings` та `thinkingConfig` без явного завдання

### Claude API
- ✅ `ANTHROPIC_API_KEY` — обов'язковий при `AI_PROVIDER=claude`
- ✅ `max_tokens` — обов'язковий параметр у кожному запиті
- ✅ `cacheMode` береться з `config.ai.claude.cacheMode`
- ❌ Не кешувати динамічний prompt з кодом скриптів в extended-режимі (тільки системна інструкція)
- ❌ Не перевищувати 4 cache_control блоки в одному запиті (ліміт Anthropic API)

## Jira Datacenter 9
- ✅ API версія: `/rest/api/2/` (не v3)
- ✅ Заголовок `X-Atlassian-Token: no-check` — обов'язковий
- ✅ Авторизація — Bearer токен (`JIRA_API_TOKEN`)
- ✅ Перевіряти `jiraIssueKey` у state перед створенням — не дублювати
- ❌ Не робити DELETE або PUT без явного завдання в task-файлі
- ❌ Не змінювати статус тікету автоматично — тільки додавати коментарі або створювати задачі

## Загальне для всіх API
- ✅ Логувати HTTP-статус при помилці (`err.response?.status`)
- ✅ При 401/403 — логувати як CRITICAL, зупиняти цикл
- ✅ При 429 (rate limit) — чекати і повторити (тільки один retry)
- ✅ При 5xx — логувати ERROR, зберігати в state.error, продовжувати
- ❌ Не retry при 4xx (окрім 429) — це помилки конфігурації, не тимчасові
