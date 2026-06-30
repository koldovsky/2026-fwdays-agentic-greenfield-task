# Review triage — add-design-system (slice 6)

Orchestrator adjudication of the `review-gate` run (8 confirmed, 4 contested, 2
rejected). **Result: 0 unresolved defects.**

| Finding | Sev | Disposition |
|---|---|---|
| Ghost delete-trigger renders muted stone not danger-red (Tailwind source-order) | correctness/minor | FIXED — `danger-ghost` Button variant (text-danger baked in); 3 delete buttons switched + test |
| PlantCard status-line hardcoded to 'healthy' (latent vs slice 7) | correctness/minor | FIXED — STATUS_LINE map keyed by status |
| Dead i18n key `appTitle` after rename | correctness/minor | FIXED — removed |
| Task 1.7 claims a PlantCard test that didn't exist | spec/major | FIXED — added `PlantCard.test.tsx` |
| FR-DS-06 chart palette no automated coverage | spec/minor | FIXED — `chart-palette.test.tsx` asserts forest/clay strokes (+ Phase-6 vision note) |
| Auth/sessions clean · Injection clean · Secrets clean | security/minor ×3 | NON-DEFECT — no auth/injection/secrets surface |
| Docs 4.6/4.7/4.8 unchecked | spec/minor | DONE — render-smoke green, archived now |
| (contested) deps unchanged · abuse N/A | security/minor ×2 | NON-DEFECT |
| (contested) FR-DS-03 action is placeholder span not Button | spec/minor | ACCEPTED — whole card is a Link; real interactive "water now" lands in slice 7 (documented) |
| (contested) FR-DS-06 restyle scenarios no automated coverage | spec/minor | Rendered → Phase 6 vision-verify + axe (documented) |
| 2 rejected | — | Refuted on verification |

## Smoke (4.7)
Prod server; `/` → 200 with the «Поливайко» wordmark, paper/forest tokens applied,
and NO theme toggle (FR-SHELL-02a). Rendered legibility/contrast/360px + Cyrillic
font fallback (Quicksand/mono lack Cyrillic → Mulish) → Phase 6 vision-verify + axe.
