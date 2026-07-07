# Material Check — Delta Spec

Дельта-специфікація capability `material-check` (FR-MAT-01..03).

## ADDED Requirements

### Requirement: Material Deficit Table

Система SHALL показувати таблицю дефіциту матеріалів із колонками: матеріал,
брутто-потреба, залишок, план надходжень, нетто-дефіцит, дата закриття дефіциту і
заблоковані замовлення (FR-MAT-01).

#### Scenario: Deficit row exposes all MRP fields

- **GIVEN** матеріал із брутто-потребою, залишком і надходженнями
- **WHEN** будується таблиця дефіциту
- **THEN** рядок містить брутто, залишок, надходження, нетто-дефіцит, дату
  закриття і перелік заблокованих замовлень

### Requirement: Critical Deficits Highlighted Separately

Система SHALL виділяти матеріали з критичним дефіцитом (жодне надходження не
покриває, `earliestCoverDate === null`) в окремий блок із попередженням
(FR-MAT-02).

#### Scenario: Uncovered material is classified critical

- **GIVEN** матеріал із брутто 10, залишком 0 і без надходжень
- **WHEN** обчислюється матеріальна перевірка
- **THEN** матеріал потрапляє у `critical`, а не у `coverable`
- **AND** його `earliestCoverDate` дорівнює null

#### Scenario: Later receipt makes the deficit coverable, not critical

- **GIVEN** матеріал із брутто 10, залишком 0, датою споживання Jan10 і
  підтвердженим надходженням 10 на Jan15
- **WHEN** обчислюється матеріальна перевірка
- **THEN** нетто-дефіцит = 10, `earliestCoverDate` = Jan15, матеріал у `coverable`

### Requirement: Instant Recalculation on Manual Edits

Система SHALL при ручному коригуванні залишків або плану надходжень одразу
перераховувати дефіцити без повного перепланування розкладу операцій (FR-MAT-03).

#### Scenario: Editing stock removes the deficit without re-planning

- **GIVEN** критичний дефіцит матеріалу M
- **WHEN** залишок M вручну збільшено до покриття потреби
- **THEN** дефіцит M зникає з таблиці одразу
- **AND** розклад операцій не перебудовується

#### Scenario: Adding a receipt reclassifies the deficit as coverable

- **GIVEN** критичний дефіцит матеріалу M і дата споживання Jan10
- **WHEN** додано підтверджене надходження M на Jan15
- **THEN** дефіцит стає покривним із датою закриття Jan15
