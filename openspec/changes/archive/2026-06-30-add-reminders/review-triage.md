# Review triage — add-reminders (slice 7)

Orchestrator adjudication of the `review-gate` run (10 confirmed, 3 contested, 2
rejected). **Result: 0 unresolved defects.**

| Finding | Sev | Disposition |
|---|---|---|
| Water-now failure silently swallowed | correctness/major | FIXED — inline `role="alert"` error; done-swap gated on ok; test added |
| intervalDays unbounded → NaN due-dates corrupt status/sort | correctness/major | FIXED — INTERVAL_MAX=3650 reject + input max; tests; also bounds urgencyKey precision |
| Unbounded intervalDays (security dup) | security/minor | FIXED by the above |
| Authz/IDOR/tenant N/A · auth N/A · injection clean · secrets clean · mass-assignment clean | security/minor ×5 | NON-DEFECT — no auth/injection surface by design |
| Dependency audit (postcss via Next) | security/minor | ACCEPTED — documented (transitive, not exploitable) |
| Tasks 1.7/1.8 name a nonexistent test file | spec/minor | FIXED — point to `tests/integration/reminders.test.ts` |
| (contested) urgencyKey float weights vanish at large gaps | correctness/minor | FIXED — interval bound keeps gaps small → weights precise |
| (contested) Due-line static, not per-plant gap copy | spec/minor | FIXED — `dueGapDays`; "Прострочено на N дн." / сьогодні / завтра |
| (contested) Summary plural 'рослин' hardcoded | spec/minor | FIXED — `lib/i18n/plural.ts` (mod-100/mod-10), tested |
| 2 rejected | — | Refuted on verification |

## Smoke (6.7)
Prod server + 3 seeded plants (overdue, never-watered, healthy); `/` → 200 showing
the "Сьогодні полити" summary, the "Потребують поливу" section with "Полити зараз"
buttons + "Прострочено на N дн." gaps, and status pills (Потребує поливу /
Полив за графіком). Rendered home legibility/contrast → Phase 6 vision-verify.
