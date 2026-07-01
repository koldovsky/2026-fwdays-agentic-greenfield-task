# dev-017-instructions-md.md

## Контекст

Vertex AI reviewer потребує системної інструкції — файл `instructions.md` у корені проєкту.
Він завантажується в `reviewBusinessService` через `config.ai.systemInstructionFile`.
Це контекст для моделі: що таке Siebel Business Service, типові помилки, специфіка платформи.

---

## Що зробити

Створити `instructions.md` у корені проєкту (поруч із `package.json`).

Файл має містити:
1. **Контекст платформи** — що таке Siebel CRM, Business Service, eScript
2. **Мова та синтаксис** — Siebel eScript (JavaScript ES3-подібний, обмежений)
3. **Об'єктна модель** — BusComp, BusObj, PropertySet, Service — треба закривати
4. **Типові антипатерни** — витоки через незакриті об'єкти, N+1 запити, порожні catch, magic strings
5. **Що перевіряти** — error handling, memory leaks, performance, code style
6. **Формат відповіді** — Загальна оцінка + список проблем + рекомендації

---

## Критерії готовності (Definition of Done)

- [x] `instructions.md` існує у корені проєкту
- [x] Файл містить опис Siebel eScript специфіки
- [x] Містить перелік типових антипатернів з прикладами
- [x] Містить очікуваний формат відповіді рев'ю

---

## Статус

[x] TODO → [x] IN PROGRESS → [x] DONE
