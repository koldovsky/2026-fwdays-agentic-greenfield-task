# Export — Delta Spec

Дельта-специфікація capability `export` (FR-EXP-01..05) на SheetJS (TC-STACK-05).

## ADDED Requirements

### Requirement: Operations Schedule Excel Export

Система SHALL експортувати розклад операцій у Excel з колонками: замовлення,
виріб, вузол BOM, ГРЦ, РЦ, операція, початок, кінець (дата+час), тривалість (хв),
статус (FR-EXP-01). Запис SHALL виконуватися на клієнті (SheetJS, TC-STACK-05).

#### Scenario: Operation row maps to the schedule columns

- **GIVEN** операція замовлення O1 (виріб A, вузол D, ГРЦ-1, РЦ-1, «Оп», 60 хв, ok)
- **WHEN** будується аркуш розкладу
- **THEN** заголовки містять усі 10 колонок, а рядок містить O1, A, D, ГРЦ-1, РЦ-1,
  «Оп», початок і кінець як дата+час, 60 і статус «В графіку»

### Requirement: Material Deficits Excel Export

Система SHALL експортувати таблицю дефіциту матеріалів у Excel (FR-EXP-02).

#### Scenario: Critical deficit shows "критичний" cover date

- **GIVEN** критичний дефіцит M без дати закриття і покривний дефіцит N із датою
- **WHEN** будується аркуш дефіцитів
- **THEN** для M дата закриття = «критичний», а для N = відповідна дата

### Requirement: Order Summary Excel Export

Система SHALL експортувати зведення по замовленнях у Excel з номером, виробом,
кількістю, датою здачі, датою готовності, відхиленням і статусом (FR-EXP-03).

#### Scenario: Order row maps to the summary columns

- **GIVEN** замовлення O1 (виріб A, кількість 5, вчасно)
- **WHEN** будується аркуш зведення
- **THEN** рядок містить O1, A, 5, дату здачі, дату готовності, 0 і статус «В графіку»

### Requirement: Gantt PDF via Browser Print

Система SHALL дозволяти зберегти Гантт у PDF через друк браузера із поточними
фільтрами і масштабом (FR-EXP-04).

#### Scenario: Printing isolates the current Gantt

- **WHEN** користувач запускає друк Гантта
- **THEN** друкується поточна діаграма з застосованими фільтрами й масштабом
  (решта інтерфейсу прихована print-стилями)

### Requirement: 1C-compatible Column Structure

Система SHALL використовувати структуру колонок Excel, узгоджену з форматом
вивантаження з 1С, щоб файли були придатні для зворотного завантаження (FR-EXP-05).

#### Scenario: Headers use the shared domain terminology

- **WHEN** формуються заголовки експорту
- **THEN** вони використовують узгоджену українську термінологію (Замовлення,
  Виріб/Номенклатура, ГРЦ, РЦ, Кількість, Дата тощо)
