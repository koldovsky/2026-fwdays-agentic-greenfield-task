# MRP — Delta Spec

Дельта-специфікація capability `mrp` (FR-MRP-01..05).

## ADDED Requirements

### Requirement: Gross Material Requirements

Система SHALL розраховувати брутто-потребу в куплених матеріалах як суму
`effectiveQty` вузлів типу `material` за номенклатурою, зберігаючи перелік
замовлень-споживачів (FR-MRP-01).

#### Scenario: Gross need aggregates material demand across the tree

- **GIVEN** розгорнутий BOM із матеріалом M, що споживається замовленням
- **WHEN** застосовується `calcGrossRequirements`
- **THEN** повертається M із `grossNeed > 0` і переліком `orderIds`

### Requirement: Net Deficit Calculation

Система SHALL обчислювати нетто-дефіцит як `брутто − залишки − підтверджені
надходження до дати споживання`; враховуються лише підтверджені надходження з
датою не пізніше дати старту операції-споживача (FR-MRP-02).

#### Scenario: Confirmed receipts before the demand date reduce the deficit

- **GIVEN** матеріал із брутто 10, залишком 2 і підтвердженим надходженням 4 до
  дати споживання
- **WHEN** обчислюється нетто-дефіцит
- **THEN** нетто-дефіцит дорівнює 4

### Requirement: Deficit Table with Critical Flag and Blocked Orders

Система SHALL для кожного матеріалу з додатним нетто-дефіцитом повертати запис із
брутто, залишком, надходженнями, нетто-дефіцитом і найранішою датою покриття;
дефіцит, який жодне надходження не покриває, SHALL позначатися критичним
(`earliestCoverDate === null`, FR-MRP-04), а кожен запис SHALL містити перелік
заблокованих замовлень (FR-MRP-03, FR-MRP-05).

#### Scenario: Material with no receipts is a critical deficit blocking its orders

- **GIVEN** матеріал M із залишком 0 і без надходжень, що споживається замовленням O1
- **WHEN** застосовується `buildMaterialDeficits`
- **THEN** повертається запис M із `netDeficit > 0` і `earliestCoverDate = null`
- **AND** `blockedOrderIds` містить O1
