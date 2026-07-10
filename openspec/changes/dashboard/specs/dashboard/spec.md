# Dashboard — Delta Spec

Дельта-специфікація capability `dashboard` (FR-DASH-01..02).

## ADDED Requirements

### Requirement: Main Dashboard with Four KPI Blocks

Система SHALL показувати головний дашборд із чотирма KPI-блоками: статуси
замовлень, топ-5 найбільших запізнень, критичні дефіцити матеріалів і
перевантажені РЦ (FR-DASH-01).

#### Scenario: Status counts and top-5 delays

- **GIVEN** замовлення з різними відхиленнями і статусами
- **WHEN** будується огляд дашборду
- **THEN** `statusCounts` містить кількості по статусах
- **AND** `topDelays` містить до 5 замовлень із `delayDays > 0`, відсортованих
  за відхиленням спадно

#### Scenario: Critical deficits block lists only uncovered materials

- **GIVEN** критичний дефіцит M (без дати закриття) і покривний N (з датою)
- **WHEN** будується огляд
- **THEN** `criticalDeficits` містить M і не містить N

#### Scenario: Overloaded cells block lists only >100% slots

- **GIVEN** слоти завантаженості 120 %, 80 %, 150 %, 100 %
- **WHEN** будується огляд
- **THEN** `overloadedCells` містить лише слоти 150 % і 120 % (спадно)

### Requirement: Blocks Deep-link to Detailed Views

Система SHALL робити кожен блок дашборду переходом до відповідного детального
розділу: статуси → зведення по замовленнях, запізнення → Гантт, дефіцити →
матеріальне забезпечення, перевантаження → завантаженість (FR-DASH-02).

#### Scenario: Clicking a block navigates to its detailed section

- **WHEN** користувач натискає KPI-блок
- **THEN** застосунок переходить (скролить) до відповідного детального розділу
