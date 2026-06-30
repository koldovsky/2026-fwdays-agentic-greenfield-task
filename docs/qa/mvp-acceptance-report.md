# MVP Acceptance Report — «Поливайко»

> Acceptance summary for the single-user local plant watering-reminder +
> growth/watering tracker with charts. Ready for customer sign-off.
> Date: **2026-06-30** (Europe/Kiev). Phase 6 (QA proof) complete.

## 1. Executive summary

«Поливайко» is **feature-complete for MVP**. All **7 capability changes** are
implemented, reviewed, and archived. The full automated battery is green
(**433 unit/component tests** across 42 files + **5 real-SQLite integration
suites** + **11 Playwright e2e**), coverage holds at the ratchet (lines 77.23%),
the graded eval bar is **11/11 pass** (error-clarity **89** / usability-clarity
**94**), all **6 demo clips** are asserted and **6/6** pass eyes-on-pixels vision
review, and axe reports **0 serious/critical** accessibility violations in the
paper theme. No open defects block acceptance; honest limitations are listed in
§6 and [`risk-register.md`](./risk-register.md).

## 2. Scope delivered — 7 capability changes (all archived)

| # | Change | FRs owned | Status |
|---|---|---|---|
| 1 | `add-app-shell` | FR-SHELL-01/02/03 | Archived (clean review) |
| 2 | `add-plants` | FR-PLANT-01..08 | Archived (clean review) |
| 3 | `add-growth` | FR-GROWTH-01..05 | Archived (clean review) |
| 4 | `add-watering` | FR-WATER-01..05 | Archived (clean review) |
| 5 | `add-charts` | FR-CHART-01..04 | Archived (clean review) |
| 6 | `add-design-system` | FR-DS-01..06, FR-SHELL-02a (supersedes FR-SHELL-02) | Archived (clean review) |
| 7 | `add-reminders` | FR-REM-01..07 | Archived (clean review) |

Trajectory audit of all 7 slices: **PASS** (`trajectory-report.md`), 3 in-scope
overlap warnings (shared i18n/theme/plants — reviewed, expected; risk R-10).

## 3. Gate status (G0–G6) with evidence

> Deterministic checks from `npm run gate:status`; judgment gates confirmed in
> this pack. The aggregator labels gates G0–G8; G7 (release) and G8 (UAT) belong
> to Phase 7 and already read PASS on the deterministic checks they reuse.

| Gate | Meaning | Verdict | Evidence |
|---|---|---|---|
| **G0** | Scaffold + Project Factory loop installed | **PASS** | `scripts/check-*`, `.githooks`, CI, ADR-0002; `gate:status` G0 PASS |
| **G1** | Requirements signed off | **PASS** (Checkpoint 1, 2026-06-29) | `docs/requirements.md` sign-off; `gate:status` = needs sign-off (judgment) → signed in Checkpoint 1 |
| **G2** | Baseline specs (one owner per FR) | **PASS** | `openspec/specs/*`; `openspec validate --all --strict` 7/7; traceability PASS |
| **G3** | Capability plan signed off | **PASS** (Checkpoint 2 + 2026-06-30 scope change) | `docs/mvp-capability-plan.md`; sign-off recorded |
| **G4** | Per-slice quality (trace + trajectory) | **PASS** | `traceability-report.md` PASS (0 failures); `trajectory-report.md` PASS |
| **G5** | Hardening (coverage ratchet) | **PASS** | `npm run check:coverage` PASS vs `quality/coverage-baseline.json` (lines 77.23 / stmts 78.16 / funcs 92.94 / branches 86.28) |
| **G6** | QA proof (recordings + evals) | **PASS** | recordings 6/6 asserted (`recordings-report.md`) + vision 6/6 (`vision-report.md`); evals 11/11 (`eval-report.md`); axe 0 serious/critical (`check:a11y`) |

## 4. Test & evidence totals (read, not invented)

- **Unit/component:** 433 passing tests, 42 files (`npm run test:run`, verified
  2026-06-30 11:00 Kiev — `Tests 433 passed (433)`).
- **Integration (real SQLite):** 5 suites — plants-lifecycle, plants-persistence,
  growth-lifecycle, watering-lifecycle, reminders.
- **E2E (Playwright, chromium):** 11 tests across plants / tracking / reminders /
  responsive `.e2e.ts`.
- **Coverage:** lines **77.23%**, statements 78.16%, functions 92.94%, branches
  86.28% — ratchet PASS.
- **Eval:** 11 cases, **11 pass / 0 fail**; per-dimension error-clarity **89**,
  usability-clarity **94**; pass mark 70/case, critical-miss = fail (none).
- **Recordings:** 6 clips, all real artifacts (≥10 000 B video + shot + asserted);
  `check:recordings` PASS.
- **Vision:** 6/6 met + legible (`vision-report.md`).
- **Accessibility:** `check:a11y` (axe WCAG 2 A/AA incl. color-contrast) — 0
  serious/critical in the paper theme (NFR-A11Y-01/02/04).

## 5. FR coverage

All **38 MVP FRs** are owned by exactly one spec/slice and traced to tests
(`traceability-report.md` lists all 38 with `Spec=yes, Plan=yes` and ≥1 test
trace each). MVP NFRs: all `local-verifiable` NFRs are evidenced (see the matrix);
`deploy-gated` NFRs are Future. Full per-FR rows:
[`requirements-traceability-matrix.md`](./requirements-traceability-matrix.md).

- FR-SHELL-02 (light/dark toggle) was **superseded** by FR-SHELL-02a (single paper
  theme) in the 2026-06-30 scope change — not a gap, an amendment.

## 6. Open items / honest limitations

- **R-04** Cross-browser verified on Chromium only; manual Firefox/Safari/Edge
  spot-check is a Phase 7 release action.
- **R-05** Perf budgets (NFR-PERF-01/02) observed locally, not gated by a CI timer.
- **R-06** Some demo stills predate the AA contrast token darkening (legibility-
  only); the *shipped* theme passes axe contrast.
- **R-08** A few eval messages use `inlineMessageFor*` keys instead of the spec'd
  `fieldErrors.*` shape — cosmetic payload nit, cases still pass.
- Deploy-gated NFRs (PERF-03, COMPAT-03, SEC-02, LOC-02) and all FR-*-Future items
  are **out of MVP scope** (ADR-0001, TC-06).

Full register: [`risk-register.md`](./risk-register.md). None of the above blocks
MVP acceptance.

## 7. What's deferred to Future

Photos, search/filter, extra growth metrics, water amount, OS notifications, chart
granularity/insights, export/import, multi-user/auth, English UI, cloud deploy —
all explicitly Future per `docs/requirements.md` / TC-06 / ADR-0001.

## 8. Sign-off

| Role | Name | Decision | Date |
|---|---|---|---|
| Owner / customer | _________________ | ☐ Accept ☐ Accept w/ conditions ☐ Reject | __________ |
| Delivery (orchestrator) | (Project Factory loop) | Submitted for acceptance | 2026-06-30 |
