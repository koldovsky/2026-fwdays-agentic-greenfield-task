# dev-013-services-url.md

## Контекст

dev-009 (`client.js`) виконано. Починаємо `src/siebel/services.js`.
`buildScriptsUrl` — перша функція файлу, критична: URL містить пробіли в назвах Siebel ресурсів.

---

## Що зробити

Реалізувати `buildScriptsUrl(workspaceName, serviceName)` у `src/siebel/services.js`.

```
GET {BASE}/siebel/v1.0/workspace/{ws}/Business Service/{svc}/Business Service Server Script
                                       ^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       пробіли → %20         пробіли → %20
```

```js
function buildScriptsUrl(workspaceName, serviceName) {
  return [
    process.env.SIEBEL_BASE_URL,
    '/siebel/v1.0/workspace/',
    encodeURIComponent(workspaceName),
    '/Business%20Service/',
    encodeURIComponent(serviceName),
    '/Business%20Service%20Server%20Script',
  ].join('');
}
```

`encodeURIComponent` — для імен (можуть мати пробіли, дефіси, цифри).  
`%20` — для фіксованих частин шляху (`Business Service`, `Business Service Server Script`).

---

## Критерії готовності (Definition of Done)

- [x] `buildScriptsUrl('dev_test', 'My Service')` → URL містить `My%20Service`
- [x] `buildScriptsUrl` використовує `SIEBEL_BASE_URL` з env, не хардкодить
- [x] Пробіли у фіксованих частинах → `%20`

---

## Приклади / Референси

- `docs/SPEC.md` → секція 6, "⚠️ Важливо: пробіл у URL"

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
