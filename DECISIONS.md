# DECISIONS.md — Архітектурні рішення

Фіксуємо тут **чому** прийнято те чи інше рішення.
Агент читає цей файл щоб не переглядати вже прийняті рішення.

---

## 001 — Дві точки входу: Webhook (основна) + Cron (резервна)

**Дата:** 2026-06-26
**Статус:** Прийнято (оновлено)

### Проблема
Спочатку єдиною точкою входу був Cron. Виникла потреба запускати рев'ю
on-demand з Jira без очікування наступного циклу планувальника.

### Рішення
**Основна точка входу** — Webhook `POST /api/webhook/jira` (викликається з Jira).
**Резервна точка входу** — Cron (вимкнений за замовчуванням, вмикається через env).

Обидва flow використовують спільний `processor.js`.

### Керування Cron через змінну середовища
```
CRON_ENABLED=false   # за замовчуванням — вимкнено
POLL_INTERVAL_CRON=*/15 * * * *
```

```js
// src/scheduler.js
if (process.env.CRON_ENABLED === 'true') {
  cron.schedule(process.env.POLL_INTERVAL_CRON, runPolling);
  logger.info('scheduler.started', { interval: process.env.POLL_INTERVAL_CRON });
} else {
  logger.info('scheduler.disabled', { reason: 'CRON_ENABLED != true' });
}
```

### Коли вмикати Cron
- Jira webhook недоступний або не налаштований
- Потрібне автоматичне фонове сканування всіх воркспейсів
- Відлагодження без участі Jira

### Чому відповідь webhook — негайна (не чекає Vertex)
- Jira automation має таймаут на webhook відповідь (~30с)
- Vertex + обробка скриптів може тривати довше
- Рішення: відповідаємо `errorCode: 1` одразу, обробку запускаємо через `setImmediate`

---

## 002 — Webhook пише коментар у існуючий тікет, Cron створює новий

**Дата:** 2026-06-26
**Статус:** Прийнято

### Проблема
Куди публікувати результат рев'ю залежить від того хто ініціював процес.

### Рішення
| Flow | Дія в Jira |
|------|-----------|
| Cron | `POST /rest/api/2/issue` — створює нову задачу |
| Webhook | `POST /rest/api/2/issue/{jiraIssueKey}/comment` — додає коментар |

### Чому так
- Webhook знає `jiraIssueKey` — логічно відповісти в той самий тікет
- Cron не прив'язаний до конкретного тікету — створює свій

---

## 003 — Webhook не пише в state-файл

**Дата:** 2026-06-26
**Статус:** Прийнято

### Проблема
Чи треба webhook оновлювати `workspaces-state.json`?

### Рішення
Ні. Webhook — одноразовий запит на конкретний воркспейс.
State-файл використовується тільки Cron для відстеження що вже оброблено.

### Ризик
Якщо Cron запуститься під час обробки webhook по тому самому воркспейсу —
можлива дублікація рев'ю. Прийнятно на поточному етапі.

---

## 004 — Окремий WEBHOOK_API_TOKEN для захисту endpoint

**Дата:** 2026-06-26
**Статус:** Прийнято

### Проблема
Як захистити `POST /api/webhook/jira` від неавторизованих викликів?

### Рішення
Bearer токен в заголовку `Authorization`.
Окремий від `JIRA_API_TOKEN` — для розділення відповідальності.

### Чому не Basic Auth
- Jira automation зручніше передає Bearer токен
- Basic Auth потребує username:password — надлишково для machine-to-machine

---

## 005 — Express як веб-сервер (не Fastify, не Koa)

**Дата:** 2026-06-26
**Статус:** Прийнято

### Рішення
Express.js — єдиний веб-фреймворк у проєкті.

### Чому Express а не інші
- Мінімальна кількість ендпоінтів (1 webhook)
- Команда знайома з Express
- Немає потреби в performance фреймворку для одного endpoint

---

## 006 — Webhook створює Sub-task дочірню до тікету, а не коментар

**Дата:** 2026-06-26
**Статус:** Прийнято

### Проблема
Куди публікувати результат рев'ю при виклику через webhook?

### Рішення
Створювати **Sub-task** (дочірню задачу) до тікету `jiraIssueKey` з webhook.
Відповідальним (`assignee`) призначати `user` з тіла webhook запиту.

### Чому Sub-task а не коментар
- Рев'ю — окрема одиниця роботи що потребує відстеження статусу
- Sub-task видно в дошці і можна відстежувати окремо від батьківського тікету
- Коментар легко загубити серед іншої активності тікету

### Чому не нова незалежна задача
- Контекст рев'ю прив'язаний до конкретного тікету з якого прийшов webhook
- Sub-task автоматично наслідує проєкт батьківського тікету

### Поле assignee
Jira Datacenter 9: `assignee: { name: 'username' }` — логін, не email.
Береться напряму з поля `user` тіла webhook запиту.

---

## 007 — Підтримка двох AI-провайдерів: Vertex AI та Claude API

**Дата:** 2026-06-27
**Статус:** Прийнято

### Проблема
Vertex AI вимагає GCP service account та RAG-інфраструктуру.
Claude API — простіша інтеграція, підтримка prompt caching, гнучкіше управління токенами.
Потрібна можливість перемикатися між провайдерами без зміни коду.

### Рішення
Два провайдери з єдиним інтерфейсом. Вибір — через env-змінну:

```
AI_PROVIDER=vertex   # за замовчуванням (поточна реалізація)
AI_PROVIDER=claude   # нова реалізація
```

Єдиний вхід через `src/ai/selector.js` — повертає потрібний reviewer:

```js
// src/ai/selector.js
const provider = process.env.AI_PROVIDER || 'vertex';
if (provider === 'claude') return require('../claude/reviewer');
return require('../vertex/reviewer');
```

Обидва модулі реалізують однаковий інтерфейс:
```js
async function reviewBusinessService(serviceData, config) → Promise<ReviewResult>
```

де `ReviewResult`:
```js
{ reviewText: string, reviewScore: number, reviewResult: string }
```

### Структура директорій
```
src/
  ai/
    selector.js        # вибір провайдера
  vertex/
    client.js
    reviewer.js        # існуюча реалізація (не змінюється)
  claude/
    reviewer.js        # нова реалізація
```

### Vertex залишається робочим за замовчуванням
Жоден існуючий файл у `src/vertex/` не змінюється — тільки доповнюється
інтерфейс (structured response).

---

## 008 — Структурований JSON-формат відповіді AI

**Дата:** 2026-06-27
**Статус:** Прийнято

### Проблема
Раніше AI повертав тільки текст рев'ю. Потрібно також числова оцінка (`reviewScore`)
та статус (`reviewResult`) для автоматичного відображення в Jira.

### Рішення
AI **завжди** повертає відповідь у форматі JSON (wrapped у ```json блок):

```json
{
  "reviewScore": 75,
  "reviewResult": "yellow",
  "reviewText": "## Загальна оцінка\n...<повний markdown текст рев'ю>..."
}
```

| Поле | Тип | Опис |
|------|-----|------|
| `reviewScore` | integer 0–100 | Оцінка якості коду (100 = ідеальний) |
| `reviewResult` | string | `green` / `yellow` / `red` |
| `reviewText` | string | Markdown текст рев'ю (конвертується у Wiki Markup для Jira) |

### Семантика reviewResult
- `green` — код якісний, зауваження несуттєві або відсутні (score ≥ 80)
- `yellow` — є попередження, бажані виправлення (score 50–79)
- `red` — є **критичні зауваження**, виправлення обов'язкові (score < 50)

### Публікація в Jira
- `reviewText` → поле `description` задачі (як зараз, Wiki Markup)
- `reviewScore` → кастомне поле `JIRA_FIELD_REVIEW_SCORE` (напр. `customfield_10500`)
- `reviewResult` → кастомне поле `JIRA_FIELD_REVIEW_RESULT` (напр. `customfield_10501`)

ID кастомних полів задаються через `.env`:
```
JIRA_FIELD_REVIEW_SCORE=customfield_10500
JIRA_FIELD_REVIEW_RESULT=customfield_10501
```

Якщо змінні не задані — публікуються без кастомних полів (зворотна сумісність).

### Застосовується до обох провайдерів
Vertex AI і Claude API мають повертати однаковий формат.
Парсинг — у спільному `parseReviewResponse()` (у кожному `reviewer.js`).

---

## 009 — Prompt caching для Claude API

**Дата:** 2026-06-27
**Статус:** Прийнято

### Проблема
Системна інструкція для Siebel-рев'ю — великий статичний текст (~5–10k токенів).
При кожному webhook-виклику це суттєві витрати. Claude підтримує prompt caching.

### Рішення
Anthropic Prompt Caching: `cache_control` у content блоках системної інструкції.

| Режим | TTL | Де застосовується | Конфіг |
|-------|-----|-------------------|--------|
| Без кешу | — | За замовчуванням | `"cacheMode": "none"` |
| 5-хвилинний | 5 хв | Системна інструкція + великий prompt | `"cacheMode": "ephemeral"` |
| 1-годинний | 1 год | Тільки системна інструкція | `"cacheMode": "extended"` |

### Конфігурація (config.json)
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

### Template-файли
Три шаблони (у `src/claude/templates/`):
- `no-cache.js` — виклик без caching
- `ephemeral-cache.js` — системна інструкція + prompt із 5-хвилинним кешем
- `extended-cache.js` — системна інструкція з 1-годинним кешем

Шаблон вибирається у `reviewer.js` на основі `config.ai.claude.cacheMode`.

### Обмеження
- 1-годинний кеш доступний на Claude Sonnet 3.7+ / Claude 4.x моделях
- Мінімальний розмір блоку для кешування: ~2048 токенів
- Без мінімуму — кешування ігнорується Anthropic API без помилки
- `ANTHROPIC_API_KEY` — обов'язковий при `AI_PROVIDER=claude`
