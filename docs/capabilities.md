# OpenSpec capabilities

Джерело: [requirements.md](requirements.md) · контекст: [product-brief.md](product-brief.md), [DESIGN.md](../DESIGN.md).

Цей документ розбиває FR/NFR/BC/TC на **capabilities** для OpenSpec (`openspec/specs/<capability>/spec.md`) і фіксує **порядок імплементації** (один change ≈ одна capability, якщо не зазначено інакше).

---

## Як користуватись

1. Беремо наступну capability з [порядку імплементації](#порядок-імплементації).
2. Створюємо OpenSpec change: `/opsx:propose` з іменем на кшталт `add-document-session`.
3. У change specs посилаємось на capability-ім’я з таблиці нижче.
4. Після archive — capability з’являється в `openspec/specs/`.

**Правило розбиття:** capability = незалежний шматок поведінки з чіткими acceptance criteria (TC), який можна здати окремо. UI-кроки флоу — окремі capabilities поверх спільного session + wizard shell.

---

## Карта capabilities

| # | Capability (OpenSpec id) | Що дає користувачу | FR | NFR / BC | TC |
|---|--------------------------|--------------------|----|----------|-----|
| 1 | `locale-helpers` | Сума й дата прописом (uk, грн) | FR-20, FR-21 | NFR-08, BC-10, BC-13 | TC-22, TC-23 |
| 2 | `document-session` | Створення/`guid`, URL `/docs/{guid}`, JSON-стан, відновлення | FR-01, FR-02, FR-19 | NFR-03, NFR-04, NFR-10*, NFR-11, NFR-12, BC-04, BC-09 | TC-01–TC-03, TC-21, TC-25 |
| 3 | `wizard-shell` | Кроки 1–7: прогрес-кружки, Назад/Далі, нейтральний UI | FR-17, FR-18 | NFR-01, NFR-02, NFR-09 | TC-20 |
| 4 | `document-type` | Крок 1: тип документа + копіювання з `guid` | FR-03, FR-04 | BC-01, BC-11 | TC-04–TC-06 |
| 5 | `document-numbering` | Крок 2: дата, `Р-#######`, номер акта, річний лічильник | FR-05, FR-06, FR-07 | NFR-06, BC-06 | TC-07–TC-10 |
| 6 | `contacts` | Кроки 3–4: замовник/виконавець, каталог за РНОКПП | FR-08, FR-09, FR-10 | NFR-05, NFR-10*, BC-05 | TC-11–TC-13, TC-26 |
| 7 | `services-catalog` | Крок 5: каталог послуг і рядки документа | FR-11, FR-12 | NFR-10*, NFR-13* | TC-14 |
| 8 | `template-fill` | Крок 6: заповнення `invoce.html` / `complete.html`, preview | FR-13, FR-14 | NFR-07*, NFR-13, BC-07 | TC-15, TC-16, TC-24 |
| 9 | `pdf-export` | Крок 7: read-only, PDF, Редагувати / Назад | FR-15, FR-16 | NFR-07, BC-12 | TC-17–TC-19 |

\* NFR-10 (помилки збереження) — поперечний: мінімум у `document-session`, далі в кожній persistence-capability.  
\* NFR-07 у `template-fill` — візуальна відповідність HTML preview; повна перевірка PDF — у `pdf-export`.  
\* NFR-13 у `services-catalog` — kebab-case ключів JSON; повний набір якорів шаблону — у `template-fill`.

### Поза capabilities (свідомо не окремі specs)

| Тема | Куди відносити |
|------|----------------|
| BC-02, BC-03, BC-08 (немає auth/ЕДО/юр. гарантій) | Non-goals у proposal кожного change |
| Scaffold Next.js / data-root | Задача всередині change `document-session` (або окремий tech change без product spec) |
| Дизайн-токени з DESIGN.md | `wizard-shell` + уточнення в design.md change |

---

## Опис кожної capability

### 1. `locale-helpers`

Чисті функції без UI і FS.

- `amountToCursive(n)` → приклад FR-20 / TC-22  
- `dateToNumeric(d)` → `DD.MM.YYYY`  
- `dateToCursive(d)` → приклад FR-21 / TC-23  

**Done when:** unit-тести на приклади з PRD; модуль готовий до імпорту з template-fill.

### 2. `document-session`

Фундамент даних і маршруту.

- Створення сеансу → `./docs/{guid}.json`, redirect `/docs/{guid}`  
- Відновлення: незавершений → останній незаповнений крок; завершений → фінальний перегляд  
- Ідемпотентність reload (NFR-04)  
- Експорт/збереження JSON-стану (FR-19)  
- Невалідний `guid` → зрозуміла помилка (TC-25)  

**Done when:** TC-01–TC-03, TC-21, TC-25; API/FS шар для подальших кроків.

### 3. `wizard-shell`

Оболонка флоу поверх сеансу (кроки можуть бути stub).

- Прогрес 1…7 у кружках (FR-18, NFR-02)  
- Назад / Далі з обмеженнями країв (FR-17)  
- Нейтральна фінансова палітра (NFR-01)  
- `currentStep` синхронізований із сеансом  

**Done when:** TC-20 на stub-кроках; перехід < 300 ms локально (NFR-09) як ціль.

### 4. `document-type`

Крок 1.

- Типи: `invoice_act` (default), `invoice`, `act`  
- Копіювання з існуючого `guid` без номерів (FR-04, BC-11)  

**Done when:** TC-04–TC-06.

### 5. `document-numbering`

Крок 2.

- Дата за замовчуванням — сьогодні; редагування дозволене  
- Рахунок `Р-{NNNNNNN}`, акт `{N}`  
- Лічильник `./{year}/doc_number.json`; роки незалежні  
- Номери не перегенеровуються при Назад/reload, якщо вже в сеансі (NFR-04)  

**Done when:** TC-07–TC-10.

### 6. `contacts`

Кроки 3–4.

- Вибір / створення; файл `./contacts/{РНОКПП}.json`  
- Поля: `full-name`, `inn`, `phone`, `acc`, `bank`, `mfo-bank`, `addr`  
- Snapshot у сеанс (див. DESIGN.md)  
- Валідація: без РНОКПП не зберегти (TC-26)  

**Done when:** TC-11–TC-13, TC-26.

### 7. `services-catalog`

Крок 5.

- Каталог `./jobs/services.json`  
- Поля рядка: `sign-name`, `service-name`, `amount`, `price`  
- Кілька послуг у документі  

**Done when:** TC-14.

### 8. `template-fill`

Крок 6.

- Заповнення якорів рахунка (FR-13) і акта (FR-14)  
- `price-total` = Σ(`amount × price`) (TC-24)  
- Preview HTML без inline-редагування вмісту  
- Залежить від `locale-helpers` і даних сеансу  

**Done when:** TC-15, TC-16, TC-24; preview відповідає шаблонам A4.

### 9. `pdf-export`

Крок 7 + завантаження.

- Read-only фінал; PDF для кожного документа за типом  
- Назад → крок 6 зі збереженими даними  
- «Редагувати» з перегляду → повернення у флоу (FR-16)  
- PDF візуально = HTML (NFR-07)  

**Done when:** TC-17–TC-19; MVP happy-path з product-brief закритий.

---

## Залежності

```
locale-helpers ──────────────────────────────────────┐
                                                     ▼
document-session ──► wizard-shell ──► document-type ──► document-numbering
                           │                                    │
                           ├──────────────────► contacts ◄──────┤
                           │                       │            │
                           └──────────► services-catalog ◄──────┘
                                           │
                                           ▼
                                    template-fill
                                           │
                                           ▼
                                      pdf-export
```

| Capability | Залежить від |
|------------|--------------|
| `locale-helpers` | — |
| `document-session` | — (scaffold Next.js тут або безпосередньо перед) |
| `wizard-shell` | `document-session` |
| `document-type` | `wizard-shell` |
| `document-numbering` | `wizard-shell`, `document-type` (знає, які номери потрібні) |
| `contacts` | `wizard-shell` |
| `services-catalog` | `wizard-shell` |
| `template-fill` | `locale-helpers`, `document-numbering`, `contacts`, `services-catalog` |
| `pdf-export` | `template-fill` |

`contacts` і `services-catalog` **незалежні один від одного** після `wizard-shell` — їх можна робити паралельно або в будь-якому порядку між numbering і template-fill. Рекомендований лінійний порядок нижче зручніший для одного агента.

---

## Порядок імплементації

Рекомендована послідовність OpenSpec changes (Must-first, вертикаль до PDF в кінці):

| Phase | Change (приклад імені) | Capability | Чому саме тут |
|-------|------------------------|------------|---------------|
| 0 | *(опційно)* `scaffold-next-app` | — | App Router, TS, data-root; можна злити з phase 1 |
| 1 | `add-locale-helpers` | `locale-helpers` | Нульові залежності; TC фіксовані; потрібні на кроці 6 |
| 2 | `add-document-session` | `document-session` | Без `guid`/JSON немає жодного кроку |
| 3 | `add-wizard-shell` | `wizard-shell` | Єдиний каркас навігації для всіх кроків |
| 4 | `add-document-type` | `document-type` | Крок 1; визначає, які документи далі |
| 5 | `add-document-numbering` | `document-numbering` | Крок 2; номери до шаблонів |
| 6 | `add-contacts` | `contacts` | Кроки 3–4 |
| 7 | `add-services-catalog` | `services-catalog` | Крок 5 |
| 8 | `add-template-fill` | `template-fill` | Крок 6; збирає все + helpers |
| 9 | `add-pdf-export` | `pdf-export` | Крок 7; закриває MVP |

### Паралелізація (якщо кілька агентів)

Після phase 3 (`wizard-shell`):

- Track A: `document-type` → `document-numbering`
- Track B: `contacts`
- Track C: `services-catalog` (можна стартувати одразу після shell)
- Track D: `locale-helpers` може йти **паралельно з 2–7** з самого початку

Злиття обов’язкове перед `template-fill`.

### Should vs Must

| Пріоритет | Що | Коли |
|-----------|-----|------|
| Must | Усе крім FR-04 | У phases 1–9 |
| Should | FR-04 (копіювання з `guid`) | Усередині `document-type`; можна відкласти на кінець phase 4, якщо треба швидше закрити happy-path |

---

## Трасування FR → capability (швидкий індекс)

| FR | Capability |
|----|------------|
| FR-01, FR-02, FR-19 | `document-session` |
| FR-03, FR-04 | `document-type` |
| FR-05, FR-06, FR-07 | `document-numbering` |
| FR-08, FR-09, FR-10 | `contacts` |
| FR-11, FR-12 | `services-catalog` |
| FR-13, FR-14 | `template-fill` |
| FR-15, FR-16 | `pdf-export` |
| FR-17, FR-18 | `wizard-shell` |
| FR-20, FR-21 | `locale-helpers` |

---

## Критерій «MVP готовий»

Усі Must-capabilities 1–9 реалізовані; проходять TC-01…TC-26 (крім опційного відкладення TC-06, якщо FR-04 відкладено). Сценарій з product-brief: один прохід «рахунок + акт» → PDF → повтор з каталогу контактів/послуг → нові номери.

---

## Наступний крок

Почати з `/opsx:propose` для **`add-locale-helpers`** або **`add-document-session`** (якщо helpers хочете паралельно пізніше — стартуйте з session + scaffold).
