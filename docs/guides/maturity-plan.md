# Agentic-maturity improvement plan — trackable backlog

> **Status: non-authoritative.** Like [agentic-development.md](agentic-development.md), this is a
> field-manual artifact, **not** part of the contract and **not** checked by any product gate. It
> introduces no FR/NFR/AC. It is a living backlog: edit the checkboxes as items land. Where this and
> the contract docs (`SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `AGENTS.md`) disagree, **they win**.
> None of the items below require a SPEC change — they harden the *harness*, not the product.

## What this tracks

It merges two sources into one prioritized, checkable list:

1. The harness gaps **G-01 … G-12** from [agentic-development.md §6](agentic-development.md).
2. The enhancement proposals from the agentic-maturity assessment.

**Criticality is defined by maturity-score impact** — how many points each item moves the score
produced by [`harness/scripts/check_maturity.py`](../../harness/scripts/check_maturity.py), against
[`docs/maturity-baseline.json`](../maturity-baseline.json). Each item lists the dimension it lifts,
the level transition, and the point delta, plus an **acceptance criterion the scorer can detect**, so
progress is machine-verifiable, not a matter of opinion.

### How the score moves

The score is `Σ(level × weight) / 34 × 100`. One level step is worth `weight / 34 × 100` points:

| Dimension weight | Points per level step |
|---|---|
| 1.5 (D2 spec/trace, D3 verify/gates) | **+4.4** |
| 1.0 (D1, D4, D5, D6, D7) | **+2.9** |
| 0.5 (D8 proof — lifecycle-gated) | **+1.5** |

### Criticality scale

| Tier | Meaning |
|---|---|
| 🔴 Critical | ≥ +4 pts in one item, **or** gate-integrity (a gate that silently passes is worse than none) |
| 🟠 High | +2.5–4 pts, doable now, no dependency |
| 🟡 Medium | +2.5–3 pts but sequenced behind another item |
| 🟢 Low | score-neutral correctness / polish (the scorer can't see it, but it matters) |
| ⚪ Deferred | lifecycle-gated — premature until code/UI lands (M0–M3); chasing it now is cargo-culting |

---

## Current snapshot

`check_maturity.py` baseline (pre-code): **93% · L4 Optimizing** (`31.5 / 34` weighted) — after
🔴 Critical (M-01, M-02), 🟠 M-03, M-07, M-04, M-05, M-06, and M-08 landed (63% → 93%). This is the
ceiling until code/UI lands: the only headroom left (D8 proof, D3 real-coverage) is lifecycle-gated.

| Dim | Level | Weight | Headroom |
|---|---|---|---|
| D1 context engineering | L3 | 1.0 | → L4 needs a documented rule-feedback loop (hard to auto-detect; not pursued) |
| D2 spec & traceability | **L4** | 1.5 | ✅ maxed (M-01) |
| D3 verification & gates · *gated* | **L4** | 1.5 | ✅ via harness evals (M-02); real-coverage evidence deferred (M-15) |
| D4 review / maker ≠ checker | **L4** | 1.0 | ✅ maxed (M-05 trigger + M-06 adversarial `review-gate` workflow) |
| D5 loop & orchestration | **L4** | 1.0 | ✅ maxed (M-01 binding loop + M-08 propose-only outer-loop watchers) |
| D6 memory & knowledge | **L4** | 1.0 | ✅ maxed (M-04: working handoff + committed engine snapshot) |
| D7 portability & tooling | **L4** | 1.0 | ✅ maxed (M-03 + M-07: `.claude/` adapters + `docs/portability.md`) |
| D8 proof & observability · *gated* | L1 | 0.5 | → L2+ deferred to M3+ (M-14) |

---

## Done

- [x] **CI gate** — `.github/workflows/agentic-checks.yml` runs traceability + harness evals +
  engine-parity + maturity ratchet on every PR/push. *(closes the CI half of **G-01**; lifted D2 L2→L3
  and D3 L2→L3, +8.8 pts: 54% → 63%.)*
- [x] **Maturity scorer + baseline** — `harness/scripts/check_maturity.py` + `docs/maturity-baseline.json`;
  the `--check` ratchet fails CI on regression. *(the L3→L4 self-improvement mechanism for the harness.)*
- [x] **M-01 · Binding git hooks** — `harness/githooks/pre-commit` (traceability + evals + maturity ratchet)
  and `harness/githooks/commit-msg` (`Refs:`/`Slice:` trailer on code-touching commits); enable with
  `git config core.hooksPath harness/githooks`. *(D2 L3→L4, D5 L2→L3, +7.3 pts.)*
- [x] **M-02 · Harness golden-path evals** — `harness/evals/run_evals.py` (maker≠checker, cost-tiered routing,
  skill determinism, loop hooks/recipe) + model-judged `harness/evals/cases/`, run in CI + pre-commit.
  *(closes **G-12**; D3 L3→L4, +4.4 pts.)*
- [x] **M-09 (mechanism)** — `check_engine_parity.py --require-engine` flips skip→fail when the engine
  is absent; CI wired to flip it on once M0 makes `transon` installable. *(gate-integrity; see M-09 below
  for the remaining M0-gated step.)*
- [x] **M-03 · Cross-tool portability (single source + thin adapter)** — root `CLAUDE.md` points Claude
  Code at the canonical `AGENTS.md`; **no** agent/command bodies copied (would duplicate prompts and
  drift). *(D7 L2→L3, +2.9 pts: 75% → 78%.)*
- [x] **M-07 · Full Claude Code adapters + portability doc** — `.claude/{agents,commands,skills,hooks}`,
  `.claude/settings.json`, `.mcp.json`, and [`docs/portability.md`](../portability.md). Every `.cursor`
  mechanism now has a working Claude equivalent: thin adapter bodies read the single source at runtime;
  a `SessionStart` hook injects `AGENTS.md` (always-on parity); read-only roles drop `Write`/`Edit` from
  `tools:`; `model: opus/sonnet` mirrors the cost tiers. Parity is **gated** by a new `run_evals.py`
  check. *(D7 L3→L4, +2.9 pts: 78% → 81% — crosses into L4.)*
- [x] **M-16 · Tool-neutral core + symmetric assessment** *(score-neutral — fairness, not inflation)*.
  Removed the "Claude references Cursor" asymmetry: canonical command/skill/agent-role bodies moved to a
  tool-neutral **`harness/`** core; **both** `.cursor/` and `.claude/` are now thin adapters that
  reference `harness/`, neither references the other. Made `check_maturity.py` tool-symmetric (D1 credits
  the always-on contract per tool — Cursor `alwaysApply` *or* Claude `CLAUDE.md`+SessionStart; advisory-hook
  signal reads both `.cursor/hooks` and `.claude/hooks`). Extended `eval_cross_tool_parity` to enforce
  bidirectional existence, the no-cross-reference rule, and the `harness/` source. Policy ("new tooling →
  both adapters, or an explicit exclusion") recorded in `AGENTS.md` + `docs/portability.md`.
- [x] **M-08 · Loop automations / worktrees (outer loop)** — `harness/automations/` propose-only watchers
  (`drift_watch.py` runs the read-only gates and reports drift that accumulates with no PR open;
  `ci_triage.py` maps a failing gate → its fix) + the scheduled `.github/workflows/drift-watch.yml`
  (cron + manual; opens/updates an issue on drift, never writes the repo) + a documented `worktrees.md`
  flow. Harness-core (explicit exclusion, not per-tool); scorer's `automations` signal now reads
  `harness/automations`. *(D5 L3→L4, +2.9 pts: 90% → 93% — the pre-code ceiling.)*
- [x] **M-06 · Adversarial review-gate workflow** — `harness/workflows/review-gate.md` (+ thin
  `.claude/` and `.cursor/` adapters): a pre-merge gate that fans review across five dimensions and
  **adversarially refutes each finding before it counts**, composing the `round-trip-reviewer` subagent,
  `.coderabbit.yaml`, and the deterministic gates into one verdict. `run_evals.py` parity extended to
  gate workflows on both tools + a `harness/` canonical body. *(closes the adversarial half of **G-05**;
  D4 L3→L4, +2.9 pts: 87% → 90%.)*
- [x] **M-05 · Structurally triggered review** — `.coderabbit.yaml` wires a free external reviewer that
  fires on every PR, scoped by `path_instructions` to the trust-critical round-trip core, runtime-safety
  surfaces, tests, contract docs, and the harness — each citing the SPEC/AD IDs the internal
  `round-trip-review` checklist uses. A second independent checker at the PR boundary, not a replacement
  for the `round-trip-reviewer` subagent. *(closes the structural-trigger half of **G-05**; D4 L2→L3,
  +2.9 pts: 84% → 87%.)*
- [x] **M-04 · Working memory + committed snapshot** — `docs/current-state.md` (working handoff) +
  `docs/metadata-snapshot.json` (engine export) + `docs/metadata-snapshot.md` (provenance, pinned to
  engine `v0.1.3`), all written by `harness/scripts/update_memory.py`; `--check` gates
  snapshot drift in pre-commit + CI (skip-safe), and a symmetric `handoff-memory` stop hook nudges the
  end-of-session handoff. Reconciled ROADMAP M0 ☐→◐ (engine export already exists). *(closes **G-06** +
  **G-07**; D6 L3→L4, +2.9 pts: 81% → 84%.)*
- [x] **M-17 · Broken-link gate** *(gate-integrity)*. `harness/scripts/check_links.py` validates every
  relative Markdown file + anchor link (GitHub slug algorithm); wired into pre-commit + CI. Caught a real
  link broken by the `harness/` folder consolidation that every other gate passed over. Also relocated
  `scripts/` `evals/` `.githooks/` under `harness/` (root 8 → 5 folders) — the whole tool-agnostic harness
  now lives in one folder.

---

## Backlog (ordered by criticality)

### 🔴 Critical

- [x] **M-01 — Binding git hooks (pre-commit + commit-msg).** ✅ *done — see Done above.*  *Gap: **G-01** (hook half), **G-05** spirit.*
  `harness/githooks/pre-commit` runs `check_traceability.py` + `harness/evals/run_evals.py` + `check_maturity.py --check`
  (+ lint/test once code exists); `harness/githooks/commit-msg` rejects a code-touching commit lacking a
  `Refs: FR-xxx` / `Slice:` trailer. Enable with `git config core.hooksPath harness/githooks`.
  - **Impact:** D2 L3→**L4** (+4.4) **and** D5 L2→**L3** (+2.9) = **+7.3 pts**. ✅ landed.
  - **Acceptance:** `check_maturity.py` reports D2 L4 + D5 L3; a trailerless code commit is rejected locally. ✅

- [x] **M-02 — Harness golden-path evals.** ✅ *done — see Done above.*  *Gap: **G-12**.*
  `harness/evals/run_evals.py` asserts the agents behave (maker≠checker, cost-tiered routing, skill determinism,
  loop hooks/recipe); `harness/evals/cases/*.md` hold the model-judged behavioral cases (planner one-task-per-FR,
  implementer refuses ambiguous SPEC, round-trip catches a seeded meaning change — last one gated on M1).
  - **Impact:** D3 L3→**L4** (+4.4). ✅ landed.
  - **Acceptance:** `harness/evals/` present and run in CI; `check_maturity.py` reports D3 L4. ✅

- [~] **M-09 — Engine pin + fail-closed parity.**  *Gap: **G-02**. Mechanism done; flip gated on M0.*
  `check_engine_parity.py --require-engine` now fails (not skips) when the engine is absent, and CI is
  wired to flip it on. **Remaining (M0-gated):** pin a specific `transon` version, `pip install` it in
  CI, and add `--require-engine` to the CI step so parity can never silently no-op.
  - **Impact:** score-neutral, **gate-integrity**. Until the flip, parity still self-skips on a clean clone.
  - **Acceptance:** CI fails if `transon` is absent; the skip path is gone.
  - **Effort:** S (blocked on M0 engine availability for the hard-fail flip).

### 🟠 High (doable now, independent)

- [x] **M-03 — Cross-tool portability (single source + thin adapter).** ✅ *done — see Done above.*  *Proposal P10; approach adjusted to avoid duplication.*
  Two alternatives were weighed against "mirror `.cursor/agents`/`commands` into `.claude/`" (copy the
  bodies — **rejected**, that is the drift the harness forbids) and "extract common parts into shared
  files referenced from both tools" (**rejected for bodies**: no reliable cross-tool transclusion of an
  agent's system prompt, and the two tools' frontmatter/invocation differ — a shared body needs a
  build/sync step that is itself a new, ungated drift source). Chosen approach = the course's
  portable-core + thin-adapter pattern: **one source** (`AGENTS.md` + tool-agnostic gates/hooks/CI) + a
  **thin `CLAUDE.md` pointer**, no copied bodies. Two boundaries make it honest:
  - **Rules** are single-sourced in `AGENTS.md`; the always-on `.cursor/rules` overlap is kept as
    deliberate belt-and-suspenders (a Cursor `alwaysApply` rule must inject its *body* every turn — an
    `@AGENTS.md` reference would trade the always-on guarantee for a few saved lines).
  - **Agent/command/skill orchestration adapters** for Claude Code are deferred to **M-07**, to be
    written as adapters that point at the source, not copies.
  - **Impact:** D7 L2→**L3** (+2.9). ✅ landed (78%).
  - **Acceptance:** ≥2 agent-tool surfaces detected; `check_maturity.py` reports D7 L3. ✅

- [x] **M-04 — Working memory + committed snapshot.** ✅ *done — see Done above.*  *Gaps: **G-06**, **G-07**.*
  `docs/current-state.md` (working handoff: last action / status / next steps; generated *At a glance*
  header + hand-written narrative), `docs/metadata-snapshot.json` (the engine `get_editor_metadata()`
  export) + `docs/metadata-snapshot.md` (provenance — pinned to engine `v0.1.3`). One
  generator `harness/scripts/update_memory.py` writes all three and gates snapshot drift (`--check`,
  skip-safe like parity; pre-commit + CI); a symmetric `handoff-memory` stop hook (both tools) nudges
  the end-of-session handoff. ROADMAP M0 reconciled ☐→◐ (the engine export already exists).
  - **Impact:** D6 L3→**L4** (+2.9). ✅ landed (81% → **84%**).
  - **Acceptance:** `docs/current-state.md` + a committed `*snapshot*` file exist; `check_maturity.py` reports D6 L4. ✅
  - **Effort:** S.

- [x] **M-05 — Structurally triggered review.** ✅ *done — see Done above.*  *Gap: **G-05**.*
  `.coderabbit.yaml` adds a free external "mentor" reviewer that fires automatically on every PR — a
  second, independent checker beside the human-invoked `round-trip-reviewer` subagent. Its
  `path_instructions` pin it to the same trust-critical surfaces (codec, variant matching, supported
  surface, marker escape, ordering, runtime safety) and the same SPEC/AD IDs the
  `round-trip-review` checklist uses, so both reviewers speak the contract. (CODEOWNERS deferred —
  this repo has no GitHub remote/team yet; a fictional owner would be a silently non-functional gate.)
  - **Impact:** D4 L2→**L3** (+2.9). ✅ landed (84% → **87%**).
  - **Acceptance:** CodeRabbit or CODEOWNERS present; `check_maturity.py` reports D4 L3. ✅
  - **Effort:** S.

### 🟡 Medium (sequenced behind a High item)

- [x] **M-06 — Adversarial review workflow.** ✅ *done — see Done above.*  *Extends M-05; Day-2 `review-gate`.*
  `harness/workflows/review-gate.md` (canonical) + thin `.claude/workflows/` and `.cursor/workflows/`
  adapters: a pre-merge gate that fans review across five dimensions (round-trip · runtime safety ·
  catalog/metadata parity · spec/traceability · harness integrity), then **adversarially refutes every
  finding before it blocks merge** (default-refuted-when-uncertain; prefer execution over textual
  argument), composing the `round-trip-reviewer` subagent + `.coderabbit.yaml` + the deterministic
  gates into one verdict. Parity is **gated** — `run_evals.py` now requires workflows on both tools +
  a `harness/` canonical body (verified by a missing-workflow negative test).
  - **Impact:** D4 L3→**L4** (+2.9). ✅ landed (87% → **90%**).
  - **Acceptance:** a `*review*` workflow file exists and is wired; `check_maturity.py` reports D4 L4. ✅
  - **Effort:** M.

- [x] **M-07 — Full Claude Code adapters + portability doc.** ✅ *done — see Done above.*  *Extends M-03.*
  `.claude/{agents,commands,skills,hooks}` + `settings.json` + `.mcp.json` + `docs/portability.md`, all
  thin adapters that read the single source at runtime. Parity gated by `run_evals.py`.
  - **Impact:** D7 L3→**L4** (+2.9). ✅ landed (81%, L4).  **Acceptance:** `docs/portability.md` present, ≥2 surfaces, `check_maturity.py` reports D7 L4. ✅

- [x] **M-08 — Loop automations / worktrees.** ✅ *done — see Done above.*  *Extends M-01; Day-2 outer loop.*
  `harness/automations/` (propose-only outer-loop watchers — `drift_watch.py` runs the read-only gates
  and reports accumulated drift, `ci_triage.py` maps a failing gate to its fix) + the scheduled
  `.github/workflows/drift-watch.yml` (cron + manual; opens/updates an issue on drift, never writes the
  repo) + a documented `worktrees.md` flow for disjoint parallel slices. Recorded as a harness-core
  explicit exclusion (not duplicated per tool). Scorer's `automations` signal extended to `harness/`.
  - **Impact:** D5 L3→**L4** (+2.9). ✅ landed (90% → **93%**).  **Acceptance:** D5 L4. ✅  **Effort:** M.

### 🟢 Low (score-neutral correctness / polish)

- [ ] **M-10 — Verify subagent model slugs.**  *Gap: **G-03**.* Confirm the opus/composer slugs resolve
  in the Models UI; a silent fallback collapses the cost-tiered design. *Score-neutral; protects the design.*
- [ ] **M-11 — Tighten hook wiring.**  *Gaps: **G-08**, **G-09**.* Add `"matcher": "requirement-implementer"`
  to `hooks.json`, confirm `stop` `followup_message` injects, keep key-sniffing as fallback only.
- [ ] **M-12 — Centralize watched-path lists.**  *Gap: **G-11**.* Single source for `CODE_DIRS` /
  `WATCHED_PREFIXES` so the gates don't silently skip files when the M0 layout lands.
- [ ] **M-13 — Real coverage signal.**  *Gap: **G-04**.* Pair `check_traceability.py`'s ID-citation
  (necessary, not sufficient) with Vitest coverage once code exists. *Partially overlaps M-02; full
  coverage is lifecycle-gated.*
- [ ] **G-10 — (no action)** Skills are explicit-invocation by design; documented, accepted.

### ⚪ Deferred (lifecycle-gated — revisit at M3+)

- [ ] **M-14 — Proof & observability.** Recorded demos asserting FRs, a11y CI gate (light+dark),
  vision-judge. *Drives D8 L1→L3+ (+1.5/level), but premature before any UI exists.* Keep the Playwright
  MCP hook; defer the rest to M3–M5.
- [ ] **M-15 — Coverage/eval ratchet on real tests.** A coverage ratchet (only-grows) once `editor-core`
  ships. Reinforces D3 L4 with real evidence rather than harness evals alone.

---

## Projected trajectory

| After clearing | Score | Tier |
|---|---|---|
| ~~CI gate + scorer~~ | ~~63%~~ | done |
| ~~🔴 Critical (M-01, M-02)~~ | ~~75%~~ | done |
| ~~🟠 M-03~~ | ~~78%~~ | done |
| ~~🟠 M-04~~ | ~~84%~~ | done |
| ~~🟠 M-05~~ | ~~87%~~ | done |
| ~~🟡 M-06~~ | ~~90%~~ | done |
| ✅ M-08 — **current** | **93%** | **L4 Optimizing** |
| _(ceiling until code/UI)_ | — | D8 + real-coverage deferred |

Beyond ~93%, the only remaining headroom is D8 (proof) and D3's real-coverage evidence — both
correctly **deferred** until code/UI exists. The plan deliberately stops there rather than inflating
the score with premature machinery.

## Re-measuring

```bash
python harness/scripts/check_maturity.py                 # per-dimension levels + evidence
python harness/scripts/check_maturity.py --check          # ratchet vs baseline (CI uses this)
python harness/scripts/check_maturity.py --update-baseline # after an item lands, re-baseline
```

When an item lands: tick its checkbox, run `--update-baseline`, and commit the bumped
`docs/maturity-baseline.json` alongside the change so the ratchet locks in the gain.
