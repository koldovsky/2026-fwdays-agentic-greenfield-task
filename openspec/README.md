# OpenSpec — APS Планувальник РЦ

Spec-driven структура для розробки в Cursor.

## Структура

```
openspec/
  changes/
    scheduling-algorithm/   ← ПОТОЧНА ЗМІНА (починати звідси)
      proposal.md           — що і чому
      design.md             — типи, архітектура, алгоритм покроково
      specs/
        requirements.md     — вимоги з PRD + сценарії тестування
      tasks.md              — чеклист задач для Cursor
```

## Порядок роботи з Cursor

1. Відкрити `tasks.md` поточної зміни
2. Сказати Cursor:
   > "Read all files in openspec/changes/scheduling-algorithm/ 
   > and implement tasks.md one by one, starting from 1.1.
   > Run vitest after each milestone."
3. Після завершення milestone — поставити ✓ в tasks.md
4. Після завершення всіх задач — заархівувати зміну:
   `mv changes/scheduling-algorithm changes/archive/2026-06-24-scheduling-algorithm`

## Наступні зміни (черга)

| Порядок | Capability | Залежить від |
|---|---|---|
| 2 | `data-import` | — (незалежна) |
| 3 | `gantt` | scheduling-algorithm |
| 4 | `capacity-view` | scheduling-algorithm |
| 5 | `order-dashboard` | scheduling-algorithm |
| 6 | `material-check` | scheduling-algorithm, data-import |
| 7 | `scenario-compare` | scheduling-algorithm |
| 8 | `export` | всі попередні |
