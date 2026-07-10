# MVP Capability Plan — APS Планувальник РЦ

| # | Слайс | FR покриває | Залежить від |
|---|---|---|---|
| 1 | `data-import` | FR-IMP-01..11 | — |
| 2 | `resource-centers` | FR-RC-01..04 | data-import |
| 3 | `bom-engine` | FR-BOM-01..05, FR-MRP-01..05 | data-import |
| 4 | `scheduling-algorithm` | FR-SCHED-01..13 | bom-engine, resource-centers |
| 5 | `gantt` | FR-GANTT-01..09 | scheduling-algorithm |
| 6 | `capacity-view` | FR-CAP-01..05 | scheduling-algorithm |
| 7 | `order-dashboard` | FR-ORD-01..05 | scheduling-algorithm |
| 8 | `material-check` | FR-MAT-01..03 | bom-engine, data-import |
| 9 | `scenario-compare` | FR-SCEN-01..03 | scheduling-algorithm |
| 10 | `export` | FR-EXP-01..05 | всі попередні |

## Граф залежностей
data-import → resource-centers → scheduling-algorithm → gantt
data-import → bom-engine      → scheduling-algorithm → capacity-view
                                                     → order-dashboard
                                                     → scenario-compare
bom-engine + data-import → material-check
всі → export

## Disjoint-модулі (можна паралельно)
- data-import і DESIGN.md — незалежні
- gantt, capacity-view, order-dashboard — після scheduling-algorithm