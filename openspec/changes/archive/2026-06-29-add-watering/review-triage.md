# Review triage — add-watering (slice 4)

Orchestrator adjudication of the `review-gate` run (6 confirmed, 1 contested, 1
rejected). **Result: 0 unresolved defects.**

| Finding | Sev | Disposition |
|---|---|---|
| "Reject a missing date" scenario contradicts FR-WATER-01 (defaults today) | spec/major | FIXED — spec reconciled to "missing date → defaults to today"; impl was already correct |
| Duplicate DOM ids when add+edit forms co-render (R7) | spec/minor | FIXED — namespaced field ids in watering/growth/plants forms (cross-cutting) |
| `aria-describedby` drops hint on error | spec/minor | FIXED — references hint+error across all three forms (cross-cutting) |
| Note textarea missing maxLength | correctness/minor | FIXED — `maxLength={NOTE_MAX_LEN}` added |
| `getWatering` unused in production | correctness/minor | FIXED — documented as read/test helper |
| Transitive postcss XSS advisory via Next.js | security/minor | ACCEPTED — documented (same as prior slices) |
| (contested) 4.6/4.7/4.8 open | spec/minor | DONE — render-smoke green (/plants/[id] shows note + dates desc), archived now |
| 1 rejected | — | Refuted on verification |

Cross-cutting win: the id-namespacing + aria-describedby fixes were applied to
plant, growth AND watering forms in one pass, pre-empting the Phase-6 a11y gate
and the Phase-7 global review re-flagging the same pattern.

## Smoke (4.6)
Prod server + seeded plant with 2 waterings; `/plants/[id]` → 200 rendering the
waterings section (note "Рясний полив", dates DD.MM.YYYY in SC-3 desc order).
