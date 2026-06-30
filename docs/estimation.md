# Effort log — «Поливайко»

> Derived from git history (`git log`, Europe/Kiev), not estimated after the
> fact. **43 commits**: 1 starter (2026-06-25) + 42 delivery commits across two
> working days — **2026-06-29 (22)** and **2026-06-30 (20)**. Each delivery slice
> follows feat → review-fix(es) → archive.

## Sessions (from commit clustering)

| Session | When (Kiev) | Span | Commits | Work |
|---|---|---|---|---|
| Starter | 2026-06-25 17:03 | — | 1 | Homework starter (task, CodeRabbit evidence review, PR template) |
| S1 — Setup + framing | 06-29 13:53–14:12 | ~20 min | 4 | Scaffold + loop install (G0), requirements + brief sign-off (G1), baseline specs (G2), capability plan (G3) |
| S2 — MVP build (5 slices) | 06-29 14:33–19:35 | ~5 h | 18 | app-shell, plants, growth, watering, charts — each feat + review-fix + archive; MVP feature-complete handoff |
| S3 — «Поливайко» scope change | 06-30 00:31–01:43 | ~1 h | 7 | requirements/plan/spec delta, design-system slice, reminders slice (each feat+fix+archive), handoff |
| S4 — Phase 5/6 QA proof | 06-30 10:30–11:05 | ~35 min | 8 | E2E + seed (G5), coverage ratchet, eval-suite 11/11, recordings + vision, AA token darkening, QA pack (G6) |
| S5 — Phase 7 finalize | 06-30 11:18–11:39 | ~20 min | 4 | global review-gate fixes, re-record + re-vision, trajectory-eval 28/28 |
| Phase 7 docs | 06-30 (this pass) | — | — | technical docs + delivery report (this commit) |

## Effort by phase

| Phase | Commits | Notes |
|---|---|---|
| 0 — Scaffold + loop (G0) | within S1 | Next.js 16 + SQLite/Drizzle + Recharts + Vitest/Playwright/OpenSpec; ADR-0001/0002 |
| 1 — Requirements (G1) | within S1 | 25 → later 38 MVP FRs, Checkpoint 1 sign-off |
| 2 — Baseline specs (G2) | within S1 | one owner per FR; `openspec validate --all --strict` |
| 3 — Capability plan (G3) | within S1 | 5 MVP slices + Checkpoint 2; later +2 scope-change slices |
| 4 — Build (5 MVP slices) | S2, 18 | app-shell → plants → growth → watering → charts |
| 4b — Scope change (2 slices) | S3, 6 | add-design-system, add-reminders |
| 5 — E2E + seed (G5) | S4 (part) | 11 Playwright tests + deterministic seed |
| 6 — QA proof (G6) | S4 (part) | coverage ratchet, evals 11/11, recordings 6/6 + vision, axe, QA pack |
| 7 — Global review + docs | S5 + docs | review-gate fixes, trajectory-eval 28/28, technical docs, delivery report |

## Per-slice trajectory (the 7 capability changes)

Every slice took the same path — feat commit, one or more review-fix rounds, an
archive commit — graded sound by the trajectory-eval (28/28 pass, ~93 all
dimensions; [`qa/trajectory-eval-report.md`](./qa/trajectory-eval-report.md)):

| Slice | feat | fix round(s) | archive |
|---|---|---|---|
| add-app-shell | 48e028a | 1bb6318, 25a6869 | ec3ccf0 |
| add-plants | 9b14420 | bd31048, d5431ef | 6e438c1 |
| add-growth | 4729a7e | 6387ecb | 50cfb66 |
| add-watering | bf9f009 | 485a4ff | d12e47d |
| add-charts | 0c568de | 2a416f5 | 31e2bfe |
| add-design-system | 183b0a4 | f43d8e0 | 2626a3e |
| add-reminders | 660602d | e0909cd | 9a879ad |

## Summary

- **Total wall-clock build time** ≈ 6–7 active hours across 2 days (excludes the
  06-25 starter), with the autonomous delivery loop running 7 capability slices
  feat→review→archive plus a 2-slice scope change, then a full QA proof pass and
  global review.
- **Slices that needed ≥2 fix rounds:** add-app-shell, add-plants (the two
  foundation slices — error contract + first migration / auto-migrate fix).
- No reverts in the history; all 7 slices archived with clean review evidence.
