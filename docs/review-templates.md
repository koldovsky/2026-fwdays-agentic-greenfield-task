# Review Templates — Sport & Nutrition Bot

*Version 1.1 · Last updated: 2026-06-28*
*Related: [prd.md](./prd.md) (US-9 reviews) · [requirements.md](./requirements.md) §8.6 (review flow)*

These are the output specs for the daily / weekly / monthly reviews. Numbers are computed in
code from the DB; the model writes **only** the prose lines (drivers, verdict, focus).

**Detail level:** Medium (numbers + drivers + short verdict)
**Language:** adaptive — matches the dominant language of the period's messages
(RU / UA / EN). Structural labels & DB fields stay English; only prose adapts.
**Totals:** always from the SUM of `food_log` rows for the period — never hand-summed.
**Trends:** compared like-with-like vs the most recent prior entry, not vs the start.

---

## 1. Daily Review

Trigger: "готово на сегодня" / `/done`, or midnight auto-fallback.
Pulls: `food_log WHERE date = D`; targets from `users`; weight from latest `body_metrics`.

```
Ревью дня — DD.MM.YYYY

Калории:   {kcal_actual} / {kcal_target}   ({+/-diff})
Белок:     {p_actual} / {p_target} г       ({+/-diff})  {flag}
Жир:       {f_actual} / {f_target} г       ({+/-diff})  {flag}
Углеводы:  {c_actual} / {c_target} г       ({+/-diff})

Приёмы: {meal_list} ({entry_count} записей{, N оценки if any})
Драйверы: {what pushed fat up / protein down, if notable — else "—"}
Вердикт: {1–2 honest lines: on track / fix tomorrow / what to adjust}
```

- `{flag}`: ⚠️ недобор if protein under target band; ⚠️ перебор if fat over band; else blank.
- Drivers line names concrete culprits when a macro is off (e.g. fatty restaurant protein,
  protein bar as snack, high-fat dairy) — only when it adds signal, else "—".
- Verdict is honest, not cheerleading; flags extreme deficits as a problem, not a win.

---

## 2. Weekly Review

Trigger: after a daily review is generated and that date is a **Sunday**.
Pulls: the 7 daily reviews (or the raw rows) for the week; weight delta vs prior week.

```
Ревью недели — DD.MM – DD.MM.YYYY

Среднее в день:
  Калории:  {avg_kcal} / {target}   ({+/-})
  Белок:    {avg_p} г / {target}    ({+/-})
  Жир:      {avg_f} г / {target}    ({+/-})
  Углеводы: {avg_c} г / {target}    ({+/-})

Белок в цель:  {days_hit_protein} / 7 дней
Жир в норме:   {days_fat_ok} / 7 дней
Вес: {week_start_w} → {week_end_w} кг  ({+/-delta} vs прошлой недели)

Что работало: {1–2 lines}
Что тянуло назад: {1–2 lines — recurring drivers}
Фокус на следующую неделю: {1–2 concrete adjustments}
```

- Weight delta compares this week's weight to last week's (like-with-like).
- If a day's review is missing (not logged), note it: "{N}/7 дней залогировано".

---

## 3. Monthly Review

Trigger: after a daily review is generated and that date is the **last day of the month**.
Pulls: the month's weekly reviews; weight/waist deltas vs month start.

```
Ревью месяца — Month YYYY

Тренд (среднее в день по неделям):
  Неделя 1: {kcal} ккал · Б {p} · Ж {f} · У {c}
  Неделя 2: ...
  Неделя 3: ...
  Неделя 4: ...

Калории (ср. за месяц): {avg} / {target}   ({+/-})
Белок в цель:  {weeks_hit} / {weeks} недель в среднем
Композиция:
  Вес:   {month_start_w} → {month_end_w} кг   ({+/-delta})
  Талия: {month_start_waist} → {month_end_waist} см  ({+/-delta})

Что сработало за месяц: {2–3 lines}
Что осталось проблемой: {2–3 lines — persistent drivers}
План на следующий месяц: {2–3 concrete adjustments}
```

- Waist is the key cutting marker (target ~85–86 cm); always include if measured.
- Honest verdict on direction: is the cut progressing at a healthy rate, stalled, too aggressive?

---

## Rendering notes (for the LLM prompt)
- Fill structure deterministically from query results; the model writes only the prose
  lines (drivers, verdict, focus) — never the numbers.
- Numbers come from code (the SUM / averages / deltas), not the model, to prevent drift.
- Match the period's dominant language for all prose and section headers.
- Tone: direct, honest over flattering; flag extreme deficits as unhealthy, not as success.

## Edge cases
- **No prior data for a delta** (first day/week/month, or first-ever Body Metric): show the
  value with no delta — render `—` instead of `(+/-)`, don't fabricate a baseline.
- **Missing Body Metric** (no weight/waist logged this period): omit that line or mark
  `нет данных`; never carry forward or invent a value.
- **Partial period** (days not logged): state coverage, e.g. `5/7 дней залогировано`, and
  base averages only on logged days.
- **Empty period** (nothing logged at all): skip the macro block; output a short note nudging
  the user to log, not a table of zeros.