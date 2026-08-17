# DESIGN.md

Дизайн-рішення для генератора рахунків/актів.  
Вимоги: [docs/requirements.md](./docs/requirements.md) · наратив: [docs/product-brief.md](./docs/product-brief.md) · сире ТЗ: [docs/prd-draft.md](docs/prd-draft.md).

---

## 1. Цілі дизайну

1. Провести користувача від порожнього сеансу до PDF без зайвих екранів.
2. Зберегти візуальну вірність існуючих HTML-шаблонів A4.
3. Зробити стан відновлюваним за `guid` (чернетка = посилання).
4. Винести конвертацію суми й дати прописом у перевикористовувані helpers (FR-20, FR-21).

---

## 2. Архітектура (високий рівень)

```
Browser (wizard + preview)
        │
        ▼
Next.js App Router  ──►  Document Service  ──►  FS JSON store
        │                      │
        │                      ├── docs/{guid}.json
        │                      ├── contacts/{inn}.json
        │                      ├── jobs/services.json
        │                      └── {year}/doc_number.json
        ▼
Helpers (amount→words, date→cursive)
        │
        ▼
Template Engine (fill HTML) ──► PDF renderer (HTML→PDF)
        ▲
        └── templates/invoce.html | complete.html
```

**Стек (рішення):** Next.js (App Router) + TypeScript. Дані MVP — файлова система поруч із застосунком (або виділений data-root), без зовнішньої БД. Це відповідає BC-04 і спрощує демо/локальний запуск.

**Чому не БД:** обсяг даних малий (контакти, послуги, сеанси); файли зручно інспектувати й бекапити; PRD уже фіксує шляхи JSON.

**Naming (NFR-13):** ключі JSON і CSS-якорі — kebab-case (`full-name`, `mfo-bank`, `done-by-*`), окрім явно зафіксованого в PRD `done_amount` у шаблоні рахунка.

---

## 3. Модель даних

### 3.1 Document session — `docs/{guid}.json`

```ts
type DocType = "invoice_act" | "invoice" | "act";

type ContactRef = {
  inn: string; // РНОКПП, ключ у contacts/
  // snapshot на момент документа (щоб PDF не «поплив» після правки контакту)
  "full-name": string;
  phone: string;
  acc: string;
  bank: string;
  "mfo-bank": string;
  addr: string;
};

type ServiceLine = {
  "sign-name": string;
  "service-name": string;
  amount: number;
  price: number;
};

type DocumentSession = {
  guid: string;
  docType: DocType;
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  completed: boolean;
  date: string; // ISO date у сеансі; у шаблон — DD.MM.YYYY
  invoiceNumber?: string; // "Р-0000001"
  actNumber?: string;     // "1"
  client?: ContactRef;
  "done-by"?: ContactRef;
  services: ServiceLine[];
  copiedFrom?: string;
  updatedAt: string;
};
```

**Рішення:** у сеансі зберігаємо snapshot контактів, а не лише `inn`. Каталог `contacts/` — для вибору наступного разу; історичний PDF лишається стабільним.

У TypeScript-коді зручніше camelCase (`fullName`, `mfoBank`, `doneBy`) з мапінгом на kebab-case при серіалізації в JSON/шаблони — або тримати kebab-case end-to-end. **Обрано:** kebab-case у JSON і шаблонах (як у PRD); у TS — типи з quoted keys або тонкий mapper.

### 3.2 Contact — `contacts/{РНОКПП}.json`

Поля: `full-name`, `inn`, `phone`, `acc`, `bank`, `mfo-bank`, `addr`.

### 3.3 Services catalog — `jobs/services.json`

Масив послуг: `sign-name`, `service-name`, опційно останні `amount` / `price` як підказки (рядки документа копіюються в сеанс).

### 3.4 Numbering — `{year}/doc_number.json`

```ts
type DocNumberState = {
  year: number;
  lastInvoiceSeq: number; // → Р-{7 digits}
  lastActSeq: number;     // → decimal string
};
```

Номери видаються на кроці 2 і не перегенеровуються при «Назад», якщо вже призначені в сеансі (NFR-04).

---

## 4. Маршрутизація й навігація флоу

| Route | Призначення |
|-------|-------------|
| `/` | Старт: створити новий `guid` → redirect на `/docs/{guid}` |
| `/docs/[guid]` | Єдиний URL флоу + перегляду |

**Рішення:** один URL на сеанс (FR-02). Крок — поле `currentStep` у JSON, не окремі path-сегменти.

**Відновлення:**

- `completed === false` → рендер кроку `currentStep` (або першого незаповненого).
- `completed === true` → фінальний перегляд з PDF і «Редагувати».

**Копіювання (FR-04):** новий `guid`, deep-copy без `invoiceNumber` / `actNumber`; на кроці 2 — нова нумерація.

---

## 5. Кроки UI

| Step | UI | Валідація перед «Далі» |
|------|----|------------------------|
| 1 | Radio: рахунок+акт / рахунок / акт; поле «guid для копіювання» | Обрано тип або успішне копіювання |
| 2 | Date picker; read-only номери після генерації | Валідна дата |
| 3 | Пошук контакту + форма створення замовника | Усі обов’язкові поля, валідний РНОКПП |
| 4 | Те саме для виконавця | Як крок 3 |
| 5 | Каталог, рядки (`sign-name`, `service-name`, `amount`, `price`), «додати ще» | ≥ 1 послуга з кількістю й ціною |
| 6 | Preview HTML (iframe або sanitized HTML) | Шаблони успішно заповнені |
| 7 | Read-only + PDF + Назад | — |

Прогрес: кружки 1…7; поточний — акцент; пройдені — заповнені; майбутні — контур (FR-18, NFR-02).

---

## 6. Шаблони й PDF

### 6.1 Заповнення

**Рішення:** підстановка тексту в елементи за CSS-класами-якорями (не Mustache у файлах). Pixel-вірність `templates/*.html`.

Префікси / поля:

| Якір | Документ | Джерело |
|------|----------|---------|
| `client-*` | рахунок, акт | snapshot замовника (`full-name`, `inn`, …) |
| `done-by-*` | рахунок, акт | snapshot виконавця |
| `amount-cursive` | рахунок, акт | helper суми прописом |
| `date` | рахунок | `DD.MM.YYYY` з дати сеансу |
| `date-cursive` | рахунок | helper дати прописом |
| `service-cursive` | рахунок | текст послуги (`service-name` / агрегат) |
| `done_amount` | рахунок | кількість з рядка (`amount` у моделі → якір `done_amount`) |
| `price` | рахунок | ціна рядка |
| `price-total` | рахунок | Σ(`amount × price`) |

**Мапінг моделі → якір:** поле каталогу/сеансу `amount` у шаблоні рахунка пишеться в клас `done_amount` (ім’я якоря з PRD).

Рядки таблиці послуг: клонувати row-шаблон або рендерити з `services[]`.

### 6.2 Helpers

Окремий модуль (напр. `lib/helpers/`):

```ts
amountToCursive(8750) // "Вісім тисяч сімсот п'ятдесят гривень 00 копійок"
dateToNumeric(d)      // "15.05.2021"
dateToCursive(d)      // "15 травня 2021 р."
```

Використовуються на кроці 6 і при генерації PDF; покриті TC-22, TC-23.

### 6.3 PDF

**Рішення:** серверний HTML→PDF (Playwright/Puppeteer). Той самий заповнений HTML, що й preview.

Ендпоінти (орієнтир):

- `GET /api/docs/[guid]/pdf?type=invoice|act`
- `GET /api/docs/[guid]` — JSON стану

---

## 7. Візуальний дизайн (продуктовий UI)

Не плутати з виглядом PDF (чорно-білий Arial з шаблонів).

| Токен | Рішення |
|-------|---------|
| Фон | Світло-сірий / off-white (`#F5F6F8`) |
| Поверхні | Білі панелі кроку, межа `#E2E4E8` |
| Текст | `#1A1D21`, вторинний `#5C6370` |
| Акцент | Приглушений синьо-сірий `#3D5A80` |
| Шрифт UI | IBM Plex Sans / Source Sans 3; у PDF — Arial з шаблону |
| Кнопки | Radius 4–6px, не pills |
| Прогрес | Кружки з номером кроку |

Атмосфера: канцелярія / фінанси. Форма в один стовпчик; preview — поруч на wide, знизу на mobile (кроки 6–7).

---

## 8. Ключові алгоритми

### 8.1 Нумерація

```
on confirm step 2:
  year = yearOf(session.date)
  state = readOrInit(`{year}/doc_number.json`)
  if session needs invoice and !session.invoiceNumber:
    state.lastInvoiceSeq += 1
    session.invoiceNumber = `Р-${pad7(state.lastInvoiceSeq)}`
  if session needs act and !session.actNumber:
    state.lastActSeq += 1
    session.actNumber = String(state.lastActSeq)
  write state + session
```

### 8.2 Сума й підсумок

```
price-total = Σ(line.amount * line.price)
amount-cursive = amountToCursive(price-total)
```

### 8.3 Дата

```
date         = format DD.MM.YYYY
date-cursive = dateToCursive(session.date)
```

### 8.4 «Останній незаповнений крок»

Перший крок без обов’язкових даних; якщо все заповнено й `completed` — крок 7.

---

## 9. API / серверні операції (орієнтир)

| Операція | Поведінка |
|----------|-----------|
| `POST /api/docs` | Створити сеанс, повернути `guid` |
| `GET/PATCH /api/docs/[guid]` | Читання / оновлення кроку |
| `POST /api/docs/[guid]/copy` | Новий сеанс з даних джерела |
| `GET/PUT /api/contacts/[inn]` | Каталог контактів |
| `GET/PUT /api/jobs/services` | Каталог послуг |
| `GET /api/docs/[guid]/pdf` | PDF |

Усі мутації одразу персистять JSON (NFR-03, NFR-10).

---

## 10. Ризики й пом’якшення

| Ризик | Пом’якшення |
|-------|-------------|
| Гонка при видачі номерів | Файловий lock / атомарний write для `doc_number.json` |
| Зміна контакту ламає старі PDF | Snapshot у сеансі |
| Розбіжність preview і PDF | Той самий HTML pipeline |
| `amount` (модель) vs `done_amount` (якір) | Явний мапінг у template engine |
| Вим’я `invoce.html` | Не перейменовувати (BC-07); alias `invoiceTemplatePath` |
| Security-through-obscurity `guid` | MVP OK (NFR-11); UUID v4 |

---

## 11. Порядок імплементації

1. FS store + модель сеансу (kebab-case) + `POST/GET/PATCH` docs  
2. Helpers: `amountToCursive`, `dateToCursive` (+ unit tests TC-22/23)  
3. Wizard shell (кружки, назад/далі, persist step)  
4. Кроки 1–5 (тип, номери, контакти, послуги)  
5. Template fill (`client-*`, `done-by-*`, invoice fields) + preview  
6. PDF export  
7. Copy-from-guid + resume rules  
8. Polish UI / валідація / негативні TC  

Checker: прогін TC-01…TC-26 з [requirements.md](./docs/requirements.md).
