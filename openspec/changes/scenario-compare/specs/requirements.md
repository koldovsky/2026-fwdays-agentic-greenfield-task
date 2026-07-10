# Specs: scenario-compare

Вимоги з PRD v0.3 (capability `scenario-compare`, FR-SCEN-01..03). ID для трасування.

- **FR-SCEN-01** Система зберігає до 3 варіантів розкладу одночасно.
- **FR-SCEN-02** Таблиця порівняння: кількість запізнень, сумарне запізнення
  (днів), середня завантаженість РЦ (%), кількість перевантажених слотів, WIP
  (кількість незавершених вузлів).
- **FR-SCEN-03** Користувач обирає один варіант як «активний» і підтверджує —
  тільки після цього розклад вважається прийнятим.

## Сценарії тестування

### Сценарій A — Найкраще за кожною метрикою
```
Вхід: S1 metrics {late 0, delay 0, avgLoad 60, overloaded 0, wip 2}
      S2 metrics {late 1, delay 3, avgLoad 80, overloaded 1, wip 5}
Очікування (buildComparison):
  best.lateOrdersCount = [S1]  (менше)
  best.totalDelayDays  = [S1]
  best.avgLoadPct      = [S2]  (більше)
  best.overloadedSlotsCount = [S1]
  best.wipCount        = [S1]
```

### Сценарій B — Ліміт 3 варіанти
```
canAddScenario(0..2) = true; canAddScenario(3) = false; MAX_SCENARIOS = 3
```

### Сценарій C — Активний сценарій
```
buildComparison([S1, S2], 'S2'):
  рядок S2 isAccepted = true, S1 isAccepted = false
```
