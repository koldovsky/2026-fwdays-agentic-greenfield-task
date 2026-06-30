# Review triage — add-app-shell (slice 1)

Orchestrator adjudication of the final `review-gate` run (14 confirmed, 3
contested, 3 rejected). The gate surfaces facts; the orchestrator decides which
are defects. **Result: 0 unresolved defects.** Two real bugs found across review
rounds were fixed with tests; the rest are clean-dimension reports, by-design
no-auth, Phase-5/6-verified NFRs, or informational notes.

## Real defects found and FIXED (across rounds 1–3)
- **Hydration mismatch on `<html>`** (no-flash class vs SSR snapshot) → added
  `suppressHydrationWarning`; no-flash script extracted + unit-tested.
- **React 19 `<form action>` auto-reset wiped input on validation failure** —
  corrupted the frozen inline-error pattern slices 2–5 inherit → `ActionResult`
  failure arm now echoes `values`, `ExampleForm` repopulates via `defaultValue`,
  pinned by `ExampleForm.test.tsx`.
- **Global not-found used plant-specific copy** → generic copy + boundary tests.
- **`getClientTheme` could desync from DOM** → now derived solely from the DOM class.
- **Missing tests** (no-flash wiring, not-found boundaries) → added.
- **tsconfig over-broad evals exclude / spec contradiction (NFR-USA-02 phantom)**
  → narrowed exclude with `@ts-expect-error`; spec amended.

## Final-run confirmed items — disposition (all non-defects)
| # | Item | Disposition |
|---|------|-------------|
| 1 | ThemeToggle label flash on dark-persisted first load | ACCEPT — <16 ms self-healing cosmetic (minor/low conf); documented |
| 2 | Cross-tab theme storage-event sync | ACCEPT — already documented; single-user local MVP |
| 3 | Authz matrix — "no authz surface (clean)" | NON-DEFECT — security dimension reported clean |
| 4 | Auth & sessions — "N/A (clean)" | NON-DEFECT — no auth in MVP (NFR-SEC-01) |
| 5 | Secrets & config — "hygiene clean" | NON-DEFECT — clean report |
| 6 | Dependency audit — moderate transitive only | ACCEPTED advisory — documented in design.md; no non-breaking fix |
| 7 | Demo action unauthenticated / no rate-limit | BY DESIGN — no auth in MVP (NFR-SEC-01); demo has no persistence |
| 8 | NFR-USA-01 (≤2 clicks) no in-slice test | DEFER — verified by Phase 5 E2E |
| 9 | NFR-A11Y-01/02, NFR-COMPAT-01 deferred | DEFER — verified by Phase 6 axe(light+dark)+vision+recordings (tasks.md 3.x) |
| 10 | NFR-COMPAT-02 evergreen browsers no test | DEFER — Phase 6 cross-browser |
| 11 | Tasks 4.6/4.7/4.8 unchecked (smoke/handoff/archive) | IN PROGRESS — being done now at archive |
| 12 | "All ticked tasks have matching artifacts" | INFORMATIONAL — positive |
| 13 | "No-flash test + layout.test close the gap" | INFORMATIONAL — positive |
| 14 | "Cross-tab desync is accepted, not a contradiction" | INFORMATIONAL — positive |

Contested (3): map to #8/#9 (a11y/usability deferral) and the FieldError client-boundary item — all dispositioned above / accepted.

## Release follow-up
Findings #8–10 (NFR usability/a11y/compat) get real evidence in Phase 5 (E2E) and
Phase 6 (axe light+dark, vision-verify, recordings). The global `review-gate` at
Phase 7 re-runs over the whole codebase; these should clear there.
