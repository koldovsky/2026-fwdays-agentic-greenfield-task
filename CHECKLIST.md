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
- [ ] Scope signed off (Checkpoint 1).

## G2 — Baseline specs
```
npm run spec:validate
npm run check:trace
```
- [x] One spec per capability under `openspec/specs/`; `validate --all --strict` green.
- [x] Every MVP FR cited in exactly one spec (`check:trace` green).

## G3 — Capability plan
- [x] `docs/mvp-capability-plan.md`: slice table, acyclic graph, per-slice DoD, FR-coverage (25/25).
- [ ] Plan approved (Checkpoint 2).

## G4 — Per slice (repeat for every slice)
```
npm run verify                     # lint + check:trace + spec:validate + build
npm run test:run                   # once tests exist
```
- [ ] OpenSpec change folder created and validated `--strict` before coding.
- [ ] Unit tests written **first** from the spec (`@trace FR-x`), observed **red**, then green; none weakened.
- [ ] Pure `lib/` logic is **total** (never throws), framework-free, fully unit-tested.
- [ ] No user input or NBU failure yields a 500 / blank / silent failure (`NFR-OBS-01`).
- [ ] Locale parsing correct (comma decimals, trailing zeros); numbers mono tabular; stale-day labelled honestly.
- [ ] Empty / loading / error states present and honest; inline, no toast.
- [ ] Eval case authored for the slice's qualitative surface.
- [ ] **Two-checker review** (`/review-slice`: `kurs-reviewer` + `kurs-eval-judge`, both ≠ maker) clean; findings fixed.
- [ ] Change archived; `docs/current-state.md` updated; commit carries `Slice:` / `Refs:` trailers.

## G5 — Cross-cutting hardening
- [ ] Integration test for the convert → display flow.
- [ ] Playwright e2e: core flow + responsive breakpoints + axe a11y (light + dark).
- [ ] `npm run verify` green; `docs/qa/automated-verification-latest.md` written.

## G6 — QA proof pack
- [ ] Traceability matrix, manual test plan (non-dev executable), demo script, risk register, acceptance report.
- [ ] Eval report reviewed; every case passes its rubric.
- [ ] Recordings automated + headless; each clip asserts its FRs.

## G7 — Global review & release
- [ ] Global two-checker review clean; all confirmed findings fixed.
- [ ] `npm run verify` green; CI green on the release commit.
- [ ] `docs/technical/*` complete; README usage section; `docs/current-state.md` final.
- [ ] PR opened with FR coverage + gate evidence.
