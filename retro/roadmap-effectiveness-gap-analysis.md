# Roadmap & Harness Effectiveness — Gap Analysis

> ⚠️ **One-off retrospective. NOT part of the harness contract.**
> Assesses the *outcome* of the M0–M5 run. Not a spec, guide, or rule. Agents implementing
> features or milestones **must not read, follow, or cite anything under `retro/`** — the contract
> is `AGENTS.md` + `docs/`. Nothing here feeds future development.

## What this answers

1. **Did we achieve the end result?** Does the delivered editor match the intended goal/scope
   (an engine-free, embeddable Transon editor: the five packages, strict round-trip, self-hosting)?
2. **Was the plan effective?** Was the M0–M5 sequencing/decomposition sound, or did it force rework?
3. **Was the harness effective?** Did test-first + per-ID tasks + the deterministic gates + review
   actually produce a correct, consistent, traceable result — and at what friction/cost?
4. **Where are the gaps?** What's missing, deferred, still open (OQ), or claimed-but-unverified.

This is an **outcome** review, not a process one. It is distinct from
[`harness-effectiveness-review.md`](harness-effectiveness-review.md) (per-session process fidelity).
The per-session reports, if they exist, are *optional supporting evidence* here — not the basis.

## Evidence rule (the whole point)

Ground every finding in **verifiable repository state**, gathered *now*:

- **Run the gates and record real output** — do not describe expected behavior:
  `check_traceability.py`, `check_engine_parity.py`, `check_maturity.py`, `run_evals.py`, and the
  JS test suite (discover its exact command from `package.json` / `turbo.json` / `Makefile`).
- **Read the contract** as the source of intent: `docs/SPEC.md` (§4 scope, FR/NFR/AC/UC),
  `docs/ROADMAP.md` (milestone DoD, locked decisions, open questions), `docs/traceability.md`,
  `docs/current-state.md`.
- **Do NOT trust self-claims.** A ticked ROADMAP checkbox, a `☑`, or a `M5 done` commit message is
  a *claim*, not evidence. Corroborate it against a gate, a passing test, or a traceability row. If
  it can't be corroborated, tag it `claimed, unverified`.
- Every finding carries an **Evidence:** line (what you ran/read) and a **Confidence:** tag —
  `verified` / `claimed-only` / `not-verified`. Unknown ⇒ `not verified`. Never guess or invent.

---

## 0. TL;DR verdict  _(filled last, from the findings below)_

- **End result achieved?** **Yes, as working code; not yet delivered** — the engine-free editor
  (5 packages + reference host) exists, builds, and passes 1564 tests including the full
  execution-based round-trip corpus and self-hosting, but nothing is merged to the default branch,
  there is no git remote, and nothing is published. Confidence: verified (code/tests), verified
  (non-delivery).
- **Plan effective?** **Partially → then yes** — the original v1.0 plan (hand-written codec/IR)
  was scrapped wholesale (`old-1/*` branches), and M1–M3 were partially re-done once more
  (`old-2/*`); the resequenced v2.0 plan (de-risk one rule → fold catalog → project to Blockly →
  UI → embedding) then ran M0→M5 in ~5 days with no further restarts. Confidence: verified
  (git history); the "then effective" judgement is inference.
- **Harness effective?** **Yes** — 123 distinct requirement IDs are cited in tests, all four
  deterministic gates pass right now, and the maker≠checker review demonstrably produced
  correctness-fix commits in every milestone (all ancestors of HEAD, each with regression tests
  now in the passing suite). Cost signals (two restarts, test-bridge hardening) are visible but
  modest. Confidence: verified (artifacts); the net judgement is inference.
- **Biggest gap:** **Delivery/integration, not correctness** — all M0–M5 work sits on stacked
  local branches (default branch `master` is 66 commits behind, no remote, nothing published),
  and two enforcement gaps remain: CI engine parity can silently skip (M-09 pin not flipped) and
  the browser accessibility/Pyodide verification is not a committed CI gate.

## 1. End result vs. intended goal

- **Intended deliverable (from SPEC §4 / ROADMAP / AGENTS.md):** an embeddable, **engine-free**
  visual editor for Transon JSON templates — five packages (`editor-core` → `editor-blockly` →
  `editor-ui` → `editor-element` + `editor-react`), strict semantic round-trip for the in-surface
  catalog, all validation/execution across a host `EngineProvider`, metadata-projected surface
  (no hand-written per-rule code), plus examples, accessibility, and self-hosting. Explicitly NOT
  a workflow platform (SPEC §4 non-scope).
- **What is demonstrably built & working:** all five packages exist under `packages/` plus
  `examples/reference-host`. `pnpm build` and `pnpm typecheck` succeed (11/11 turbo tasks).
  A forced-fresh `turbo run test --force` passes **1564/1564 tests** across 7 workspaces
  (core 14, blockly 20, ui 101, react 5, element 12, reference-host 7, engine-node-adapter 1405),
  including: the 147-engine-example structural+execution round-trip corpus
  (`examples-corpus.test.ts`, 295 tests), Blockly load and re-save reverse-path gates
  (`blockly-load` 209, `blockly-resave` 217), workspace-shape (210), and the AC-036 self-hosting
  test (`ac036-selfhosting.test.ts`). Engine parity holds against the **live** engine export
  (`../transon` present; output "source: export": 22 rules, 28 operators, 4 functions).
- **Finding:** the functional goal is achieved as verified working code. However it is **not
  delivered**: the default branch `master` ends at pre-implementation tooling commits
  (`82355f1`), HEAD is 66 commits ahead on a stacked feature line, `git remote -v` is empty
  (there is nowhere to push), and no package is published (root is `private`, version `0.0.0`;
  publish state not checkable without a registry/remote). One post-plan drift: the renderer is
  now **thrasos**, not the AD-017 Zelos locked in ROADMAP (changed post-M5 as AD-033, visible in
  passing test names "applies the transon theme and the thrasos renderer") — docs record the
  supersession, so this is tracked drift, not silent drift.
- **Evidence:** `ls packages examples`; `pnpm build`; `pnpm typecheck`; `npx turbo run test
  --force` (summaries pasted in §4); `python harness/scripts/check_engine_parity.py`;
  `git branch -a`, `git log master..HEAD | wc -l` (66), `git remote -v` (empty); test names in
  the suite output; SPEC §4; ROADMAP "Locked decisions".
- **Confidence:** verified (build/tests/parity, non-delivery); the "achieved" judgement excludes
  UX quality, which no gate measures (not-verified).

## 2. Roadmap completeness (per milestone)

| Milestone | DoD claimed done? | Verified against gates/tests/traceability? | Deferred / incomplete items |
| --- | --- | --- | --- |
| M0 | ☑ (ROADMAP) | **Yes** — engine-parity export/variant/enum checks pass against the live `../transon` export (22/28/4); adapter marker tests (`adapter.markers.test.ts`, `adapter.includes.test.ts`) pass in the suite; pinned snapshot committed (`docs/metadata-snapshot.json`, engine v0.1.3). | M-09 CI engine-pin flip (`--require-engine`) — verified still off in CI (see §7). |
| M1 | ☑ | **Yes** — codec round-trip for the prototype rule + skeleton invariants: `roundtrip.test.ts` (122), `encode/decode/ceiling/regen/workspace-shape` tests all pass; byte-equal regen is a passing test (`regen.test.ts`), FR-126 no-mapping scan is a wired gate. | — |
| M2 | ☑ | **Yes** — full 22-rule catalog: `catalog-coverage.test.ts`, `operators.test.ts` (28 ops + 4 fns), 147-example corpus (295 tests), import-failure → `transon_unsupported` cases; engine parity 22/28/4 passes now. | — |
| M3 | ☑ | **Yes** — committed `palette.json`/`toolbox.json`; FR-125 palette-load, FR-126 forward (`blockly-load`, 209) and reverse (`blockly-resave`, 217) gates pass; presentation + behavior-runtime-size checks wired (referenced from `check_maturity`/CI) and the suite is green. | Renderer later changed Zelos→thrasos (AD-033, post-M5) — tracked supersession. |
| M4 | ☑ | **Yes** — editor-ui 101 tests pass incl. sync (`sync.test.tsx`, AC-033), highlighting (`highlight.test.ts`), host validate/execute (`host-exec`), engine gating (`no-engine.test.ts`); element 12 tests incl. the no-engine IIFE check. Reviewer must-fix commit `98e70eb` exists and is an ancestor of HEAD. | FR-068 incomplete-workspace detection deferred (traceability note); real-engine error paths highlight only the root block (engine limitation, claimed). |
| M5 | ☑ | **Mostly** — react peer-not-bundled (5 tests), examples corpus + expected-vs-actual, import/export tests, jsdom axe scan (`a11y.test.tsx` passes, excludes contrast under jsdom), self-hosting `ac036-selfhosting.test.ts` passes. | **Browser** axe/contrast/Pyodide-`ready` verification is claimed (live MCP run) but not a committed CI job — no `@playwright/test`/`@axe-core/playwright` dependency exists anywhere (verified). FR-017 comments / FR-018 no-raw-edit slated "M5" in traceability are still `[~]`. |

- **Finding:** the six ☑ claims are substantially real — every milestone's core DoD maps to
  passing tests or gates run in this session. The gaps are at the edges: M5's browser-level
  accessibility evidence is uncommitted (claimed-only), M0's CI enforcement half is deferred by
  design, and a handful of per-ID rows the milestones referenced were never closed (§3).
- **Evidence:** forced-fresh test run (§4); gate outputs (§4); `grep` of traceability rows;
  `git log -1` on `98e70eb`/`f4de4c8`/`1cf0be6`/`d4c550e`/`6dfacdb`/`69d1472` (all exist,
  ancestors of HEAD); `grep playwright/axe` across package.json files (only jsdom `axe-core` in
  editor-ui).
- **Confidence:** verified for the table's "yes" columns; deferred-item claims from
  ROADMAP/current-state that match repo state are verified, the rest claimed-only.

## 3. Requirement coverage (traceability)

- **Counts:** SPEC defines **129 FR, 48 NFR, 40 AC, 16 UC** (unique IDs grepped from
  `docs/SPEC.md`). `docs/traceability.md` rows: **67 `[x]` · 23 `[~]` · 12 `[ ]`** (102
  checkbox rows; rows are per-ID for ACs and per-section-bundle for FRs/NFRs). Tests cite
  **123 distinct requirement IDs** (grep over `packages/`, `test/`, `examples/`).
  `check_traceability.py` passes — but note its check (3) only requires a citing test for rows
  marked `[x]`; `[~]`/`[ ]` rows are not enforced.
- **Uncovered / pending rows (all 12 `[ ]`):** AC-002, AC-003, AC-004, AC-005, AC-027;
  "NFR-001..005 / AD-003 / AD-004" (correctness/round-trip bundle); NFR-030/§21.11;
  NFR-035/AD-009 (`file` writes captured); AD-010 (include via host loader); FR-127/NFR-048
  (one of its two rows). Several of these look **stale rather than truly uncovered** — e.g.
  NFR-035/AD-009 and AD-010 point at "execution tests (AC-024/025)" and the AC-024/AC-025 rows
  are `[x]` with passing `host-exec` tests; AC-002..005 describe scenarios the round-trip corpus
  demonstrably exercises. UC coverage is essentially untracked: only **UC-016** is referenced
  anywhere in traceability; UC-001..015 have no rows.
- **Finding:** per-ID test discipline is real and broad (123 IDs cited, gate-enforced for done
  rows), but the matrix was not fully closed out at the end of M5: ~⅓ of rows are `[~]`/`[ ]`
  even though ROADMAP marks all milestones ☑, and some pending rows contradict passing tests
  (bookkeeping lag), which slightly undermines the matrix as the single source of coverage truth.
- **Evidence:** `grep -oE` ID counts on SPEC/traceability/tests; `grep -n '\[ \]\|\[~\]'
  docs/traceability.md`; `python harness/scripts/check_traceability.py` (output in §4);
  `check_traceability.py` docstring (scope of check 3).
- **Confidence:** verified (counts, gate scope); "stale rather than uncovered" is inference from
  cross-referencing rows against passing tests.

## 4. Gate & test health — snapshot taken now (2026-07-01, HEAD `b231d6f`+, branch `fix-editor-layout-css`)

| Check | Command | Result (pass/fail + summary) |
| --- | --- | --- |
| Traceability | `python harness/scripts/check_traceability.py` | **PASS** — `traceability: consistent.` |
| Engine parity | `python harness/scripts/check_engine_parity.py` | **PASS** — `engine-parity: consistent (22 rules, 28 operator tokens, 4 functions; source: export).` Ran against the **live** engine export (`../transon` present), not a skip. |
| Maturity | `python harness/scripts/check_maturity.py` | **PASS** — `agentic maturity: 93% [L4 · Optimizing] (31.5/34.0 weighted)`; D1 L3, D2–D7 L4, **D8 L1** ("proof & observability … no asserted proof yet"). |
| Evals / parity | `python harness/evals/run_evals.py` | **PASS** — `evals: harness golden-path checks pass (maker≠checker · cost-tiered routing · skill determinism · loop hooks · loop recipe · cross-tool parity).` |
| JS test suite | `npx turbo run test --force` (fresh, no cache; `pnpm test` per package.json) | **PASS** — `Tasks: 11 successful, 11 total`, exit 0. **1564 tests**: editor-core 14/14 · editor-blockly 20/20 · editor-ui 101/101 · editor-react 5/5 · editor-element 12/12 · reference-host 7/7 · engine-node-adapter 1405/1405. |

- **Finding:** the tree is actually green right now, on a fresh (uncached) test run, with the
  parity gate exercising the real engine. The maturity gate's own D8 score (L1) flags that
  UI-level *proof* (browser transcripts/asserted screenshots) is the one dimension with no
  asserted evidence — consistent with the §2 M5 finding.
- **Evidence:** all five commands run in this session; summaries above are pasted verbatim
  (test counts from the forced-fresh run's per-package `Tests` lines).
- **Confidence:** verified.

## 5. Harness effectiveness

- **Where it helped (corroborated artifacts):**
  - **Maker≠checker review produced real correctness fixes in every milestone**, each a commit
    that exists and is an ancestor of HEAD with a regression test now passing: M3 `f4de4c8`
    (decoder crash on Blockly-resaved empty array → promoted to the 217-case `blockly-resave`
    reverse gate), M4 `98e70eb` (§7.15 surface check wrongly rejected in-surface data containing
    the token `transon_unsupported`), M5 `1cf0be6` (depth-cap error mislabelled as a surface
    violation), M2 `6dfacdb` (object/fields escape collision — a round-trip *and* semantic
    break, surfaced by forcing all 147 engine examples through the corpus). The M1 must-fix
    narrative (value-sentinel collision, silent variant rewrite) is recorded in ROADMAP/
    current-state with commit `d4c550e` verified present. Evidence: `git log -1` on each hash +
    `git merge-base --is-ancestor`; the named regression suites passing in §4. Confidence:
    verified (commits + tests exist); that review *caused* the finds is the docs' account —
    claimed-only.
  - **Per-ID test-first is enforced, not aspirational:** 123 distinct IDs cited in test files;
    `check_traceability.py` fails if a `[x]` row lacks a citing test; test names in the live
    output carry IDs (e.g. `copy (FR-097/008)`). Evidence: grep + gate docstring + suite output.
    Confidence: verified.
  - **Anti-drift gates are load-bearing:** engine parity ran against the live export and passed;
    codec artifacts are held byte-equal to regeneration by a passing test (`regen.test.ts`)
    rather than by convention. Confidence: verified.
- **Friction / cost (visible in repo state):**
  - Two abandoned branch generations (`old-1/*`, `old-2/*`) — restart cost is real, though the
    first is a *plan* failure more than a harness one (§6). Evidence: `git branch -a`, branch
    dates. Confidence: verified that they exist; cost attribution is inference.
  - The Node↔Python test bridge needed defensive hardening mid-run (serialization guard,
    per-request timeout, zombie-process fix) — recorded in current-state/ROADMAP M2 notes.
    Confidence: claimed-only (the fixes are described; I did not independently reproduce the
    failure).
  - The traceability matrix lagged the milestone claims (§3) — the gate tolerates non-`[x]` rows,
    so closing the matrix relied on discipline that partially slipped. Confidence: verified.
- **Finding:** net positive with high confidence — the combination of execution-based round-trip
  corpus + parity/regen gates + independent review demonstrably caught semantic-preservation bugs
  (the project's stated top risk, AD-004) before merge, and the per-ID discipline held. The
  weakest link is proof at the UI/browser layer (maturity D8 = L1) and matrix closeout hygiene.
  This "net" judgement is inference from the artifacts above, not a measured comparison.
- **Evidence:** as itemized per bullet.
- **Confidence:** mixed — per bullet; the overall verdict is inference.

## 6. Plan effectiveness

- **Sequencing:** git history shows **one full plan pivot and one partial redo** before the run
  that stuck. `old-1/*` (m0…m3, last commit 2026-06-26) is the superseded v1.0 hand-written
  codec/IR plan — ROADMAP v2.0 explicitly records scrapping it ("only `docs/` carry forward").
  The current line starts 2026-06-26 ("going alternative path"); `old-2/*` (m1…m3) diverged
  after M0 on 2026-06-29 with 7 commits not on HEAD — a partial M1–M3 attempt that was redone.
  On the final line, M0 (2026-06-28) → M5-done (2026-07-01) proceeded strictly in milestone
  order on stacked branches (`m0-…` → `m5-react-embedding`) with no further restarts; the M1
  "de-risk one rule before folding the catalog" step did its job in that M2–M5 required only
  rule-agnostic skeleton changes (per milestone notes; corroborated by AC-034/AC-037 synthetic-
  rule tests passing and the no-codec-mapping / runtime-size gates staying wired).
- **Open questions (OQ):** all 17 (OQ-001…OQ-017) are marked ratified ☑ in ROADMAP with each
  folded into a SPEC/AD ID; none open. (Doc-level check only.)
- **Finding:** the v1.0 plan was not effective — it was abandoned wholesale. The v2.0
  resequencing (projection pivot + explicit de-risk prototype at M1) was effective as executed:
  clean milestone stacking, no cross-milestone rework visible in the final line's history, and
  the riskiest bet (two-level metaprogramming, named as the main risk in ROADMAP's readiness
  assessment) was validated at M1 before scale-out. Whether v2.0 succeeded *because of* the
  resequencing or because of lessons from the two failed attempts cannot be separated from repo
  state — inference.
- **Evidence:** `git branch -a`; `git log` dates on `old-1/m3-ui-element-host` (2026-06-26),
  `old-2/m3-editor-blockly` (2026-06-30), merge-base of `old-2/m2-full-catalog` vs HEAD
  (diverged 2026-06-29, 7 orphan commits); first/last commits of `master..HEAD` (2026-06-26 →
  2026-07-01); ROADMAP v2.0 header + OQ table; AC-034/AC-037 tests in the passing suite.
- **Confidence:** verified (history, restarts, ordering); effectiveness attribution is inference.

## 7. Gaps, risks, unverifiable

- **Open items / deferred scope (verified against repo state):**
  - **Nothing is integrated or delivered.** All M0–M5 work is on local stacked branches;
    `master` (the only long-lived branch — there is no `main`) is 66 commits behind HEAD;
    `git remote -v` is empty; packages unpublished. The docs' own "Next steps" list pushing/PRs
    as step 1, still undone. Evidence: git commands in §1. Confidence: verified.
  - **M-09 CI engine-pin flip is off:** CI does not pass `--require-engine`, so in CI the parity
    gate **silently skips** when the engine isn't installable (it only ran for real here because
    `../transon` exists locally). Evidence: `check_engine_parity.py --help` + `grep require-engine
    .github/workflows/agentic-checks.yml` (present only in comments). Confidence: verified.
  - **Browser-level a11y/Pyodide verification is not a gate:** no `@playwright/test` or
    `@axe-core/playwright` dependency exists in any package; the jsdom axe test explicitly
    excludes contrast and the Blockly canvas. Maturity D8 = L1 flags the same. Evidence: grep +
    `a11y.test.tsx` name in suite output + maturity output. Confidence: verified.
  - **Traceability closeout:** 12 `[ ]` + 23 `[~]` rows (§3), incl. deferred FR-068, FR-017/018,
    and untracked UC-001..015. Confidence: verified.
- **Claimed but not corroborated:**
  - The **live browser run** of axe (0 violations incl. contrast), visible focus, and Pyodide
    reaching `ready` — described in current-state as a Playwright-MCP session; no committed
    artifact/CI job to corroborate. Tag: **claimed, unverified**.
  - Real-engine error highlighting falling back to the root block (engine sends text-only
    location trails) — consistent with docs, not exercised here. Tag: claimed-only.
  - Reviewer narratives (what the reviewer refuted, adversarial probes) — the *fix commits* are
    verified (§5); the surrounding accounts are claimed-only.
  - Performance NFRs (e.g. NFR-025 canvas performance targets; OQ-005 deferred size targets):
    no benchmark gate exists to check. Tag: not-verified.
- **Could not check:** npm-registry publish state (no remote/registry configured); the engine
  repo's own M0 test suite (out of scope, separate repo — only its metadata export was exercised
  via the parity gate and the adapter); actual UX quality of the editor in a real browser
  (no committed browser gate to run).

## 8. Recommendations  _(brief, directly supported by findings above)_

- **Deliver:** add a remote, push the six milestone branches, open per-milestone PRs, and merge
  to the default branch — the entire verified result is currently one `rm -rf` away from
  nonexistence (§1, §7).
- **Close the two enforcement gaps:** flip M-09 (`--require-engine` in CI once `transon` is
  pip-installable) so parity can't silently skip (§7); commit the Playwright + axe browser job
  against the built reference-host so the claimed-only M5 browser evidence becomes a gate
  (§2, §7, maturity D8).
- **Reconcile the traceability matrix:** close the stale `[ ]` rows that already have passing
  tests (AC-002..005, NFR-035/AD-009, AD-010, FR-127/NFR-048), decide the deferred ones
  (FR-017/018/068) explicitly, and add UC rows — the matrix should agree with the ☑ milestones
  it underwrites (§3).
- **Consider tightening `check_traceability.py`** to warn on `[~]`/`[ ]` rows whose cited tests
  already pass, so matrix lag is caught mechanically (§5 friction).

---

## Delegation prompt (run once, in a fresh session at the repo root)

```text
Produce a gap analysis of how effectively the M0–M5 roadmap was implemented, by filling
`retro/roadmap-effectiveness-gap-analysis.md` in place (keep its section structure).

The questions to answer: did we achieve the intended end result; was the plan (milestone
sequencing) effective; was the AI-dev harness (test-first, per-ID tasks, deterministic gates,
review) effective; and where are the gaps.

Hard rules — this is an OUTCOME review grounded in verifiable repo state, not in the plan's
own self-assessment:
- Actually RUN the gates and the test suite and paste their real result summaries. Gates:
  `python harness/scripts/check_traceability.py`, `check_engine_parity.py`, `check_maturity.py`,
  `python harness/evals/run_evals.py`. Discover the JS test command from package.json/turbo.json
  and run it. If a check can't run (e.g. engine repo missing), say so — do not assume it passes.
- Read `docs/SPEC.md` (§4 scope, FR/NFR/AC/UC), `docs/ROADMAP.md`, `docs/traceability.md`,
  `docs/current-state.md` for INTENT.
- Do NOT trust self-claims. A ticked ROADMAP box, a "☑", or a "M5 done" commit message is a
  claim — corroborate each against a gate result, a passing test, or a traceability row. If you
  can't corroborate it, tag it "claimed, unverified".
- Every finding gets an "Evidence:" line (what you ran/read) and a "Confidence:" tag
  (verified / claimed-only / not-verified). Label any effectiveness judgement that is inference
  rather than fact. Unknown ⇒ "not verified". Do not guess or invent.
- Be concise but complete. Fill the TL;DR verdict LAST, from the findings above it.
- This is a one-off retrospective: do not treat it as a contract, and change no code or docs
  other than this one report file.

When done, print the path of the file and the one-line TL;DR verdict.
```
