# Data Import — Delta Spec

Дельта-специфікація capability `data-import`. Трасується до PRD v0.3
(`docs/requirements.md`, FR-IMP-01..11).

## ADDED Requirements

### Requirement: Per-table File Upload

Система SHALL приймати файли Excel (`.xlsx`) і CSV окремо для кожної з семи
таблиць (замовлення, BOM, маршрути, ГРЦ/РЦ, залишки, надходження, календар)
через drag-and-drop або кнопку вибору файлу, і SHALL парсити їх виключно на
клієнті без передавання на сервер (FR-IMP-01, NFR-DATA-01).

#### Scenario: A dropped orders file is parsed client-side

- **WHEN** користувач перетягує `.xlsx` у зону «Замовлення»
- **THEN** файл парситься у браузері у рядки і доменні об'єкти
- **AND** жоден байт не надсилається за межі клієнта

### Requirement: Typed Row Parsing per Report

Система SHALL перетворювати рядки кожного звіту у відповідні доменні об'єкти
(`Order`, `BomNode`, `RouteOperation`, `ResourceCenter` + `RcGroup`, `StockItem`,
`PlannedReceipt`, `WorkCalendar`), зіставляючи колонки за псевдонімами назв
(FR-IMP-02..08).

#### Scenario: Valid order row becomes a domain object

- **GIVEN** рядок замовлення з номером, виробом, кількістю і датою здачі
- **WHEN** застосовується парсер замовлень
- **THEN** повертається `Order` з `id`, `productId`, `qty`, `dueDate`
- **AND** список помилок порожній

#### Scenario: RC report yields both groups and resource centers

- **GIVEN** звіт ГРЦ/РЦ з двома РЦ у групі G1
- **WHEN** застосовується парсер ресурсних центрів
- **THEN** повертається одна група G1 з `rcIds` обох РЦ і два `ResourceCenter`

### Requirement: Validation Error Table Gates Planning

Система SHALL валідувати кожен рядок одразу після завантаження і SHALL
показувати таблицю помилок із полями (рядок, поле, причина); за наявності хоча б
однієї помилки рівня `error` запуск планування SHALL бути заблокований
(FR-IMP-09).

#### Scenario: Missing required field is reported and blocks planning

- **GIVEN** рядок замовлення з порожнім полем «виріб»
- **WHEN** виконується валідація
- **THEN** з'являється помилка `{ row, field: 'productId', reason, severity: 'error' }`
- **AND** рядок не входить у доменні дані, а планування заблоковане

#### Scenario: Invalid number, date, or enum is reported

- **GIVEN** рядок із нечисловою кількістю, непарсибельною датою або невалідним
  типом вузла BOM
- **WHEN** виконується валідація
- **THEN** для кожного некоректного поля з'являється помилка рівня `error`

### Requirement: Re-import Diff

Система SHALL при повторному завантаженні таблиці показувати diff відносно
попереднього імпорту з переліком доданих, видалених і змінених рядків (для
змінених — які поля відрізняються) (FR-IMP-10).

#### Scenario: Diff highlights added, removed, and changed rows

- **GIVEN** попередній імпорт `[O-1 qty 5, O-2 qty 3]`
- **WHEN** завантажується новий `[O-1 qty 7, O-3 qty 1]`
- **THEN** diff показує змінено 1 (O-1, поле `qty`), видалено 1 (O-2), додано 1 (O-3)

### Requirement: In-browser Editing

Система SHALL дозволяти переглядати і редагувати кожну завантажену таблицю у
браузері без повторного завантаження файлу; після редагування дані SHALL
перевалідовуватися (FR-IMP-11).

#### Scenario: Editing a cell re-validates the table

- **GIVEN** таблиця з помилкою у полі
- **WHEN** користувач виправляє клітинку в редакторі
- **THEN** таблиця перепарситься і помилка зникає

### Requirement: Session Persistence in IndexedDB

Система SHALL автоматично зберігати поточний сеанс (усі завантажені таблиці) в
IndexedDB через бібліотеку `idb` і SHALL відновлювати його після перезавантаження
браузера (NFR-SAVE-01).

#### Scenario: Session restores after reload

- **GIVEN** завантажені таблиці у сеансі
- **WHEN** браузер перезавантажується
- **THEN** таблиці відновлюються з IndexedDB без повторного завантаження файлів
