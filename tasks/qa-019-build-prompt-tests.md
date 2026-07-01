# qa-019-build-prompt-tests.md

## Контекст

dev-018 виконано — `buildPrompt` є в `src/vertex/reviewer.js`.
Функція є pure (без I/O), тестується без mock.

---

## Що зробити

Створити `tests/buildPrompt.test.js`.

### Тест-кейси

- `scripts: []` → повертає `null`
- `scripts: undefined` або не передано → повертає `null`
- Непорожній `scripts` → повертає рядок
- Результат містить `workspaceName`
- Результат містить `parentName` як заголовок Business Service
- Результат містить `name` кожного скрипту
- Результат містить `body` кожного скрипту у форматі code block
- Результат містить секції "Що перевірити" та "Формат відповіді"

---

## Критерії готовності (Definition of Done)

- [x] `tests/buildPrompt.test.js` існує
- [x] `npx jest tests/buildPrompt.test.js` — всі тести зелені
- [x] Покрито: null для порожнього scripts, структура промпту, всі секції

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
