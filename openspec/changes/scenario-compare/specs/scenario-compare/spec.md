# Scenario Compare — Delta Spec

Дельта-специфікація capability `scenario-compare` (FR-SCEN-01..03).

## ADDED Requirements

### Requirement: Store up to Three Scenarios

Система SHALL зберігати до трьох варіантів розкладу одночасно і NOT дозволяти
додавати четвертий, доки один не видалено (FR-SCEN-01).

#### Scenario: Fourth scenario is blocked

- **WHEN** уже збережено 3 варіанти
- **THEN** додавання нового варіанту заблоковане
- **AND** `canAddScenario` повертає true для 0–2 і false для 3

### Requirement: Comparison Table of Metrics

Система SHALL показувати таблицю порівняння варіантів за метриками: кількість
запізнень, сумарне запізнення (днів), середня завантаженість РЦ (%), кількість
перевантажених слотів і WIP; і SHALL позначати найкращий варіант за кожною
метрикою за її напрямком «краще» (FR-SCEN-02).

#### Scenario: Best scenario per metric is identified

- **GIVEN** S1 з метриками {late 0, delay 0, avgLoad 60, overloaded 0, wip 2} і
  S2 з {late 1, delay 3, avgLoad 80, overloaded 1, wip 5}
- **WHEN** будується порівняння
- **THEN** найкращий за кількістю запізнень, сумарним запізненням, перевантаженням
  і WIP — S1, а за середньою завантаженістю — S2

### Requirement: Explicit Activation of One Scenario

Система SHALL вважати розклад прийнятим лише після того, як користувач явно обрав
один варіант і підтвердив його як активний; підтверджений варіант SHALL стати
активним розкладом для решти екранів (FR-SCEN-03, BC-UX-03).

#### Scenario: Confirmed scenario becomes the accepted schedule

- **GIVEN** кілька збережених варіантів
- **WHEN** користувач обирає один і підтверджує його активним
- **THEN** саме цей варіант позначається прийнятим у порівнянні
- **AND** його результат стає активним розкладом застосунку
