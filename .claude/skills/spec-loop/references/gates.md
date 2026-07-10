# The gates — procedures

Each gate runs as a **fresh subagent** (see `subagents.md`), except the deterministic suite, which costs
**no model** (it runs as the project's hook automation, or as the plain `verify-gate.sh` script the
orchestrator invokes). The orchestrator passes a gate its inputs, gets back a compact result + a findings
file in the artifacts folder, records a STATE row, mirrors it to the task list, and moves on. Artifacts for a
spec live under `loop/latest/artifacts/<spec>/attempt-<n>/gate{0,1,2,3}/`.

---

## Gate 0 — the plan (owned by `spec-loop-preflight`)

**Gate 0 is not the loop's to define** — it belongs to the **`spec-loop-preflight`** skill, which runs it as a
**batch** over the whole backlog _before_ the loop starts and writes `loop/latest/manifest.md`. Inside the loop,
Gate 0 is a single control-flow rule: **consume the manifest entry if present, else plan inline.** Consuming means
the loop reads that spec's section (brief + plan + real-journey acceptance + security map + seam-test obligations)
and starts at Gate 1. For a spec the manifest doesn't cover (added after preflight ran, or preflight skipped), the
loop spawns the **same `spec-loop-planner` agent inline** — identical analysis, just not batched — and persists its
return to `loop/latest/artifacts/<spec>/attempt-<n>/plan/plan.md`.

The analysis itself is **not re-described here**, so the copies can't drift:

- **The procedure** — the spec-sanity + traceability smell-test (real-journey demand, no dangling contract, no
  self-scope-out, no un-filled placeholder) and the manifest entry it returns — is defined once in
  **`.claude/agents/spec-loop-planner.md`**, the agent both skills spawn.
- **Why the phase exists + the go/no-go it produces** live in **`spec-loop-preflight`** (its SKILL.md → "What
  preflight decides"; the manifest schema in its `references/manifest-format.md`).

Gate 0 is autonomous either way: gaps go to STATE / triage and _raise_ the journey bar so the loop tries to close
the seam within its retry budget; genuinely missing scope is a `/opsx:propose` job it flags, never invents.

---

## Gate 1 — Implement (the maker, `spec-loop-implementer`, `sonnet`)

**Goal:** turn the change's `tasks.md` into working code that makes the **real journey** pass — to the spec,
nothing more.

**Inputs:** `<spec>`, the planner's **brief + plan + journey acceptance**, attempt `<n>`, and on a retry the
prior gate's `findings.md`. The implementer works from the brief, not the whole design corpus.

**Procedure** (full version in `.claude/agents/spec-loop-implementer.md`):

1. Run any pre-implementation guidance skill the project mandates for its stack **first** (some domains
   have fast-moving APIs or house conventions — the project says which, if any).
2. Use `openspec-apply-change` for the mechanics. Implement each task; mark it `- [x]` as it lands.
3. **Wire it for real** — no placeholder/stub/no-op on a primary path, no demo/fixture data as the real
   source, no swallowed errors on a user action.
4. **Close the seam** the planner flagged (e.g. a cache a later spec's read path depends on) — connective
   tissue toward the declared journey, never new scope; note what you inferred.
5. Stay in scope; out-of-scope needs → STATE triage. Never run your own ad-hoc checks or suppress an error —
   the project's **deterministic-check hooks** run its checks as you edit and surface a red one; reuse them
   and fix the root cause.
6. Write `gate1/notes.md`.

**Done when:** all `tasks.md` items are `[x]`, the seam is wired, and the deterministic checks (run by the
project's hooks — see Gate 2) are green. Full verification is Gate 2's job — and a _different_ agent's.

---

## Gate 2 — Verify (the checker — must be different agents than Gate 1)

**Goal:** prove the feature **actually works**, with evidence on disk — not that the diff matches a spec.
Gate 2 has three parts: the deterministic suite (no model) and the verifier + reviewer (always, two model
agents). The dedicated deep security agent does **not** normally run here — it runs **once at end-of-run** over
the finished system (see "After the backlog drains" below) — and joins Gate 2 as a fourth part **only for a
security-_critical_ spec**.

**(a) Deterministic gate — no model.** The project's own automation runs its checks as the implementer
edits (its hooks / pre-commit / CI — whatever it declares). For the gate's record the orchestrator also
runs the plain script once, which reuses the project's own gate:
`bash .claude/skills/spec-loop/scripts/verify-gate.sh loop/latest/artifacts/<spec>/attempt-<n>/gate2`
— it sources `loop.config.sh`, runs the project's `loop_verify`, and tees `verify.log` (**hard** — a red
result fails the gate → Gate 1). No model reasons over the output; **checks are fixed, never suppressed.**
If `loop_verify` also emits advisory (non-blocking) findings, **delta-judge** them: NEW issues this spec
introduced FAIL → Gate 1; pre-existing findings → triage, don't block, don't "fix" unrelated scaffold.

**(b) Verifier — `spec-loop-verifier` (`sonnet`).** Spawned by the orchestrator. It is handed the
deterministic result (confirms green) plus the planner's **seam-test obligations**, and does the things that
need a model:

- **Honest acceptance test** — author/extend ≥1 test that would **FAIL if the feature were hollow**,
  exercising the real round-trip; **never mock the dependency the spec exists to integrate** for the
  acceptance proof; assert across the session/subsystem seam where state crosses it.
- **Seam-test obligations** — for each cross-spec seam the planner listed, author a test that drives the real
  crossing (provider-writes → consumer-reads) end-to-end; a skipped or mock-satisfied seam obligation is a
  **FAIL**. These seams are exactly where the app has shipped hollow before.
- **Real-stack user journeys** — run the planner's journey acceptance against the **real stack** (real
  services brought up via the project's declared `loop_services_up`, the app's real persistent storage,
  the prod-style build from `loop_preview`, **no fixture seed, no mocked network**) as durable, committed
  specs run by the project's declared runner (`loop_journeys`). Drive stateful, cross-seam paths. A journey
  that fails, **or only passes with a fixture seed**, is a **FAIL**. See `references/journeys.md`.

**(c) Reviewer — `spec-loop-reviewer` (`opus`; skipped on a trivial diff).** Spawned by the orchestrator as
a sibling of the verifier (concurrently, in one message). One pass over the diff: **architecture/fit**,
**correctness** (reuse a `/code-review` pass), and a **security tripwire** — a quick scan that catches an
obvious hole at the spec that introduced it **and flags whether a security surface is present**, which
accumulates into the **end-of-run** deep review. Writes `gate2/review.md`.

**(d) Security — `spec-loop-security` (`opus`; security-CRITICAL spec only).** The dedicated deep security
review normally runs **once at end-of-run** (below), not per spec. It joins Gate 2 as a third sibling **only
when the spec is `security-critical`** — one that _defines_ a security boundary (a new credential/secret
store, an authn/authz gate, a trust boundary between untrusted input and privileged code) whose flaw can't
wait for the end. That is Mode B in `.claude/agents/spec-loop-security.md`: a deep `security-review` pass
over **this diff**, tracing the actual trust flow (cross-seam trust bugs — a credential or capability
laundered across a boundary — are the class this exists to catch). A high-severity finding **FAILS the
gate**. Writes `gate2/security.md`. A merely security-_surface_ spec does **not** trigger this — its surface is
reviewed at end-of-run, and the reviewer's tripwire (c) is the per-spec catch.

**Journey-gate applicability.** Run the **real-stack journeys** only when the project declares a journey
contract (the `loop_*` functions in `loop.config.sh`). For a non-UI / library change, skip them and rely on
the deterministic gate + the honest unit/integration test. `loop-status.sh` reports whether the contract is
declared.

**No video.** Journeys run **headless with assertions**; capture a trace **on failure only**. Video is _not_
verification — a consolidated demo video is an opt-in step offered after the backlog drains, never per-spec.

**Combined verdict (orchestrator).** **PASS** only if: the deterministic gate is green **and** no NEW
advisory regression **and** the honest test asserts the real behavior **and** every **seam-test obligation** is satisfied
(real crossing, not a mock) **and** every real-stack journey passes (none seed-only) **and** no high-severity
security finding (from the reviewer's tripwire, or the security agent on a security-critical spec) **and** no
architectural misfit / significant duplication **and** no correctness defect on a primary path (swallowed
error, stub/no-op, demo-data shortcut). Complexity is advisory (→ triage). Anything short of that is **FAIL →
Gate 1**, with the specific errors (`file:line`, failing assertion, the journey step that broke, the lint rule,
the high-sev finding).

**Journey-runner config (whatever runner the project uses).** The skill names no runner and hard-codes no
URL — `references/journeys.md` owns the project contract. Whatever the project's runner config, it must
guarantee the same shape:

- Point the runner at the **real preview target** `loop_preview` serves (it exports `LOOP_BASE_URL`) — the
  prod-style build a real user gets, never a dev/fixture-seed mode. The skill hard-codes no address; the
  project's binding is the only place a URL/port lives.
- **Video OFF** (video is not verification); capture a **trace/artifact on failure only** (a debugging aid).
- Write journey artifacts under `loop/latest/artifacts/…` so they live with the rest of the run's evidence.
- Bring up the real backing services (`loop_services_up`) before the run and tear them down after.

---

## Gate 3 — Docs (the documenter, `haiku`)

**Goal:** make the written record match what was built.

**Procedure:** (1) sync spec deltas into the main specs with `openspec-sync-specs` (`/opsx:sync`); (2) update
user-facing docs touched by the feature to the _implemented_ behavior (verify claims against code); (3) write
`gate3/notes.md`.

**Pass:** specs synced, docs consistent with code. **A docs-only failure re-runs Gate 3 only** (not Gate 1) —
the cheap path. The one case that routes back to Gate 1 is a docs/code mismatch only a **code** change can
resolve; the documenter says which it is.

---

## Archive + commit (only after all gates pass in one attempt)

Use `openspec-archive-change` (`/opsx:archive`) — it confirms all tasks are `[x]`, then moves the change to
`openspec/changes/archive/YYYY-MM-DD-<spec>/`. Record the `archive` row in STATE with `resolution: done`.

**Checkpoint, then commit per spec** — one spec = one commit, independently reviewable/revertable:

- **Before the implementer first writes** (Gate 1 of the first spec), ensure the tree is committed: if the
  branch is the default, create a feature branch (`git switch -c spec-loop/<YYYY-MM-DD>`); commit any
  pre-existing WIP so it is preserved and each spec starts from a clean, revertable baseline.
- After archive, stage and commit this spec's work — code, tests, journeys, synced spec, `loop/` updates:
  `git add -A && git commit -m "feat(<capability>): <spec> — via spec-loop (gate0+code+journey+review+docs)"`.
- **Do not push** unless asked. Record a `commit` row in STATE with the short SHA, then pick the next spec.

## After the backlog drains — end-of-run verification, then offer a demo

Run **two checks in parallel** over the finished system (maker≠checker even here):

- **StopConditionJudge** (`spec-loop-stop-judge`) confirms all four: backlog drained, deterministic suite
  green, **real-stack journeys pass**, and **no orphaned seams** (no unfilled placeholder with no owning spec;
  no consumed capability lacking a provider).
- **Deep security review** (`spec-loop-security`, Mode A) — the **primary** deep security pass, run **once**
  over the **finished, integrated system** across the **union of every surface flagged** during the run (the
  reviewers' tripwire flags + the manifest's `security-surface` specs). It traces trust flows _across_ spec
  boundaries — where a cross-seam credential leak actually lives and where a per-diff review structurally can't
  see it. Writes `loop/latest/artifacts/_final/security.md`. Skip only if no surface was ever flagged.

**Victory needs both:** the judge returns DONE **and** the security review has no high-severity finding. If
either fails → NOT-DONE with specifics → triage + the final report (a human review point, not a mid-run
interrupt).

Only then, **offer a consolidated demo video** — ask whether the user wants one end-to-end recording across
the run's flows (replay the journeys with `video: 'on'` into `loop/latest/artifacts/_demo/`). Offer it; don't record
unprompted — it's evidence, not verification.
