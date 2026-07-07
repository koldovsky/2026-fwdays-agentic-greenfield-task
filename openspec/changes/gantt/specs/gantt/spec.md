# Gantt — Delta Spec

Дельта-специфікація capability `gantt` (FR-GANTT-01..09) на базі
`dhtmlx-gantt` Community Edition (TC-STACK-03).

## ADDED Requirements

### Requirement: Operations Grouped by Resource Center

Система SHALL відображати операції на діаграмі Гантта з віссю X — час і віссю Y —
ресурсні центри, згруповані по групах РЦ (ГРЦ), моделюючи трирівневе дерево
ГРЦ → РЦ → операція (FR-GANTT-01).

#### Scenario: Operations nest under their RC and RC-group

- **GIVEN** операції на РЦ-1 (ГРЦ-1) і РЦ-2 (ГРЦ-2)
- **WHEN** будується модель Гантта
- **THEN** зʼявляються вузли-групи на кожну ГРЦ, вузли-РЦ як їхні діти, а кожна
  операція — дитина свого РЦ

### Requirement: Bar Content and Status Colors

Система SHALL показувати на кожній смузі назву операції, номер замовлення і
номенклатуру вузла (FR-GANTT-02), і SHALL розфарбовувати смуги за статусом:
синій — у нормі, жовтий — ризик запізнення (≤ 2 робочі дні), червоний —
запізнення, сірий — заблоковано матеріалом; закріплені вручну смуги SHALL
позначатися штрихуванням (FR-GANTT-03).

#### Scenario: Each status maps to its colour class

- **GIVEN** операції зі статусами `ok`, `at-risk`, `late`, `blocked-material`
- **WHEN** обчислюється клас смуги
- **THEN** класи відповідають синьому, жовтому, червоному і сірому відповідно
- **AND** закріплена операція додатково отримує клас штрихування

### Requirement: Time Scale Switching

Система SHALL дозволяти перемикати масштаб осі часу між година / день / тиждень /
місяць без перезавантаження сторінки (FR-GANTT-05).

#### Scenario: Switching scale re-renders without reload

- **WHEN** користувач обирає інший масштаб
- **THEN** діаграма перемальовується у новому масштабі без перезавантаження

### Requirement: Always-visible Today Marker

Система SHALL завжди відображати вертикальну лінію «Сьогодні» на діаграмі
(FR-GANTT-09).

#### Scenario: Today line is present after every render

- **WHEN** діаграма відмальовується у будь-якому масштабі
- **THEN** вертикальна лінія «Сьогодні» присутня

### Requirement: Filters and Detail Panel

Система SHALL дозволяти фільтрувати смуги за ГРЦ, РЦ, замовленням, номенклатурою,
статусом і «лише критичний шлях» (FR-GANTT-06), і при кліку на смугу SHALL
показувати бокову панель із деталями операції, місцем у BOM, залежними операціями
й потрібними матеріалами (FR-GANTT-04).

#### Scenario: Clicking a bar opens its detail panel

- **WHEN** користувач клікає смугу операції
- **THEN** відкривається панель із деталями операції та її звʼязками

### Requirement: Critical Path Highlight

Система SHALL за натисканням кнопки підсвічувати ланцюжок критичних операцій
обраного замовлення (FR-GANTT-08).

#### Scenario: Highlight marks the order's critical chain

- **GIVEN** обране замовлення з відомим критичним шляхом
- **WHEN** увімкнено підсвітку критичного шляху
- **THEN** операції критичного шляху цього замовлення виділяються

### Requirement: Drag Recalculates Dependent Operations

Система SHALL при перетягуванні смуги негайно перераховувати залежні операції за
правилом Finish-to-Start + міжопераційний день і оновлювати прогнозовану дату
готовності замовлення (FR-GANTT-07). Переміщена операція SHALL закріплюватися;
розповсюдження — лише вперед (залежні не тягнуться назад).

#### Scenario: Moving an operation later pushes its dependents

- **GIVEN** маршрут вузла з op10 → op20
- **WHEN** op10 перетягнуто на пізніший час
- **THEN** op20 стартує не раніше початку наступного робочого дня після нового
  кінця op10
- **AND** прогнозована дата готовності замовлення оновлюється, а op10 позначена
  закріпленою

#### Scenario: Moving an operation earlier does not drag dependents back

- **WHEN** op10 перетягнуто на раніший час
- **THEN** op20 лишається на своєму місці (не зсувається раніше)
