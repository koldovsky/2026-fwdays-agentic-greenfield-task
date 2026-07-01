# qa-034-pipeline-validation.md

## Контекст

Фінальний інтеграційний тест: від реального JSON з Siebel до структури state-файлу.
Використовується `docs/get-workspace-objects.json` — реальна відповідь API.

---

## Що зробити

Створити `tests/pipelineValidation.test.js`.

### Що перевірити

- `parseWorkspacesResponse(realJson)` не кидає
- Повертає масив воркспейсів
- Воркспейси з Business Service мають `businessServices.length > 0`
- Воркспейси без BS мають `businessServices: []`
- Кожен результат має поля: `name`, `status`, `createdByName`, `businessServices`, `processed: false`, `fetchedAt`, `reviewResult: null`, `jiraIssueKey: null`, `error: null`
- Конкретні відомі воркспейси зі структури файлу (MAIN, dev_mmorozov_...) мають очікувані BS

---

## Критерії готовності (Definition of Done)

- [x] `tests/pipelineValidation.test.js` існує
- [x] Читає `docs/get-workspace-objects.json` напряму
- [x] `npx jest tests/pipelineValidation.test.js` — всі тести зелені
- [x] Покрито: структура, фільтрація, реальні дані

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
