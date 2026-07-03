# Kamerton — Vocal-School Booking Agent — Agent Rules

**Kamerton** («камертон») — a local-first booking agent for a one-teacher vocal
school: a Telegram bot for leads, a localhost dashboard for the teacher
(human-in-the-loop), a Claude-driven agent core. `docs/requirements.md` is the
single source of truth (stable FR/NFR/TC/BC ids); `docs/product-brief.md` is
the narrative; `DESIGN.md` is the visual identity and voice.

## This repo is a graded homework

fwdays Academy «Agentic Engineering: Greenfield»: the deliverable is a **PR
judged on evidence of agentic process** (context engineering, loops,
maker ≠ checker, verification) — not product size. `README.md` (Ukrainian) has
the assignment; CodeRabbit reviews the PR in Ukrainian as a course mentor
(advisory, non-blocking).

- Work on `feat/music-school-agent`, never on `main`.
- The PR fills `.github/pull_request_template.md`: real name, 1–2 min demo
  video, which decisions were the human's vs the agent's, tools/MCP used.
- Keep decision evidence in commits: one commit per approved decision;
  feature-code commits carry `Refs:`/`Slice:` trailers (commit-msg hook).

## The stack may differ from your training data

Next.js 16 / React 19 (dashboard), grammY (bot), AG-UI + CopilotKit
(transport), Google Calendar API — verify against the installed package's
bundled docs or `ctx7` (context7) **before** writing integration code. Heed
deprecation notices.

## Project Factory (works in any tool)

This project is delivered with **Project Factory**, a spec-driven multi-agent
framework that runs under any AI coding tool:

- **Claude Code:** the `project-factory` plugin — `/project-factory:init` (new)
  or `/project-factory:onboard` (existing).
- **Cursor:** the `project-factory` plugin / `.cursor/rules/` — same commands.
- **GitHub Copilot:** `.github/copilot-instructions.md` + the
  `/project-factory-init` / `-onboard` prompts.
- **Codex / others:** this `AGENTS.md` (read natively) + `.codex/prompts/`.

The deterministic loop — `scripts/check-*` (traceability, coverage, eval,
trajectory), git hooks, CI, OpenSpec specs, and the gates — is **identical in
every tool** (pure Node + git). Only orchestration differs: Claude Code fans out
subagents in parallel; elsewhere run review / eval / spec passes sequentially
with fresh context (maker ≠ checker). See `docs/portability.md`.

OpenSpec artifacts live under `openspec/`; the OpenSpec skills/commands are in
`.claude/skills/openspec-*` and `.claude/commands/opsx/`.

## Project Handoff Protocol

Before planning or implementing any substantive change, read:

1. `docs/current-state.md` for the latest persistent handoff and next-step guidance.
2. `docs/mvp-capability-plan.md` for the change sequence and capability scope.
3. `openspec/project.md` and the relevant files under `openspec/specs/`.
4. `docs/adr/` for accepted architecture decisions.

Keep `docs/current-state.md` current when a meaningful milestone happens:
an OpenSpec change is created/implemented/validated/archived; a capability
moves from planned to implemented; setup or validation expectations change;
an ADR is accepted. Write last update date/time (timezone: Europe/Kyiv) and
the current phase. `docs/current-state.md` is a handoff aid, not the source
of truth — if it conflicts with code/specs/tests, verify and update it.

## Context architecture (static vs dynamic)

This file is **static context** — paid for on every agent turn — so keep it to
durable cross-cutting rules. Per-domain detail, procedures, and large references
are **dynamic**: loaded on demand from the code, the spec, an on-demand skill, or
the framework's bundled docs. See `docs/context-architecture.md` for the split,
the token budget, and what to demote when this file grows past it.

## Module conventions

- Monorepo: `packages/bot` (grammY, long polling) · `packages/agent` (Claude
  thin tool-loop) · `apps/dashboard` (Next.js App Router + CopilotKit/AG-UI
  over SSE) · shared pure core in `lib/`.
- `lib/` is framework-free — no `next/*`, no React/DOM, no Telegram SDK, no
  Google SDK (TC-PURE-01): slot grid, free-slot subtraction, `rankSlots()`,
  age validation, booking state machine; colocated `*.test.ts`.
- All calendar I/O goes through one adapter interface (ADR-0003 §6); SQLite
  access lives in its own module; pages are thin server components, client
  components only when needed.

## Correctness rules

- Guardrails live in deterministic code, never only in the prompt: the model
  only picks from code-vetted options (FR-GUARD-*). The agent has **no tool**
  that can confirm a booking or write the knowledge base (FR-GUARD-01/06) —
  never add one.
- External calls (Telegram, Anthropic, Google Calendar) never fail silently:
  deterministic Ukrainian apology, state preserved for resumption (NFR-REL-01).
- Status/state selects offer only reachable transitions; the server
  re-validates (FR-HITL-03/04 re-checks the calendar before Confirm).
- Lead-facing text is Ukrainian-first, kind, pressure-free (BC-BRAND-01,
  BC-LANG-01); the DESIGN.md voice rules are embedded verbatim in the agent's
  static prompt.
- Validate the RENDERED result for UI, not just code/DOM: gate with axe
  (`check-a11y`, light+dark) AND a vision pass (`vision-verify` — a fresh agent
  looks at the settled still); recordings must assert the FRs they show.

## Test-first (per slice)

Write the slice's unit tests + DB smoke flow from the spec FIRST and confirm they
FAIL (red); then implement to green. Never weaken a test to pass it — if a test
contradicts the spec, change it deliberately, not silently.

## Validation cadence

Run before and after substantial changes:

```bash
npm run lint
npm run test:run
npm run test:integration   # once the layer exists
npm run test:e2e           # once the layer exists
npm run build
npx openspec validate --all --strict
node scripts/check-traceability.mjs
node scripts/check-eval-ratchet.mjs   # once evals exist — graded-quality bar
```

Do not archive OpenSpec changes before implementation AND a real-DB smoke
test pass. Keep `.env` private; never commit or print it.

## Evals (graded quality, not just correctness)

Tests assert exact results; evals grade *quality* a unit test can't — error
clarity, empty-state usability, copy tone — scored 0-100 against a rubric.

- Cases live in `evals/cases/*.eval.ts` (scenario + `produce()` + rubric +
  `@trace` ids). Group cases by `dimension`; the ratchet guards each dimension.
- The `eval-suite` workflow grades them with a fresh `eval-judge` agent
  (maker≠checker), writing `docs/qa/eval-report.md` + `evals/results/*.json`.
- `node scripts/check-eval-ratchet.mjs` guards the committed score in CI (no
  API key). Quality may ratchet up, never silently drop. Wire `check:eval`.
- **Recordings are kept** — they *illustrate* a case for humans; the eval is
  the *bar* that decides pass/fail. See `evals/README.md`.

## Environment notes

- macOS (darwin), zsh; Node ≥ 20.
- Secrets: `.env` holds only `TELEGRAM_BOT_TOKEN`, the DEMO calendar id, and
  the path to the gitignored Google service-account JSON key; Anthropic auth
  uses the developer's local user token — **never introduce an Anthropic API
  key** into the repo or `.env` (NFR-SEC-01, TC-CAL-01; gitleaks per TC-SEC-01).
- Agent model: `claude-sonnet-5` (TC-STACK-02).
- Schedule source of truth: the DEMO Google Calendar — free slots =
  deterministic Mon–Fri grid minus calendar busy, ranked by pure `rankSlots()`;
  tentative event on hold, human-only confirm (ADR-0003).
- MCP in the dev process: **chrome-devtools MCP** for E2E dashboard
  verification and demo-proof recordings (TC-TEST-03); **context7** (`ctx7`)
  for current library docs.
- MCP in the product: the calendar adapter may consume a Google Calendar MCP
  server (backend as MCP client — the model never gets raw calendar tools);
  a spike decides vs the googleapis SDK (TC-CAL-01, ADR-0003 §6).
