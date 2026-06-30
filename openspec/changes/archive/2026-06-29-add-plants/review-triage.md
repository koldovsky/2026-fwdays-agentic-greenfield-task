# Review triage — add-plants (slice 2)

Orchestrator adjudication of the `review-gate` run (4 confirmed, 5 contested, 3
rejected). **Result: 0 unresolved defects** — all confirmed + actionable
contested findings were FIXED; one is an accepted transitive advisory.

| Finding | Sev | Disposition |
|---|---|---|
| Server actions trust client `id` without integer validation | security/minor | FIXED — `Number.isInteger(id) && id>0` guard added to update/delete actions |
| Transitive postcss XSS advisory via Next.js | security/minor | ACCEPTED — documented in design.md (not reachable; no non-breaking fix) |
| Task 1.6 component tests missing while 2.8/2.9 ticked "Green for 1.6" | spec/major | FIXED — added `PlantForm.test.tsx` + `DeletePlantButton.test.tsx`; ticked 1.6 |
| 4.6 smoke / 4.8 archive unchecked | spec/minor | DONE — HTTP smoke run (/ 200, missing plant 404, /plants/new 200); archived now. Also added file-backed persistence test (NFR-DATA-01) |
| (contested) Species stored untrimmed vs trimmed name | correctness/major | FIXED — species trimmed consistently |
| (contested) Edit form keeps stale values across plants | correctness/major | FIXED — `key={plant.id}` remounts the form (AGENTS uncontrolled-form rule) |
| (contested) "deleted in another tab" no concurrency test | spec/minor | FIXED — not-found action tests added |
| (contested) Coverage summary / species note | info | No action (informational) |
| 3 rejected | — | Refuted on verification |

## Bonus defect found by the manual smoke (4.6) — FIXED
The HTTP smoke caught `/` and `/plants/[id]` returning **500**: the runtime
`data/app.db` had no migrations applied (missing `plants` table). Fixed by
applying committed migrations idempotently on DB client init. Re-smoke green.
This is precisely the rendered/runtime gap unit+integration tests (fresh migrated
temp DBs) are blind to.

## Release follow-up
postcss advisory + Phase-6 a11y/E2E as tracked in `docs/current-state.md`.
