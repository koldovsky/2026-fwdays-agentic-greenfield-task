# Feature Plan

Чотири основні напрямки роботи для MVP. Кожен пункт трасується на FR-xx/NFR-xx з [requirements.md](./requirements.md); реалізація не повинна суперечити `accepted` вимогам звідти (див. AGENTS.md).

## 1. UI плагіну (popup)

Vanilla TS + Pico CSS, 4 стани попапу.

- [ ] State 1 (idle): заголовок, чекбокс анонімізації (checked за замовчуванням), кнопка Export — FR-05
- [ ] State 2 (in progress): лоадер на час extraction + downloads — FR-06
- [ ] State 3 (success): повідомлення про успішний експорт — FR-07
- [ ] State 4 (error): повідомлення про помилку з деталями (напр. список attachments, що не завантажились) — FR-08
- [ ] Disabled Export + hint, якщо активний таб не Jira ticket — FR-04 (proposed)
- [ ] Чекбокс анонімізації не додає нових станів попапу — FR-09
- [ ] Стилі виключно через Pico CSS variables, без хардкод-кольорів — NFR-05, DESIGN.md

## 2. Механізм конвертації (DOM → Markdown)

Framework-free `lib/`, без Chrome API.

- [ ] Jira DOM parser (фікстура вже є в `examples/`) — FR-01, FR-02
- [ ] Markdown serializer: title, key/ID, поля (status/priority/labels/…), опис, чеклісти, лінки, всі коментарі — FR-10
- [ ] Завантаження attachments у `media/` + numeric prefix (`01-`, `02-`, …) з дедуплікацією імен — FR-11, FR-13
- [ ] Best-effort media fetch: провал одного attachment не зупиняє конвертацію/інші завантаження, потрапляє в error details — FR-12
- [ ] `.md` посилається на локальні `media/01-…` шляхи (офлайн-самодостатність) — FR-14 (proposed)
- [ ] Вихідна структура: `Downloads/<TICKET-ID>/<TICKET-ID>-<title>.md` + `media/`, окремі завантаження через `chrome.downloads` (без ZIP) — FR-15–FR-17
- [ ] Ім'я файлу: кирилиця в назві лишається, прибираються тільки filesystem-forbidden символи — FR-18

## 3. Механізм анонімізації

Теж у framework-free `lib/`, 100% unit-testable.

- [ ] Увімкнена за замовчуванням; імена/прізвища в полях, описі, коментарях → `User1`, `User2`, … — FR-19
- [ ] Consistent alias mapping в межах одного експорту (одна людина = один UserN всюди — текст, коментарі, імена файлів) — FR-20 (proposed)
- [ ] Анонімізація імен у назвах медіафайлів перед збереженням — FR-21
- [ ] Ніяких мереж/зовнішніх викликів для анонімізації — все локально — NFR-01

## 4. Тести по тесткейсам

Vitest на `lib/`; фікстури — збережені сторінки тикетів.

- [ ] Unit-тести serializer (Markdown output) — NFR-07
- [ ] Unit-тести anonymizer, включно з alias consistency та file-name анонімізацією — NFR-07
- [ ] Unit-тести Jira DOM-парсера проти статичної HTML-фікстури з `examples/` — requirements.md §4
- [ ] Явний тест failure path: недосяжний media URL → partial success + error details, БЕЗ abort всього експорту — FR-12
- [ ] Manual E2E для демо: load unpacked → відкрити реальний тикет → export → перевірити структуру папки й анонімізацію — requirements.md §4. Референс-тикет для парсера й E2E: [ROVODEV-36](https://jira.atlassian.com/browse/ROVODEV-36) (публічний, без логіну; та ж сторінка вже захоплена як фікстура в `examples/`)
- [ ] Усі перевірки (build/lint/type-check/test) укладаються в 60s кожна — NFR-06 (proposed)

## Порядок виконання

Рекомендований порядок (залежності): **2 (конвертація) → 3 (анонімізація) → 1 (UI, підключає 2+3) → 4 (тести супроводжують кожен крок, не йдуть окремим фінальним етапом)**. Тести пишуться разом із кожним модулем `lib/`, а не після всього.

---

Пов'язано з `docs/STATE.md` (крос-сесійний прогрес) і `openspec/changes/` (якщо якийсь із пунктів оформлюється як окремий OpenSpec change).
