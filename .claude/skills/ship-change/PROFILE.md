# ship-change profile — Sport & Nutrition Coach (Telegram bot)

Repo-specific configuration for [`SKILL.md`](SKILL.md). Porting the skill to another repo =
rewriting this file only. Loop shape: [ADR-0012](../../../docs/adr/0012-implementation-loop-runner.md).
Eval framework: [ADR-0013](../../../docs/adr/0013-eval-framework.md). Model tiering:
[ADR-0018](../../../docs/adr/0018-run-backlog-model-tiering.md).

## Work source & selection rule (step 2)

Backlog = `openspec/backlog.md` (the DAG). **Selection rule:** pick the lowest-`wave` change of
`kind: agent` with `status: todo` whose every `blocked-by` id is `status: done`. Flip it to `doing`.
If the next thing gating progress is a `kind: manual` item (e.g. `provision`), surface its linked
runbook and **stop** — the human does it and flips it `done`.

Argument override: `/ship-change <change-id>` ships that one change if it is ready;
`/ship-change <description>` proposes an ad-hoc change. No argument → auto-select per the rule above.

## Entry points (upstream of this loop)

The loop starts at select/propose; sharpening happens *before* invocation (see AGENTS.md → How we work):

- Fuzzy idea → `/grill-with-docs` first (interactive; writes ADRs + `CONTEXT.md` glossary), then feed
  the sharpened change into the loop.
- Inbound issue/PR → `/triage` into an agent-ready brief, then `opsx:propose`.
- Refactor hunting → `/improve-codebase-architecture` standalone (full report + grilling); the picked
  candidate becomes a new backlog change.

If a change enters the loop still fuzzy (no crisp outcome, undefined terms), suggest a
`/grill-with-docs` session before proposing — don't grill inside the loop.

## Branch & commit policy

- Work on a **work branch, never `main`** (the default). Preflight requires a clean tree on a work
  branch; create one if needed.
- Commit message: Conventional Commit, ending with
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Local commits only.** No push per change — push per wave/milestone; one PR at the end (ADR-0012).
  Push only when the user explicitly asks.

## Model tiers & named agents

Rationale: [ADR-0018](../../../docs/adr/0018-run-backlog-model-tiering.md) (amends ADR-0012). This is
the **dev-loop** tiering, not the bot's runtime model (Sonnet 4.6, ADR-0003). Principle: **Opus · high**
for **every reasoning, implementation, coherence, and prose phase** (at current pricing Opus·high is
both stronger *and* cheaper than Sonnet 5 for this work — no tier to trade down to); **Haiku · low**
only for pure mechanical tool-running. **No phase runs on Sonnet.** Escalate Haiku → Opus the moment a
mechanical step hits a non-obvious problem (e.g. a red test needing real diagnosis) — note the bump.

Each delegated phase spawns its dedicated agent type from `.claude/agents/` (so the UI shows the gate,
not `general-purpose`); the model tier is baked into the agent's frontmatter — no `model` override at
spawn time.

| Phase | Agent (`subagent_type`) | Model · effort | Why |
|---|---|---|---|
| orchestrate · propose · plan/pre-archive gates | — (main thread) | Opus · high | spec/design judgement; the tier every reasoning phase wants |
| select · commit · archive bookkeeping | `ship-gates` | Haiku · low | mechanical: pick ready, flip status, git, `opsx:archive` move |
| apply — maker (step 5) | `ship-maker` | Opus · high | high-volume implementation; maker ≠ checker |
| verify (step 6) | `ship-verifier` | Opus · high | plan ⇄ impl coherence, keeps main context lean |
| dup-gate + improve-arch (step 7) | `ship-arch` | Opus · high | codebase-wide duplication scan + architectural judgement |
| review — checker (step 8) | `ship-reviewer` | Opus · high | adversarial correctness + standards |
| tests + static (step 9) · evals (step 10) | `ship-gates` | Haiku · low | run npm, report green (red → Opus `ship-maker` diagnosis) |
| docs sync (step 11) | `ship-docs` | Opus · high | accurate current-state / AGENTS.md edits |
| archive spec-sync (step 14) | `ship-docs` | Opus · high | `opsx:sync` delta specs → main specs |

## Gate commands (step 9)

- `npm test` — Vitest suite (config / bot / health / db / router …).
- `npm run lint` — eslint (flat, type-aware).
- `npm run format:check` — prettier check.
- `npm run typecheck` — `tsc --noEmit` (once `src/` exists; skip-with-note before then).

## Extra gates (step 10)

The eval ratchet (ADR-0013), for changes that touch an LLM capability suite:

- `npm run check:evals` — **key-less ratchet**: `results/latest.json` vs `quality/eval-baseline.json`.
  Runs in the loop (CI gate, no API key).
- `npm run evals` — refreshes `results/latest.json` against real LLM at temp 0. **Needs
  `ANTHROPIC_API_KEY`** → in the sandbox (no LLM key / TLS-intercepted egress) this is a **deploy-time**
  gate: **skip-with-note** in the loop, run it at deploy. Skip the whole gate if the change touches no
  capability suite.

## Conventions pointers (maker must load before coding)

- `backend-conventions` skill (model-invoked — loads automatically) for anything under `src/`: guard
  clauses, explicit return types, no N+1 Prisma, explicit-nullable DB returns, Prisma migration workflow.
- Tests live in a **`test/` tree that mirrors `src/`** (`src/db/tenancy.ts` → `test/db/tenancy.test.ts`)
  — not co-located. Vitest runs `test/**/*.test.ts`; the prod build excludes `test/`.

## Reviewer skill (step 8)

`review` (Standards + Spec axes, run as parallel sub-agents). Fixed point = the start SHA recorded at
select; the diff under review includes uncommitted work. Standards axis adds the coding-standards check
`opsx:verify` doesn't — does the diff follow `backend-conventions`?

## Dup-scan scope (step 7a)

`src/**`. Reuse-first is a repo law (`backend-conventions` rule #12): at the second occurrence of any
shared symbol/logic, extract to one home — the owning `src/<area>/` module if single-domain, a shared
`src/util/…` if cross-cutting — then import from both sites. Reuse existing enums/schemas — never mint a
parallel one. (This scope is what would let a copied `detectLang`/`Lang`/regex reach three modules.)

## Refactor scan mode (step 7b)

`improve-codebase-architecture` is interactive by default (HTML report + grilling). Inside this loop it
runs **explore-only**: the subagent uses the skill's exploration discipline and vocabulary (deletion
test, depth, seams) scoped to the touched files, writes **no HTML report**, runs **no grilling** —
applies small in-scope wins directly and files larger candidates as new `openspec/backlog.md` changes.

## Docs protocol (step 11)

1. **`docs/current-state.md`** — update the affected milestone/feature/decision/blocker lines + date on
   every run (stale state is worse than none). This is the living snapshot read at the start of every
   session.
2. **AGENTS.md planned → live** — flip any command/section this change made real (e.g. a `npm run`
   script that now exists); confirm scripts against `package.json`.
3. **Grep `docs/**/*.md`** for every symbol, constant, threshold, env var, table/column, cron schedule,
   or filename the diff touched; update **every** doc that references it.
4. **Glossary sync** — new or shifted domain term → `CONTEXT.md` (glossary only, no implementation
   detail; one canonical name, list aliases). Code-level renames with no domain meaning don't qualify.
5. **ADR check** — significant/hard-to-reverse architectural decision with a real trade-off and no
   existing ADR covering it → write a new numbered ADR now, in this change (`docs/adr/`, append-only —
   supersede, never rewrite an accepted one). Update `docs/adr/README.md` index.
6. **Open questions** — a resolved item in PRD §11 / requirements §11 → record the decision and keep the
   two lists in sync.
7. `npm run docs:check` — validates the ADR index + scripts-documented. Must exit 0 (the docs-check gate).

## Backlog convention (steps 2 & 14)

`openspec/backlog.md` is the DAG and the status of record. Select flips `todo → doing`; archive flips
`doing → done`; a failed gate flips → `blocked` with a one-line reason. Deferred-dedup and larger
refactor candidates are filed as new backlog changes with their `blocked-by` edges.

## Traps (maker + every subagent touching these areas)

These are the AGENTS.md non-negotiables — the most common ways to get it wrong:

- **openspec runs from the repo root only** — never from a subdir; wrong cwd scaffolds a stray nested
  `openspec/`.
- **The database is the memory.** Never reconstruct facts/totals from chat history — answers come from
  SQL (`SELECT … WHERE date=…`). **Totals come from the SUM, never hand-summed**; the LLM writes prose
  only, never the numbers (prevents drift).
- **Tag every food entry `source = fact | estimate`** — Food Database match = fact; otherwise a flagged
  estimate (±20–30%). Surface estimates honestly.
- **Images are never persisted** — food/progress photos stream to the model and are discarded; never
  written to disk/storage/DB. Cover this with a test.
- **No agent loop.** Deterministic single LLM call with structured output / tool-use; prompt-cache the
  stable system prefix. An autonomous loop multiplies cost 10–50×.
- **Language:** mirror the user's language (RU/UA/EN/mixed) in *prose*; DB fields, enum values, and
  structural content stay **English** (`meal: "lunch"`, `source: "estimate"`).
- **Memory caps are sacred** — bot ≤ 512 MB, Postgres ≤ 256 MB. **Build off the box** (CI → GHCR;
  Coolify only pulls/runs). Never run `npm install`/`tsc` on the server.
- **Multi-tenancy:** every domain row carries `user_id`; the service layer enforces the filter.
  Verify DB/LLM mocks in tests honor that filter — a mock that ignores it can hide a tenancy bug.
- **Privacy:** Notion token in env only, never in DB plaintext. Body/progress data is sensitive — tight
  DB access, never log raw values.
- **Prisma migrations** — schema change = a committed migration; `db:deploy` runs in-container at start.
