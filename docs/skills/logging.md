# Skill: Логування (Winston)

## Призначення
Єдиний стандарт логування у проєкті. Використовується `winston`.
Два типи логів:
- **Загальний лог** — старт/стоп scheduler, polling, системні події
- **Лог воркспейсу** — окремий файл на кожен воркспейс що пройшов обробку

---

## Встановлення
```bash
npm install winston
```

---

## Загальний логер (src/utils/logger.js)

```js
const winston = require('winston');
const path = require('path');

const LOGS_DIR = path.resolve(__dirname, '../../logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Консоль — завжди
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      ),
    }),
    // Загальний файл
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // Окремий файл для помилок
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
```

---

## Логер воркспейсу (src/utils/workspaceLogger.js)

Для кожного воркспейсу що містить Business Service — створюється окремий файл.

### Формат назви файлу
```
logs/workspaces/YYYY-MM-DD_HH24-MI-SS_<WorkspaceName>.log
```
Приклад: `logs/workspaces/2024-01-15_14-01-59_WS_FEATURE_PAYMENT.log`

```js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const WORKSPACE_LOGS_DIR = path.resolve(__dirname, '../../logs/workspaces');

/**
 * Створює або повертає логер для конкретного воркспейсу
 * @param {string} workspaceName - назва воркспейсу з Siebel
 * @returns {winston.Logger}
 */
function createWorkspaceLogger(workspaceName) {
  // Забезпечуємо існування директорії
  if (!fs.existsSync(WORKSPACE_LOGS_DIR)) {
    fs.mkdirSync(WORKSPACE_LOGS_DIR, { recursive: true });
  }

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  // Sanitize назви воркспейсу — прибираємо символи небезпечні для імені файлу
  const safeName = workspaceName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const filename = path.join(WORKSPACE_LOGS_DIR, `${date}_${safeName}.log`);

  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
      })
    ),
    transports: [
      new winston.transports.File({ filename }),
    ],
  });
}

module.exports = { createWorkspaceLogger };
```

---

## Як використовувати в processor.js

```js
const logger = require('./utils/logger');
const { createWorkspaceLogger } = require('./utils/workspaceLogger');

async function processWorkspace(workspace) {
  // Загальний логер — фіксуємо старт
  logger.info('workspace.processing.start', {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  });

  // Логер воркспейсу — для детального трейсу
  const wsLog = createWorkspaceLogger(workspace.name);

  try {
    wsLog.info('Починаємо обробку воркспейсу', {
      workspaceId: workspace.id,
      objectCount: workspace.objects.length,
    });

    // --- Крок 1: Отримання скриптів з Siebel ---
    wsLog.info('Завантаження Business Service скриптів з Siebel');
    const services = await fetchServiceScripts(workspace);
    wsLog.info('Скрипти завантажено', { serviceCount: services.length });

    // --- Крок 2: Відправка в Vertex AI ---
    wsLog.info('Відправка на рев\'ю до Vertex AI', {
      parentName: services[0]?.parentName,
    });
    const reviewResult = await reviewBusinessService(services, config);
    wsLog.info('Рев\'ю отримано', { resultLength: reviewResult.length });

    // --- Крок 3: Публікація в Jira ---
    wsLog.info('Публікація результату в Jira');
    const { key } = await createReviewIssue({ workspace, reviewResult });
    wsLog.info('Опубліковано в Jira', { jiraIssueKey: key });

    // --- Успіх ---
    await updateWorkspace(workspace.id, {
      processed: true,
      jiraIssueKey: key,
    });
    wsLog.info('Воркспейс успішно оброблено ✓');
    logger.info('workspace.processing.done', {
      workspaceName: workspace.name,
      jiraIssueKey: key,
    });

  } catch (err) {
    wsLog.error('Помилка обробки воркспейсу', {
      message: err.message,
      stack: err.stack,
    });
    logger.error('workspace.processing.failed', {
      workspaceName: workspace.name,
      error: err.message,
    });
    await updateWorkspace(workspace.id, {
      error: err.message,
      errorAt: new Date().toISOString(),
    });
  }
}
```

---

## Структура logs/

```
logs/
  app.log                                    # загальний лог (ротація 10MB x5)
  error.log                                  # тільки помилки
  workspaces/
    2024-01-15_14-51_WS_FEATURE_PAYMENT.log        # детальний лог по воркспейсу
    2024-01-15_17-12_WS_BUGFIX_ORDER_CALC.log
    2024-01-16_01-22_WS_FEATURE_PAYMENT.log        # новий день — новий файл
```

---

## Що логується у файлі воркспейсу

| Крок | Повідомлення |
|------|-------------|
| Старт | Починаємо обробку, кількість об'єктів |
| Siebel fetch | Які сервіси знайдено, кількість скриптів |
| Vertex | Старт запиту, довжина відповіді |
| Jira | Ключ створеного тікету |
| Успіх / Помилка | Фінальний статус + stack trace при помилці |

---

## Правила

- `winston` — єдина бібліотека логування, `console.log/error` — заборонені в продакшн-коді
- Загальний `logger` — імпортується з `src/utils/logger.js`
- `createWorkspaceLogger` — викликається один раз на початку `processWorkspace()`
- Воркспейси **без** Business Service — не отримують окремого файлу, тільки рядок в `app.log`
- `logs/` — в `.gitignore`
- `LOG_LEVEL` через `.env` (default: `info`), для дебагу встановити `debug`
- Якщо `LOG_LEVEL` = `debug` - фіксувати всі інтеграційні запити (метод, посилання, тіло запиту та відповіді, час виконання)
- Назва файлу воркспейсу — sanitize через `.replace(/[^a-zA-Z0-9_\-\.]/g, '_')`
- Якщо той самий воркспейс обробляється повторно того ж дня — дописується в той самий файл

