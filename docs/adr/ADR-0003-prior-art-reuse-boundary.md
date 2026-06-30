# ADR-0003: Engineering approach — author a thin agentic loop, not a turnkey framework

- **Status:** Accepted
- **Date:** 2026-06-29
- **Deciders:** orchestrator + user

## Context

This is an **Agentic Engineering** course assignment. The grade is on *visible
evidence of engineering process* — context engineering, spec-driven development,
loop engineering, verification, and **maker ≠ checker** — not on product value.

There are two broad ways to put an agentic delivery loop in place:

1. **Install a turnkey framework** — run an `init`-style generator that drops in a
   large fleet of agents, workflows, quality gates, check scripts, hooks, and CI
   wholesale, then drive it.
2. **Hand-author a small loop** — write the few pieces this project actually needs.

Option 1 is faster, but if a reviewer sees a one-command install followed by gate
runs, what is demonstrated is the ability to **operate** a framework — not to
**engineer** an agentic workflow. For a course, that is the weakest signal, and
most artifacts would carry no fingerprints of mine.

## Decision

**Hand-author a thin agentic loop. Reuse mechanisms, author judgment.**
I do **not** auto-generate the agentic scaffolding. I write the small set of
pieces this project needs, and reuse only undifferentiated *mechanisms* (not
pre-built judgment). This ADR is the honest record of that boundary.

### Reuse — mechanism only (generic, widely-known building blocks)

| Reused mechanism | How it's reused |
|---|---|
| git-hook mechanism (`core.hooksPath`) | I write my **own** `pre-commit` + `commit-msg` in `.githooks/` |
| OpenSpec CLI (`npx openspec validate`) | tooling only; the specs themselves are mine |
| GitHub Actions CI shape (lint + test + build + check) | I write a **minimal** `ci.yml` myself |
| Requirement-ID grammar (`FR/NFR/TC/BC`, stable, phase-tagged) | adopted as a convention; my own IDs |
| The general idea of **phase gates** (hard exit criteria per stage) | distilled into my **own** tight `CHECKLIST.md` (~15–25 lines) |
| The self-contained **skill shape** (one `SKILL.md` + one zero-dep script) | applied to my **own** `kurs-uah` skill, NBU-backed |
| The design-system wiring pattern (vendored system → `DESIGN.md` → a frontend skill) | applied to the claude-design output; my **own** `DESIGN.md` |
| `vercel-react-best-practices` skill (public rule set) | may be copied verbatim as a tool, referenced from `AGENTS.md` |

### Author myself — everything with engineering signal

- `AGENTS.md` (+ `CLAUDE.md`) and the static-vs-dynamic context budget
  (`docs/context-architecture.md`).
- OpenSpec specs (`openspec/specs/*`) and per-slice change folders.
- My own subagents: a maker (**`kurs-maker`**) and **two separate checkers**
  (**`kurs-reviewer`** + **`kurs-eval-judge`**) — writing these *is* the
  maker ≠ checker demonstration.
- My own slash commands: `/propose-slice`, `/review-slice`.
- My own `CHECKLIST.md` (tight, project-tuned gates I can defend).
- My own verification script `scripts/check-traceability.mjs` (~40 lines).
- My own eval cases + rubrics; my own `kurs-uah` skill; my own `DESIGN.md`.

### Deliberately out of scope (YAGNI)

A large multi-agent fleet, an exhaustive multi-page gate document, DB / auth /
RBAC / authz-matrix steps, background-automation jobs, and CI ratchets
(coverage/eval/trajectory). Their checks may run locally as evidence, but they
do not gate a tiny, keyless, read-only app.

## Maker ≠ checker — two separate checker agents of my own

The agent that builds a slice never reviews it. Checking is done by **two
separate agents I author**, each with a distinct lens, both independent of the
maker (`kurs-maker`) and of each other:

- **`kurs-reviewer`** — reviews the slice against its spec and the correctness
  rules (error-surface, locale parsing, `lib/` purity, tone); structural and
  behavioural review.
- **`kurs-eval-judge`** — grades *quality* a correctness review cannot assert:
  error-message clarity, empty-state usability, Ukrainian tone (no exclamation
  marks), trend-hint wording.

No third-party review service is part of the engineering loop — the maker ≠
checker separation is demonstrated entirely by my own agents.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Hand-author a thin loop (chosen) | Highest "this is *my* engineering" signal; still small; every artifact authored | More authoring work; I own the maintenance |
| Install + visibly extend a turnkey framework | Shows adopt **and** adapt | Reviewer must separate my work from inherited work; muddier story |
| Run a turnkey framework wholesale | Fastest to a finished, gated project | Lowest demonstration value; mostly shows I can operate a framework |

## Consequences

- **Easier to grade:** the engineering is legibly mine; this ADR pre-answers
  "did he just run a generator?".
- **We accept:** I re-implement small pieces a framework could provide (hooks, a
  traceability check, gates) — deliberately, because the re-implementation *is*
  the demonstrated skill.
- **Follow-ups:** `AGENTS.md`, the agents/commands, `CHECKLIST.md`, and
  `check-traceability.mjs` are authored at Stage 4; this ADR is linked from
  `AGENTS.md` and the PR description.
