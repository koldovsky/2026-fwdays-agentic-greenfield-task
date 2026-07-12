# Швидке вставлення — посібник і тестові дані

> **Де:** `/invoices/new` → блок **«Швидке вставлення»**  
> **Spec:** FR-INPUT-02 · **Capability:** `form-input` (S4, shipped)

---

## Як користуватись

1. **Один раз:** [Налаштування](/settings) → профіль постачальника з **IBAN USD і EUR** (без цього preview не згенерується).
2. (Опційно) [Клієнти](/clients) → додайте клієнта в довідник.
3. Відкрийте `/invoices/new`.
4. У блоці «Швидке вставлення»:
   - **не покладайтесь на сірий placeholder** у textarea — це лише підказка, не значення;
   - відкрийте файл з [`samples/`](samples/) або скопіюйте блок нижче;
   - **Cmd+A → Cmd+C** у файлі → клік у textarea → **Cmd+V**;
   - натисніть **«Застосувати»**.
5. Перевірте поля форми та **попередній перегляд** справа.

### Формат рядків

```
ключ: значення
```

- Звичайна двокрапка `:` (не `：`).
- Один рядок = одне поле.
- Регістр ключа не важливий (`CLIENT` = `client`).
- Невідомі ключі **ігноруються** (форма не падає).

### Допустимі ключі

| Ключ | Поле форми |
| --- | --- |
| `client` | Назва клієнта |
| `addr` | Адреса |
| `email` | Email |
| `phone` | Телефон |
| `web` | Вебсайт |
| `curr` | Валюта (`USD` або `EUR`) |
| `service` | Опис послуги (NACE matcher) |
| `qty` | Кількість |
| `amount` | Ціна за одиницю |
| `prepay` | Передоплата % (`50` або `50%`) |
| `pay_days` | Термін оплати (днів) |
| `exec_days` | Термін виконання (днів) |

---

## Готові файли для копіювання

| # | Сценарій | Файл |
| --- | --- | --- |
| 1 | Happy path — USD, логотип | [samples/01-happy-path-usd-logo.txt](samples/01-happy-path-usd-logo.txt) |
| 2 | UA клієнт, EUR, відеомонтаж | [samples/02-uk-client-eur-video.txt](samples/02-uk-client-eur-video.txt) |
| 3 | 3D / віртуальний тур | [samples/03-virtual-tour-usd.txt](samples/03-virtual-tour-usd.txt) |
| 4 | Ambiguous NACE — вибір послуги | [samples/04-ambiguous-nace-design.txt](samples/04-ambiguous-nace-design.txt) |
| 5 | Невідомий ключ ігнорується | [samples/05-unknown-key-ignored.txt](samples/05-unknown-key-ignored.txt) |

---

## Сценарії (текст у документі)

### 1. Happy path — USD, логотип

**Файл:** `samples/01-happy-path-usd-logo.txt`

```text
client: Acme Studio LLC
addr: 10 Market St, San Francisco, CA 94103, USA
email: billing@acme.example
phone: +1 415 555 0100
web: https://acme.example
curr: USD
service: logo design
qty: 2
amount: 5525
prepay: 50%
pay_days: 3
exec_days: 14
```

**Очікування:** NACE → graphic-design; preview з сумою 2 × 5525; передоплата 50%.

---

### 2. Український клієнт, EUR, відеомонтаж

**Файл:** `samples/02-uk-client-eur-video.txt`

```text
client: ТОВ «Сонячний Вітер»
addr: вул. Хрещатик, 22, Київ, 01001, Україна
email: finance@sonyachnyi.example
phone: +380 44 123 4567
web: sonyachnyi.example
curr: EUR
service: відеомонтаж і кольорокорекція
qty: 1
amount: 1200
prepay: 30
pay_days: 5
exec_days: 21
```

**Очікування:** валюта EUR; NACE video-post-production; IBAN EUR у профілі постачальника.

---

### 3. 3D / віртуальний тур

**Файл:** `samples/03-virtual-tour-usd.txt`

```text
client: Nordic Build AS
addr: Storgata 15, 0155 Oslo, Norway
email: projects@nordicbuild.example
phone: +47 22 11 33 44
web: nordicbuild.no
curr: USD
service: Interactive 360 virtual tour visualization
qty: 1
amount: 8500
prepay: 50%
pay_days: 7
exec_days: 28
```

**Очікування:** NACE visualization-3d-360; preview USD.

---

### 4. Ambiguous NACE (вибір вручну)

**Файл:** `samples/04-ambiguous-nace-design.txt`

```text
client: Design Hub
addr: 5 Creative Ave, Berlin, Germany
email: hello@designhub.example
phone: +49 30 12345678
web: designhub.example
curr: USD
service: дизайн
qty: 1
amount: 3000
prepay: 50%
pay_days: 3
exec_days: 14
```

**Очікування:** список радіо-кнопок з кількома послугами → оберіть одну → тоді з’явиться preview.

---

### 5. Невідомий ключ (ігнорується)

**Файл:** `samples/05-unknown-key-ignored.txt`

```text
note: цей рядок має ігноруватись
client: Test Client Ltd
addr: 1 Test Street, London
email: test@client.example
phone: +44 20 7946 0958
web: test.example
curr: USD
service: logo design
qty: 1
amount: 650
prepay: 0
pay_days: 3
exec_days: 7
```

**Очікування:** рядок `note:` ігнорується; решта полів заповнюється; preview OK.

---

## Ручні перевірки після вставлення

Виконуйте **після** сценарію 1 (поля вже заповнені).

| Дія | Очікуваний результат |
| --- | --- |
| Очистити **Email** | Preview зникає; червона помилка на полі |
| Email → `not-email` | UA-помилка + приклад `billing@client.example` |
| Телефон → `abc` | Помилка + приклад `+380 44 123 4567` |
| Передоплата → `150` | Помилка діапазону 0–100 |
| Послуга → `xyz невідома послуга` | «Не вдалося визначити послугу…» |
| **Tab** до блоку preview | Фокус доходить до панелі перегляду (NFR-A11Y-01) |
| DevTools → Console при валідному preview | Без app errors (NFR-OBS-01) |

---

## Типові помилки

| Симптом | Причина | Рішення |
| --- | --- | --- |
| «Не знайдено жодного рядка у форматі key: value» | Textarea порожня (лише placeholder) | Вставте текст з `samples/` |
| Preview порожній, помилок немає | Немає NACE match або не обрано ambiguous | Уточніть `service` або оберіть радіо |
| Помилка IBAN | Немає IBAN для обраної валюти | Settings → профіль постачальника |
| «Додайте профіль постачальника» | Немає active supplier | Settings → створити профіль |

---

## Що вже можна / ще не можна (стан S4)

| Можна зараз | Ще не реалізовано |
| --- | --- |
| Форма + short format + prefill клієнта | Зберегти інвойс у реєстр |
| Live HTML preview | Завантажити HTML / друк (S4b `export-share`) |
| Валідація + NACE | PDF export (S6) |

Детальніше: [capability.md](../capability.md) · [current-state.md](../current-state.md).
