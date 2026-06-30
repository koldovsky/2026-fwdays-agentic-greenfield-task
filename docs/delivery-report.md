# Delivery report — «Поливайко»

> Stakeholder-facing delivery summary. Date: **2026-06-30** (Europe/Kiev).
> Single-user local app, no deploy ([ADR-0001](./adr/ADR-0001-stack.md)).
> Formal acceptance + sign-off block: [`qa/mvp-acceptance-report.md`](./qa/mvp-acceptance-report.md).

## 1. Executive summary

**«Поливайко» is feature-complete for MVP and quality-proven.** It is a small,
single-user web app that reminds the Owner when each succulent (money tree) needs
watering and tracks each plant's growth and watering history with charts — the
headline "show a watering chart" feature the customer asked for, plus the
watering-reminder home the «Поливайко» design called for. All **7 capability
changes** are implemented, reviewed, and archived. The full automated battery is
green, the graded-quality eval bar is **11/11 pass**, all **6 demo clips pass
eyes-on-pixels review**, accessibility reports **0 serious/critical** issues, and
the Phase 7 global security review is clean. No open defect blocks acceptance.

## 2. What was built

A reminder-centric home + a per-plant tracker:

- **Watering reminders** — each plant has an editable watering interval; the home
  shows a "Сьогодні полити" count, an urgency-ordered list of plants needing
  water with a one-tap "water now", and an "Усі политі! 🌱" all-done state. Status
  (healthy / soon / overdue) is derived from the last watering + interval vs today
  (Europe/Kiev) and shown as a pill on every card and the detail view.
- **Plant CRUD** — add / list / view / edit / delete (delete cascades the plant's
  own data, confirmed); species defaults to money tree (*Crassula ovata*).
- **Growth & watering logging** — height-in-cm measurements and dated watering
  events (with optional note) on the plant detail page, each with list, edit, and
  confirmed delete.
- **Charts** — a watering-frequency chart (the headline) and a growth chart per
  plant, with clear empty states; the underlying values stay readable as lists.
- **«Поливайко» design system** — warm paper theme, forest-green primary, earthy
  accents, botanical line icons, the water-drop brand wordmark; single light
  theme (the light/dark toggle was dropped by design sign-off).

Full per-capability flows: [`technical/workflows.md`](./technical/workflows.md).

## 3. How quality was proven (gate evidence)

> All figures read from the committed reports / baselines (verified 2026-06-30,
> Europe/Kiev) — not estimated.

| Evidence | Result | Source |
|---|---|---|
| Unit / component tests | **433 passing**, 42 files | `npm run test:run` |
| Integration (real SQLite) | **5 suites** (plants ×2, growth, watering, reminders) | [`tests/integration/`](../tests/integration/) |
| E2E (Playwright, chromium) | **11 tests** (plants/tracking/reminders/responsive) | [`tests/e2e/`](../tests/e2e/) |
| Coverage (ratchet) | lines **77.23%** / stmts 78.16 / funcs 92.94 / branches 86.28 | [`quality/coverage-baseline.json`](../quality/coverage-baseline.json) |
| Eval (graded quality BAR) | **11/11 pass**; error-clarity **89**, usability-clarity **94** | [`qa/eval-report.md`](./qa/eval-report.md) |
| Demo recordings | **6/6** asserted real artifacts | [`qa/recordings-report.md`](./qa/recordings-report.md) |
| Vision (eyes-on-pixels) | **6/6 met + legible** | [`qa/vision-report.md`](./qa/vision-report.md) |
| Trajectory (process integrity) | **28/28 pass**, ~93 all dimensions | [`qa/trajectory-eval-report.md`](./qa/trajectory-eval-report.md) |
| Accessibility (axe, paper theme) | **0 serious/critical** | `npm run check:a11y` |
| Traceability | **PASS**, 0 failures (all 38 MVP FRs owned + traced) | [`qa/traceability-report.md`](./qa/traceability-report.md) |
| Global security review (Phase 7) | **clean** — no security code changes required | [`qa/security-review-notes.md`](./qa/security-review-notes.md) |

The eval **decides** quality (per-dimension scores + per-case verdicts); the
recordings *illustrate* a case for human review. Each recording's manifest entry
lists the FR ids it proves.

## 4. Scope delivered vs Future

**Delivered (MVP):** all 38 MVP functional requirements across 7 archived slices
— app-shell, plants, growth, watering, charts, design-system, reminders. FR
coverage is one-owner-per-id with ≥1 test trace each
([`qa/requirements-traceability-matrix.md`](./qa/requirements-traceability-matrix.md)).
Note FR-SHELL-02 (light/dark toggle) was **superseded** by FR-SHELL-02a (single
paper theme) in the 2026-06-30 design sign-off — an amendment, not a gap.

**Future (explicitly out of MVP per [`requirements.md`](./requirements.md) /
TC-06 / ADR-0001):** plant photos, search/filter, extra growth metrics, water
amount per event, OS push notifications, chart granularity / insights,
export/import, multi-user / auth, English UI, and cloud deploy.

## 5. Known limitations (honest)

None block acceptance. Full register: [`qa/risk-register.md`](./qa/risk-register.md).

- **Cross-browser (R-04, NFR-COMPAT-02):** verified on **chromium only**; a manual
  Firefox / Safari / Edge spot-check is the one open release action.
- **Perf budgets (R-05):** NFR-PERF-01/02 observed locally, not gated by a CI
  timer (the data-side no-cap behavior is unit-asserted).
- **A few demo stills (R-06):** predate the AA-contrast token darkening
  (legibility-only); the *shipped* theme passes axe contrast.
- **Eval payload keys (R-08):** a few messages use `inlineMessageFor*` instead of
  the spec'd `fieldErrors.*` shape — cosmetic; cases still pass.
- **Cyrillic display font:** Quicksand/Spline Sans Mono are Latin-only, so
  Cyrillic headings render in Mulish via the font fallback (by design).
- **Dependency advisories:** `npm audit` = 6 moderate, 0 high/critical, all
  build-chain / dev-only (postcss, esbuild-kit); none on the runtime path. Track
  postcss via the normal Next patch bump.

## 6. Ops actions required

- **No deploy** (ADR-0001) — the Owner runs it locally (`npm run dev`); see
  [`technical/operations.md`](./technical/operations.md).
- **Open release action:** manual cross-browser spot-check (R-04).
- **Before any future deploy / multi-user:** re-run the full security checklist —
  add per-record owner scoping to the read queries, session handling, rate
  limiting (security-review re-check trigger).

## 7. Process improvements observed

- The frozen `ActionResult` inline-error contract (set in slice 1) let every later
  slice surface validation inline with no re-litigation — worth setting first.
- Auto-migrate-on-init (added as a slice-2 fix) removed a class of "fresh DB 500s"
  for the rest of the build.
- The two foundation slices (app-shell, plants) needed ≥2 review-fix rounds; later
  slices needed one — front-loading the shared seams paid off.

## 8. Effort summary

**43 commits**: 1 starter (2026-06-25) + 42 delivery across **2026-06-29 (22)**
and **2026-06-30 (20)** — roughly 6–7 active hours over 2 days, no reverts, all 7
slices archived with clean review evidence. Breakdown:
[`estimation.md`](./estimation.md).

## 9. Sign-off

Acceptance is submitted on the signature block in
[`qa/mvp-acceptance-report.md`](./qa/mvp-acceptance-report.md) (Owner: ☐ Accept /
☐ Accept w/ conditions / ☐ Reject).
