# Scheduling — Delta Spec

Дельта-специфікація capability `scheduling`. Вимоги трасуються до PRD v0.3
(`docs/requirements.md`). Сценарії відповідають `../requirements.md`.

## ADDED Requirements

### Requirement: BOM Expansion and Consolidation

Система SHALL рекурсивно розгортати BOM кожного замовлення у плоске дерево
вузлів, множачи кількість на кожному рівні (`effectiveQty = qty × qtyPer`),
і SHALL консолідувати номенклатуру, що зустрічається у кількох замовленнях або
підзбірках, в один виробничий блок із сумарною кількістю (FR-BOM-01, FR-BOM-03).

#### Scenario: Simple order finishes on time

- **GIVEN** одне замовлення на виріб A з BOM `A → [B, C]`, `B → [D]`, `C → [D]`
- **WHEN** планування виконується у режимі `min-lateness` з достатнім дедлайном
- **THEN** операції D розміщені раніше B і C, B і C раніше A
- **AND** `delayDays` дорівнює 0, а `deficits` порожній

#### Scenario: Shared detail consolidated across orders

- **GIVEN** два замовлення, вироби яких обидва потребують деталь D (10 і 15 шт)
- **WHEN** планування виконується
- **THEN** D з'являється у розкладі рівно один раз із консолідованою кількістю 25

### Requirement: Material Requirements Planning

Система SHALL розраховувати брутто-потребу в матеріалах через розгортання BOM і
нетто-дефіцит як `брутто − залишки − підтверджені надходження до дати старту
операції`. Матеріал без надходжень, що покривають дефіцит, SHALL позначатися як
критичний, а операції-споживачі — як заблоковані матеріалом (FR-MRP-01, FR-MRP-02,
FR-MRP-04, FR-MRP-05).

#### Scenario: Critical material deficit blocks operations

- **GIVEN** матеріал M із залишком 0 і без надходжень, який споживає операція
- **WHEN** планування виконується
- **THEN** запис дефіциту M має `netDeficit > 0` і `earliestCoverDate = null`
- **AND** операції-споживачі мають статус `blocked-material`
- **AND** замовлення, що потребують M, присутні у `blockedOrderIds`

### Requirement: Backward Scheduling with Forward Fallback

Система SHALL розставляти операції методом зворотного розкладу від дати здачі
замовлення. Якщо зворотний розклад дає старт раніше `today`, система SHALL
перейти на прямий розклад від `today` і зафіксувати `delayDays` (FR-SCHED-02,
FR-SCHED-03).

#### Scenario: Backward schedule within horizon

- **GIVEN** замовлення з достатнім запасом часу до дедлайну
- **WHEN** планування виконується у режимі `min-lateness`
- **THEN** усі операції розміщені у минулому не раніше `today`, `delayDays = 0`

#### Scenario: Backward runs into the past → forward, order is late

- **GIVEN** замовлення з дедлайном завтра і трудомісткістю ~3 робочі дні
- **WHEN** планування виконується
- **THEN** операції отримують прямий розклад від `today`
- **AND** `delayDays > 0`, а прогнозована готовність ≈ `today + 3` робочі дні

### Requirement: Inter-operation Gap

Система SHALL забезпечувати міжопераційний час: наступна операція маршруту (і
операція вузла-батька відносно дочірніх вузлів) стартує не раніше початку
наступного робочого дня після завершення попередньої (FR-SCHED-04, FR-SCHED-05).

#### Scenario: Next operation starts on the next working day

- **GIVEN** дві послідовні операції маршруту вузла
- **WHEN** планування виконується
- **THEN** старт наступної операції не раніше початку наступного робочого дня
  після завершення попередньої

### Requirement: Resource Center Selection within Group

Система SHALL призначати операцію на конкретний РЦ всередині ГРЦ, що (а) має тип
операції у переліку `allowedOpTypes` і (б) має мінімальне поточне завантаження у
потрібному слоті; якщо всі РЦ ГРЦ перевантажені — на найраніший вільний слот
(FR-SCHED-07, FR-SCHED-08).

#### Scenario: Least-loaded allowed RC is chosen

- **GIVEN** ГРЦ з кількома РЦ, лише частина яких дозволяє тип операції
- **WHEN** операція призначається
- **THEN** обирається дозволений РЦ з мінімальним завантаженням у слоті

### Requirement: Critical Ratio Conflict Resolution

При конкуренції операцій за слот на РЦ пріоритет SHALL визначатися за Critical
Ratio (`CR = робочих днів до дедлайну / залишкова трудомісткість у днях`); менший
CR — вищий пріоритет (FR-SCHED-09).

#### Scenario: Lower CR order gets the contested slot

- **GIVEN** два замовлення, що конкурують за єдиний РЦ ГРЦ, з різними CR
- **WHEN** планування виконується
- **THEN** замовлення з меншим CR отримує пріоритетний слот
- **AND** інше замовлення зсувається на наступний вільний слот без перекриття

### Requirement: Critical Path

Система SHALL визначати критичний шлях кожного замовлення як найдовший ланцюжок
операцій, що визначає найранішу дату готовності (FR-SCHED-10).

#### Scenario: Critical path ends at the ready-determining operation

- **GIVEN** розклад замовлення з паралельними гілками різної трудомісткості
- **WHEN** обчислюється критичний шлях
- **THEN** він проходить через найдовший ланцюжок і завершується операцією з
  найпізнішим `endAt`

### Requirement: Two Schedule Variants

Функція планування SHALL підтримувати два режими: `min-lateness` (backward,
CR-пріоритет) і `min-idle` (forward, щільне заповнення), повертаючи для кожного
незалежний результат із метриками (FR-SCHED-11).

#### Scenario: Modes satisfy the documented inequalities

- **GIVEN** набір замовлень із різними дедлайнами і трудомісткостями
- **WHEN** планування виконується в обох режимах
- **THEN** `min-lateness.lateOrdersCount ≤ min-idle.lateOrdersCount`
- **AND** `min-idle.avgLoadPct ≥ min-lateness.avgLoadPct`

### Requirement: Deterministic Pure Function

Функція `schedule` SHALL бути чистою (без залежностей від React, DOM, Next.js),
приймати і повертати plain-об'єкти, використовувати хвилини як внутрішню одиницю
часу і давати ідентичний результат для однакового входу (TC-STACK-02, TC-ALGO-01).

#### Scenario: Same input yields identical output

- **GIVEN** великий вхід (1000 замовлень)
- **WHEN** `schedule` викликається двічі з однаковим входом
- **THEN** результати ідентичні, а час виконання менший за 30 секунд
