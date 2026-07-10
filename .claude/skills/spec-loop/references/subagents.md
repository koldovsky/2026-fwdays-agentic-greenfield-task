# Subagent roles

The loop delegates each gate to a fresh subagent. Two reasons, both from loop engineering:

1. **Context hygiene.** A loop that runs for hours can't pour every file it touches into one context. Each
   subagent gets a clean, scoped context, does its job, and returns a compact result. The orchestrator
   keeps only the control flow and STATE.
2. **Maker ≠ checker.** "The model that wrote the code is too nice grading its own homework." The verifier
   is _always_ a different subagent than the implementer — different instructions, different model. This
   single split catches more than any amount of careful self-review.

## These roles are real, registered agent types — spawn them BY NAME

Each role is a custom agent defined under **`.claude/agents/spec-loop-*.md`**. The role's static brief lives
in that file (it becomes the agent's system prompt) and — crucially — so does its **model** and its
**tool scope**. You invoke a role by passing its name as the `Agent` tool's **`subagent_type`**:

```
Agent(subagent_type: "spec-loop-implementer", description: "...", prompt: <dynamic context>)
```

> **This is the fix for the old failure mode.** Earlier versions described these roles only in prose, so the
> orchestrator spawned every gate as the default **`general-purpose`** agent inheriting the chat model. Now
> the role _is_ a `subagent_type`, and its model is baked into the agent file — pass the name and the model
> follows automatically. **Never** spawn a gate as `general-purpose`; always pass the `spec-loop-*` name.

| Role (gate)                        | `subagent_type`         | model    | effort   | tools                               | why this model & effort                                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------- | -------- | -------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner — Gate 0 (preflight/inline)     | `spec-loop-planner`     | `opus`   | `xhigh`  | read-only + Skill                   | the **unverified, highest-leverage** step (spec sanity, traceability, journey acceptance, seam-tests, security map); a wrong plan ships hollow — maximal reasoning where there's no net. Run in **batch by `spec-loop-preflight`**, or **inline** for a spec the manifest misses |
| Implementer — Gate 1 (maker)       | `spec-loop-implementer` | `sonnet` | `max`    | full (writes code)                  | inside the hook + journey + honest-test loops, but run at full effort so it first-passes more and retries less; opus-override for hard specs                                                                                                                                     |
| Verifier — Gate 2 (checker)        | `spec-loop-verifier`    | `sonnet` | `max`    | full (writes tests, drives browser) | the checker must not be fooled by hollow code — max effort is where the real bugs get caught; a _different model_ than the maker                                                                                                                                                 |
| Reviewer — Gate 2                  | `spec-loop-reviewer`    | `opus`   | `high`   | read-only + Skill                   | architecture/fit + correctness + a **security tripwire** that **flags the surface** for the end-of-run deep review; `opus` by default; **skipped on a trivial diff**                                                                                                             |
| Security — end-of-run (+ critical) | `spec-loop-security`    | `opus`   | `high`   | read-only + Skill                   | a **dedicated deep** security review via `security-review`; runs **once at end-of-run** over the finished system across all flagged surfaces (Mode A), and **also** at a **security-critical** spec's own Gate 2 (Mode B) — the highest-stakes check, so it gets its own agent   |
| Documenter — Gate 3                | `spec-loop-documenter`  | `haiku`  | `low`    | full (writes docs)                  | mostly mechanical sync + prose; cheap (Haiku ignores `effort` — `low` is intent only)                                                                                                                                                                                            |
| Stop-condition judge               | `spec-loop-stop-judge`  | `sonnet` | `medium` | read-only + Skill                   | a focused yes/no + journey/orphan sweep; confirm drained + green + journeys pass + no orphaned seams                                                                                                                                                                             |

**Every role carries the `Skill` tool** — the write-capable roles inherit the full tool set, the read-only
roles list `read-only + Skill` explicitly. So any skill the project installs (a diagram/visualization skill,
a domain analyzer, etc.) is **reusable across every gate** without a code change: install it, and the
relevant gate can invoke it. The role table above is the single source of truth for tool scope — keep it in
sync with the agent files' `tools:` front-matter.

**The model split moved (v0.4).** The strong model now sits where there is **no safety net**: the
**planner (`opus`)** must judge spec quality, trace cross-spec dependencies, and define the real-journey
acceptance — a one-shot reasoning step whose mistakes only surface in an expensive outer retry. The
**implementer (`sonnet`)** writes code _inside_ tight feedback loops (deterministic checks via the project's
hooks, the real-journey gate, the honest acceptance test) that catch its errors mechanically, so it no longer
needs the strongest model — with an opus-override kept for genuinely hard specs. The maker (`sonnet`) and the
Verifier (`sonnet`) are still _different agents_ with different instructions, preserving maker≠checker.

### About model & effort overrides

- **Both model and effort are automatic** — they come from each agent file's `model:` and `effort:`
  front-matter the moment you pass the matching `subagent_type`. You normally pass **nothing**; the right
  model _and_ reasoning effort follow the name. Effort tiers are `low | medium | high | xhigh | max`
  (available levels depend on the model — they land best on Opus and degrade gracefully on cheaper models).
- **Overriding for one spec.** The `Agent` tool here exposes a **`model`** option to override a role for a
  single spec — e.g. bump the **implementer to `opus`** for an unusually hard spec (the reviewer is already
  `opus` by default, and is **skipped on a trivial diff** to keep its cost in check). It does **not** expose
  an `effort` option, so to change a role's _effort_ edit its agent file's `effort:` front-matter (the single
  source of truth the loop runs). Bumping `model` is the per-spawn lever; tuning `effort:` in the file is the
  per-role lever.

## What the orchestrator passes each role (the dynamic task prompt)

The static instructions already live in the agent file. The orchestrator's `prompt` supplies only the
**dynamic context** for this spec/attempt. Always remind the subagent its final message **is** the return
value (compact, structured) — not a chat reply.

- **Planner** — the change name `<spec>`, attempt `<n>`, and (when `spec-loop-preflight` runs it in batch) the
  **cross-spec dependency map**. Runs **Gate 0** (spec sanity + traceability) and returns: a **spec-quality
  verdict** (SOUND / gaps-to-close), a **distilled change brief** (the invariants that apply + the relevant
  design excerpts + the files to touch — so downstream agents don't each cold-read the whole design corpus),
  the ordered plan, the **real-journey acceptance** (which user journeys this spec must make pass, including any
  seam it must close), the **security map** (`security-surface` + `security-critical`), the **seam-test
  obligations**, and risks. `spec-loop-preflight` aggregates the return into `loop/latest/manifest.md`; run inline, the
  orchestrator persists it to `loop/latest/artifacts/<spec>/attempt-<n>/plan/plan.md` (the planner is read-only).
- **Implementer** — `<spec>`, `<n>`, the planner's **brief + plan + journey acceptance**, and **on a retry**
  the prior gate's `findings.md` (apply targeted fixes only). It reads the brief + the diff, not the whole
  design corpus.
- **Verifier** — `<spec>`, `<n>`, the planner's journey acceptance, and its **seam-test obligations**. Authors
  the honest test + a crossing test per seam obligation, runs the real-stack journeys, writes
  `gate2/findings.md`, returns PASS/FAIL. It does **not** run the deterministic suite (the project's hooks / the
  plain `verify-gate.sh` script own that — see `gates.md`).
- **Reviewer** — `<spec>`, `<n>`. Reviews the diff for architecture + correctness + a **security tripwire**,
  and **flags whether a security surface is present** (the flag feeds the end-of-run deep review), reusing the
  project's review skills; writes `gate2/review.md`.
- **Security reviewer** — two modes. **Mode A (end-of-run, primary):** the union of all flagged surfaces across
  the finished system; writes `loop/latest/artifacts/_final/security.md`. **Mode B (per-spec):** `<spec>`, `<n>`, and
  the flagged surface(s), for a **security-critical** spec only; writes `gate2/security.md`. A dedicated deep
  review via the `security-review` skill either way.
- **Documenter** — `<spec>`, `<n>`. Syncs spec deltas + updates docs, writes `gate3/notes.md`.
- **Stop-condition judge** — none beyond "the loop believes the backlog is drained; confirm it (drained +
  green + journeys pass + no orphaned seams)."

## Gate 2 runs TWO model agents — THREE for a security-critical spec — spawned by the orchestrator

Gate 2's model agents run over the same diff, alongside the deterministic suite which costs **no model** (it
runs as the project's hook automation, or as the plain `verify-gate.sh` script the thin orchestrator
invokes — never a model babysitting lint logs). The **orchestrator** spawns the siblings concurrently
(multiple `Agent` calls in one message) and combines their verdicts:

1. `spec-loop-verifier` (`sonnet`/`max`) — honest acceptance test + the **seam-test obligations** + the
   **real-stack user journeys**.
2. `spec-loop-reviewer` (`opus`/`high`; **skipped on a trivial diff**) — architecture + correctness + a
   **security tripwire** that **flags a security surface** (the flag accumulates into the end-of-run deep review).
3. `spec-loop-security` (`opus`/`high`) — the dedicated deep security review joins Gate 2 **only for a
   security-_critical_ spec** (Mode B): one that _defines_ a security boundary, flagged `security-critical` by
   the planner. The **routine** deep review does **not** run here — it runs **once at end-of-run** over the
   finished system (Mode A, see below). A merely security-_surface_ diff gets the reviewer's tripwire now; its
   surface is covered at the end. (The orchestrator may still spot-confirm a surface with a diff heuristic —
   authn/authz, secret/credential handling, a trust boundary between components/processes/origins, an
   injection sink, deserialization, path/file access, network egress, new deps — and add it to the
   end-of-run set; but it does not spawn the deep agent per surface-diff.)

**Combined verdict → FAIL (route back to Gate 1)** if _any_ of: a red deterministic gate (the project's
`loop_verify`) or a new advisory regression; an **unsatisfied seam-test obligation** (skipped or mock-faked);
a **failing real-stack journey** (or one that only passes with a fixture seed); a **high-severity security
finding** (from the reviewer's tripwire OR, on a critical spec, the security agent); an architectural **misfit
/ significant duplication**; or a correctness defect on a primary path (a swallowed error, a
placeholder/stub/demo-data shortcut — see the anti-hollow guardrails). Complexity is advisory (→ triage).
Otherwise PASS.

## The end-of-run deep security pass (Mode A)

When the backlog drains, the orchestrator runs the **StopConditionJudge** and `spec-loop-security` **Mode A**
as parallel end-of-run steps. Mode A is the **primary** deep security review: one pass over the **finished,
integrated system** across the **union of every flagged surface** (reviewer tripwire flags + manifest
`security-surface` specs), tracing trust flows _across_ spec boundaries. The loop declares victory only when the
judge returns DONE **and** Mode A finds no high-severity issue; otherwise → triage + final report. See
`gates.md` → "After the backlog drains".

## Parallelism across specs

For parallel work across _different_ specs, give each implementer `isolation: "worktree"` so their file edits
don't collide. Within one spec the gates are sequential (Gate 0 → Gate 1 → Gate 2 → Gate 3); only Gate 2's
model agents run concurrently — the verifier + reviewer (+ the security agent for a security-critical spec).
At end-of-run, the StopConditionJudge and the deep security pass (Mode A) also run concurrently.

## Editing a role

Change a role's behavior, model, or tool scope by editing its `.claude/agents/spec-loop-*.md` file — that is
the single source of truth the loop actually executes. Keep this table in sync with those front-matter
`model:` values.
