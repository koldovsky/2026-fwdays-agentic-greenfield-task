# CHECKLIST — «Гривня» quality gates

> My own, project-tuned gates (hand-authored, see
> [docs/adr/ADR-0003](docs/adr/ADR-0003-prior-art-reuse-boundary.md)). A gate passes
> only when **every** item holds. Deterministic commands are a STOP when red —
> fixing the check is allowed, weakening or skipping it is not. Record each gate's
> passage in [docs/current-state.md](docs/current-state.md).
>
> The command battery: `npm run verify` = `lint` → `check:trace` → `spec:validate` → `build`.

---

## G0 — Scaffold & loop
```
npm run lint && npm run build
git config core.hooksPath          # prints .githooks
```
- [x] App scaffolds; `lint` + `build` green.
- [x] `AGENTS.md` + `CLAUDE.md`; ADR-0001/0002/0003 written.
- [x] Loop authored: `.claude/agents/{kurs-maker,kurs-reviewer,kurs-eval-judge}.md`,
      `.claude/commands/{propose-slice,review-slice}.md`, `.githooks/{pre-commit,commit-msg}`,
      `.github/workflows/ci.yml`, `scripts/check-traceability.mjs`.
- [x] `core.hooksPath = .githooks`; hooks fire (verified: pre-commit + commit-msg).
- [x] `.env.example` documents that the app runs with zero env vars.

## G1 — Product framing
- [x] `docs/product-brief.md` + `docs/requirements.md`; every requirement numbered + phase-tagged.
- [x] Scope signed off (Checkpoint 1).

## G2 — Baseline specs
```
npm run spec:validate
npm run check:trace
```
- [x] One spec per capability under `openspec/specs/`; `validate --all --strict` green.
- [x] Every MVP FR cited in exactly one spec (`check:trace` green).

## G3 — Capability plan
- [x] `docs/mvp-capability-plan.md`: slice table, acyclic graph, per-slice DoD, FR-coverage (25/25).
- [x] Plan approved (Checkpoint 2).

## G4 — Per slice (repeat for every slice)
```
npm run verify                     # lint + check:trace + spec:validate + build
npm run test:run                   # once tests exist
```
- [x] OpenSpec change folder created and validated `--strict` before coding.
- [x] Unit tests written **first** from the spec (`@trace FR-x`), observed **red**, then green; none weakened.
- [x] Pure `lib/` logic is **total** (never throws), framework-free, fully unit-tested.
- [x] No user input or NBU failure yields a 500 / blank / silent failure (`NFR-OBS-01`).
- [x] Locale parsing correct (comma decimals, trailing zeros); numbers mono tabular; stale-day labelled honestly.
- [x] Empty / loading / error states present and honest; inline, no toast.
- [x] Eval case authored for the slice's qualitative surface.
- [x] **Two-checker review** (`/review-slice`: `kurs-reviewer` + `kurs-eval-judge`, both ≠ maker) clean; findings fixed.
- [x] Change archived; `docs/current-state.md` updated; commit carries `Slice:` / `Refs:` trailers.

  Satisfied for all 8 slices: `app-shell`, `i18n`, `currency-list`, `converter`,
  `currency-picker`, `rate-history`, `trend-hint`, `footer-sayings`. Evidence:
  `docs/qa/review-findings.md` + `docs/qa/eval-report.md` (one section per slice),
  `evals/cases/*.eval.ts`, archived changes under `openspec/changes/archive/`, and
  the per-slice commits listed in `docs/current-state.md`.

## G5 — Cross-cutting hardening
- [x] Integration test for the convert → display flow.
- [x] Playwright e2e: core flow + responsive breakpoints + axe a11y (light + dark).
- [x] `npm run verify` green; `docs/qa/automated-verification-latest.md` written.

## G6 — QA proof pack
- [ ] Traceability matrix, manual test plan (non-dev executable), demo script, risk register, acceptance report.
- [ ] Eval report reviewed; every case passes its rubric.
- [ ] Recordings automated + headless; each clip asserts its FRs.

## G7 — Global review & release
- [ ] Global two-checker review clean; all confirmed findings fixed.
- [ ] `npm run verify` green; CI green on the release commit.
- [ ] `docs/technical/*` complete; README usage section; `docs/current-state.md` final.
- [ ] PR opened with FR coverage + gate evidence.
