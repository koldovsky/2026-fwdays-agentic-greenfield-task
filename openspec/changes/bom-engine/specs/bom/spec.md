# BOM — Delta Spec

Дельта-специфікація capability `bom` (FR-BOM-01..05).

## ADDED Requirements

### Requirement: Recursive BOM Expansion

Система SHALL рекурсивно розгортати BOM кожного замовлення у плоский список
вузлів, множачи кількість на кожному рівні
(`effectiveQty(child) = effectiveQty(parent) × qtyPer`, FR-BOM-01). Кожен
розгорнутий вузол SHALL мати стабільний ідентифікатор, тому одна номенклатура
під різними батьками — це окремі вузли.

#### Scenario: Simple BOM multiplies quantities down the tree

- **GIVEN** замовлення на 1 шт A з BOM `A → [B, C]`, `B → [D]`, `C → [D]`
- **WHEN** застосовується `expandBom`
- **THEN** кожен вузол отримує `effectiveQty` = добуток `qtyPer` по шляху до кореня
- **AND** сумарна `effectiveQty` для D дорівнює сумі внесків із B і C

### Requirement: Shared Node Consolidation

Система SHALL виявляти номенклатуру, що зустрічається у більш ніж одному
замовленні, і консолідувати потребу в один блок із сумарною кількістю та
переліком замовлень-споживачів (FR-BOM-03).

#### Scenario: Detail shared across two orders is consolidated

- **GIVEN** два замовлення, обидва містять деталь D (10 шт від O1, 15 шт від O2)
- **WHEN** застосовується `findSharedNodes`
- **THEN** повертається D із `totalQty = 25` і `orderIds = [O1, O2]`

### Requirement: Topological Ordering Leaves-First

Система SHALL впорядковувати вузли BOM топологічно (листя перші, корінь
останній), щоб батьківський вузол ніколи не передував жодному з дочірніх
(Finish-to-Start по дереву, FR-BOM-05). Незалежні підзбірки не мають взаємного
порядку і можуть плануватися паралельно (FR-BOM-04).

#### Scenario: Parent comes after all its children

- **GIVEN** розгорнутий BOM `A → [B, C]`, `B → [D]`, `C → [D]`
- **WHEN** застосовується `topologicalSort`
- **THEN** усі входження D передують B і C, а A стоїть останнім
