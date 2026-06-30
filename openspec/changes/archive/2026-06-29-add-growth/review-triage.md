# Review triage — add-growth (slice 3)

Orchestrator adjudication of the `review-gate` run (13 confirmed, 0 contested, 3
rejected). **Result: 0 unresolved defects.**

| Finding | Sev | Disposition |
|---|---|---|
| Stale row on delete not-found | correctness/minor | FIXED — `router.refresh()` in the not-found branch |
| `getMeasurement` "dead in production" | correctness/minor | FIXED — documented as a read/test helper (used by integration + action tests) |
| Unused i18n key `growth.editTitle` | correctness/minor | FIXED — removed |
| Task 1.7 component tests didn't exist | spec/major | FIXED — added MeasurementForm + DeleteMeasurementButton + MeasurementsSection tests |
| design SC-6 jsdom a11y "covered by component tests" | spec/major | FIXED — now true (same tests as above) |
| "Cancel deletion" scenario uncovered | spec/major | FIXED — DeleteMeasurementButton test covers cancel-without-invoke |
| NFR-PERF-01 (<300ms) no enforcement | spec/minor | DEFER — Phase 6 perf budget (documented) |
| Authz N/A (clean) | security/minor | NON-DEFECT — no auth surface by design |
| Parameterized queries (clean) | security/minor | NON-DEFECT — Drizzle parameterized |
| No mass-assignment (clean) | security/minor | NON-DEFECT — whitelisted field mapping |
| Secrets hygiene (clean) | security/minor | NON-DEFECT |
| Coverage summary | info | No action |
| 4.6 smoke / 4.8 archive unchecked | spec/minor | DONE — render-smoke green (/plants/[id] shows 12,5 см / 20.06.2026), archived now |
| 3 rejected (incl. "REAL float height") | — | Refuted on verification |

## Smoke (4.6)
Built + ran prod server; inserted a plant + 2 measurements; `/plants/[id]` → 200
rendering the measurements section (heights in cm, dates DD.MM.YYYY, SC-3 order).
No 500. `/` → 200.
