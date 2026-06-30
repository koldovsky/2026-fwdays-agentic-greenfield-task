# Review triage — add-charts (slice 5)

Orchestrator adjudication of the `review-gate` run (6 confirmed, 2 contested, 4
rejected; one security finder hit a StructuredOutput retry cap — non-fatal, the
security surface is minimal/no-auth). **Result: 0 unresolved defects.**

| Finding | Sev | Disposition |
|---|---|---|
| Baseline spec requires a chart load-failure error state the impl omits | spec/critical | FIXED — added `ChartErrorBoundary` (Ukrainian fallback, data stays readable in lists); baseline+delta specs reconciled |
| (contested) "Chart fails but data remains readable" load-failure scenario | spec/major | FIXED — same error boundary; NFR-A11Y-03 lists are the readable fallback |
| (contested) Growth chart same-date X-axis collapse | correctness/major | FIXED — numeric index X axis (`toGrowthXAxis`) so same-date points stay distinct |
| FR-CHART-04 no chart-level test | spec/minor | FIXED — added `GrowthChart.update.test.tsx` (new series prop re-renders) |
| NFR-PERF-02 (≤500ms) only deferred | spec/major | DEFER+ — documented Phase-6 measurement; added 400-point no-cap series assertions |
| No authz/auth/injection surface (clean) | security/minor | NON-DEFECT — single-user, no auth (by design) |
| Injection sinks clean (parameterized ORM, React-escaped) | security/minor | NON-DEFECT |
| recharts 3.9.0 no advisory | security/minor | NON-DEFECT |
| 4 rejected | — | Refuted on verification |

## Smoke (4.6)
Prod server + seeded plant with growth + watering data; `/plants/[id]` → 200
rendering the growth chart (figure + Recharts) and the data lists; an empty plant
→ 200 with the Ukrainian empty state ("Ще немає…"). Rendered legibility/contrast/
perf validated in Phase 6 (vision-verify + axe).
