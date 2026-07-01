# dev-005-logger.md

## Контекст

dev-001 виконано (`winston` встановлено). `logs/` директорія існує.  
Загальний логер — єдина точка логування подій застосунку (scheduler, polling, системні події).  
`console.log/error` заборонені у фінальному коді — лише `logger.*`.

---

## Що зробити

Реалізувати `src/utils/logger.js` за патерном з `docs/skills/logging.md`.

**Три транспорти:**
1. Console — colorize + custom printf формат
2. File `logs/app.log` — JSON, ротація 10MB × 5 файлів
3. File `logs/error.log` — тільки `level: 'error'`, ротація 10MB × 5

**Формат:**
```
2024-01-15 10:30:00 [INFO] workspace.processing.start {"workspaceName":"dev_mmorozov_..."}
```

**LOG_LEVEL:** з `process.env.LOG_LEVEL`, default `'info'`.

**Важливо:** директорія `logs/` має існувати до запису. Winston 3.x не створює її автоматично.  
Додати перевірку та `fs.mkdirSync(LOGS_DIR, { recursive: true })` перед створенням логера.

---

## Критерії готовності (Definition of Done)

- [x] `src/utils/logger.js` експортує об'єкт `logger`
- [x] `logger.info('test')` — виводить у консоль і пише в `logs/app.log`
- [x] `logger.error('fail')` — пише в `logs/app.log` і `logs/error.log`
- [x] `node -e "require('./src/utils/logger').info('ok')"` — без помилок
- [x] `console.log/error` у файлі відсутні

---

## Приклади / Референси

- `docs/skills/logging.md` → повна реалізація логера

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
