# dev-014-services-pagination.md

## Контекст

dev-013 — `buildScriptsUrl` є. Тепер реалізуємо fetch зі сторінкуванням.
Siebel повертає `lastpage: "false"/"true"` (рядок!) як ознаку останньої сторінки.

---

## Що зробити

Реалізувати `fetchAllServiceScripts(workspaceName, serviceName)` у `services.js`.

```js
async function fetchAllServiceScripts(workspaceName, serviceName) {
  const allItems = [];
  let page = 1;
  let lastPage = false;

  while (!lastPage) {
    const url = buildScriptsUrl(workspaceName, serviceName) + `?page=${page}&pagesize=20`;
    const response = await apiCall({ method: 'GET', url, headers: buildSiebelHeaders() });
    allItems.push(...(response.items || []));
    lastPage = response.lastpage === 'true';   // рядок, не boolean!
    page++;
  }

  return allItems;
}
```

**Важливо:** `response.lastpage === 'true'` — Siebel повертає рядок.  
**Важливо:** порожня відповідь (`items: []` або `items: undefined`) — не помилка, повертати `[]`.

---

## Критерії готовності (Definition of Done)

- [x] `fetchAllServiceScripts` реалізовано в `services.js`
- [x] При `lastpage: "false"` — робить наступний запит
- [x] При `lastpage: "true"` — зупиняється
- [x] `response.items` відсутній → не падає, повертає `[]`
- [x] Результат — плоский масив з усіх сторінок

---

## Приклади / Референси

- `docs/SPEC.md` → секція 6, "⚠️ Пагінація"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
