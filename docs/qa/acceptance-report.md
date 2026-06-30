# Acceptance report — «Гривня» (Stage 11, CHECKLIST G6)

> Formal summary of what was delivered, against every quality gate in
> [CHECKLIST.md](../../CHECKLIST.md), as of this report's date. Written by
> the maker; the global two-checker review (Stage 10) that underpins this
> sign-off was independent (see `docs/qa/review-findings.md` and
> `docs/qa/eval-report.md`, both "## Global Review — 2026-07-01" sections).

## Report date

`2026-07-01` (Europe/Kyiv)

## What was delivered

«Гривня» — a calm, Ukrainian-first web reader for the National Bank of
Ukraine's official daily exchange rates. Zero accounts, zero database, zero
cookies, zero analytics, zero paid API keys (`BC-PRIVACY-01`, `NFR-COST-01`).

**All 25 MVP functional requirements, plus the 1 Future-phase requirement
(`FR-SAYINGS-01`, promoted and built), are implemented, tested, and verified
— both automatically and live in a real browser.** Full requirement-by-
requirement evidence: [traceability-matrix.md](traceability-matrix.md).

Eight capability slices, built one at a time through a hand-authored
tests-first → two-checker-review loop (`ADR-0003`):
`app-shell`, `i18n`, `currency-list`, `currency-picker`, `converter`,
`rate-history`, `trend-hint`, `footer-sayings`. Plus a cross-cutting
hardening pass (integration test, Playwright e2e, axe accessibility) and a
two-round review process (per-slice, then whole-app).

## Gate-by-gate status (CHECKLIST.md)

| Gate | Status | Evidence |
|---|---|---|
| G0 — Scaffold & loop | ✅ Complete | Hooks, CI, agent/command definitions all in place and exercised throughout |
| G1 — Product framing | ✅ Complete | `docs/product-brief.md`, `docs/requirements.md`; Checkpoint 1 signed off |
| G2 — Baseline specs | ✅ Complete | 8 specs, `openspec validate --all --strict` green |
| G3 — Capability plan | ✅ Complete | `docs/mvp-capability-plan.md`; Checkpoint 2 signed off |
| G4 — Per slice (×8) | ✅ Complete | Every item satisfied for all 8 slices — tests-first, two-checker review clean, archived, committed with `Slice:`/`Refs:` trailers |
| G5 — Cross-cutting hardening | ✅ Complete | `lib/currency/convertFlow.integration.test.ts`; `e2e/{core-flow,responsive,a11y}.spec.ts`; `docs/qa/automated-verification-latest.md` |
| G6 — QA proof pack | ✅ Complete (this stage) | This report + traceability matrix + manual test plan + demo script + risk register; eval report reviewed (below) |
| G7 — Global review & release | 🟡 Partial | Global two-checker review: ✅ clean, findings fixed. `npm run verify` + CI: ✅ green. `docs/technical/*` + README + PR: not yet — Stage 12 |

## Test results (current, re-run for this report)

| Layer | Result |
|---|---|
| `npm run lint` | Clean |
| `npm run check:trace` | 25/25 MVP FRs cited (1 Future FR not required) |
| `npm run spec:validate` | 8/8 specs valid (`--strict`) |
| `npm run build` | Green |
| `npm run test:run` (Vitest) | **122/122 passed**, 18 files |
| `npm run test:e2e` (Playwright + axe) | **14/14 passed** — core flow, responsive breakpoints, WCAG 2 A+AA (light + dark) |

## Eval report review (CHECKLIST G6, item 2)

**Reviewed `docs/qa/eval-report.md` in full — every case passes its rubric.
No FAIL verdict exists anywhere in the file.**

| Scope | Score | Verdict |
|---|---:|---|
| `app-shell` | 96/100 | PASS |
| `i18n` | 98/100 | PASS |
| `currency-list` | 95/100 | PASS |
| `converter` | 95/100 | PASS |
| `currency-picker` | 97/100 | PASS |
| `rate-history` | 94/100 | PASS |
| `trend-hint` | 98/100 | PASS |
| `footer-sayings` | 95/100 | PASS |
| Global (whole-app) | 91/100 | PASS |

Lowest individual *dimension* score across all 9 passes: 80/100 (global
pass, "number-formatting consistency") — this is the exact finding that
drove the Stage 10 `formatRate.ts` fix; re-grading it post-fix was out of
scope for this report (the fix is in `lib/currency/formatRate.test.ts`'s own
5 passing assertions, not a re-run of the qualitative judge), but the
underlying defect it scored is now resolved per the risk register.

No automatic-fail condition (exclamation mark, fake "today", `NaN`/raw
error, toast-as-error) was found in any of the 9 passes.

## Outstanding (not blocking this gate, scoped to later stages)

See [risk-register.md](risk-register.md) for the full list. Nothing open is
High severity. Two items are explicitly deferred to named future stages:

- **Vision check of the rendered UI** — axe catches WCAG-detectable issues
  only, not layout/visual defects. Scoped to Stage 13.
- **`docs/technical/*`, README usage section, PR** — scoped to Stage 12.

## Sign-off

By the evidence above — all 25 MVP FRs + 1 Future FR implemented and
traced, two independent checker passes clean (per-slice ×8 and global ×1),
9/9 eval passes, 122/122 unit + 14/14 e2e green, no High-severity open
risk — **this project is accepted as ready to proceed to Stage 12 (PR
preparation).**

This sign-off is the maker's own assessment, structured to be checked
against the underlying evidence (every claim above links to a file), not
asserted as authoritative on its own — exactly the same standard this
project has held every other claim to throughout.
