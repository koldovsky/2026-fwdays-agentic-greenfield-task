# dev-015-services-transform.md

## Контекст

dev-014 — `fetchAllServiceScripts` є. Тепер трансформуємо items у структуру для Vertex AI.

---

## Що зробити

Реалізувати `transformToReviewPayload(workspaceName, items)` у `services.js`.

```js
function transformToReviewPayload(workspaceName, items) {
  const activeItems = items.filter(item => item['Inactive'] !== 'Y');
  return {
    workspaceName,
    parentName: activeItems[0]?.['Parent Name'] ?? '',
    scripts: activeItems.map(item => ({
      name: item['Name'],
      body: item['Script'],
    })),
  };
}
```

Поля з `items`:

| Поле | Використовується | Примітка |
|------|-----------------|----------|
| `Name` | ✅ → `scripts[].name` | Назва методу |
| `Script` | ✅ → `scripts[].body` | Тіло скрипту |
| `Parent Name` | ✅ → `parentName` | Назва Business Service |
| `Inactive` | ✅ (фільтр) | `"Y"` → пропустити |

---

## Критерії готовності (Definition of Done)

- [x] `transformToReviewPayload` реалізовано
- [x] `Inactive: 'Y'` → script відфільтровано
- [x] `parentName` береться з першого активного item
- [x] Порожній масив items → `{ workspaceName, parentName: '', scripts: [] }`
- [x] `src/siebel/services.js` експортує `{ buildScriptsUrl, fetchAllServiceScripts, transformToReviewPayload }`
- [x] `node -e "require('./src/siebel/services')"` — без помилок

---

## Приклади / Референси

- `docs/SPEC.md` → секція 6, "Трансформація у структуру для Vertex AI"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
