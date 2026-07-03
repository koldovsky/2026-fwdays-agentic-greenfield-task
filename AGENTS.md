# Kamerton — Vocal-School Booking Agent — Agent Rules

# This may NOT be the Next.js you know

The installed version (App Router — version pinned at stack setup (app stack not yet installed)) may differ from training data.
Read the relevant guide in `node_modules/next/dist/docs/` (or the
package's bundled docs) before writing any code. Heed deprecation notices.

Use `docs/requirements.md` to understand the requirements for the project.

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

- `db/schema/<domain>.ts` per domain, re-exported from `db/schema/index.ts`;
  migrations committed (SQL + snapshots).
- `lib/<domain>/`: `validation.ts` (zod + formData mappers), `queries.ts`,
  `service.ts`, `actions.ts` (guard → validate → service → revalidate),
  pure helpers in own files, colocated `*.test.ts`.
- Pages are thin server components; client components only when needed.
- ONE shared authenticated shell + ONE role-based navigation source.

## Correctness rules (learned from production bugs)

- Server actions never throw raw on user input — catch and surface inline
  (`?formError=` + shared banner). Translate FK/unique violations to human
  messages; hide driver internals.
- Numeric parsers accept trailing zeros and decimal commas.
- Uncontrolled filter/edit forms are keyed by the server state they display.
- Status/state selects offer only reachable transitions; server re-validates.
- External calls (email, exports, APIs) never fail silently: surface to the
  user or log with cause; degrade honestly (e.g. show fallback link).
- Auth library cookie propagation from server actions must be wired
  (Better Auth: `nextCookies()` plugin, last in plugins list).
- Seed/test helpers re-pin baseline state; day-bound test assertions use
  LOCAL calendar dates.
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
node scripts/check-eval-ratchet.mjs   # once evals exist — graded-quality bar
```

Do not archive OpenSpec changes before implementation AND a real-DB smoke
test pass. Keep `.env.local` private; never commit or print it.

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

- macOS (darwin), zsh; Node ≥ 20. Monorepo: packages/bot (grammY, long polling) · packages/agent (Claude API thin tool-loop) · apps/dashboard (Next.js + CopilotKit/AG-UI over SSE).
- Database: SQLite via better-sqlite3 — single local file, gitignored (TC-DATA-01, NFR-PRIV-01). Schedule source of truth is the DEMO Google Calendar: free slots = deterministic Mon–Fri grid minus calendar busy, ranked by pure `rankSlots()` (FR-GUARD-03, FR-SLOT-04, ADR-0003).
- Agent model: `claude-sonnet-5` (TC-STACK-02); Anthropic auth via the developer's local user token — never introduce an API key into the repo or `.env` (NFR-SEC-01).
- MCP in the dev process: use the **chrome-devtools MCP** for E2E dashboard verification and demo-proof recordings (TC-TEST-03); use **context7** (`ctx7` CLI) for current grammY / AG-UI / googleapis docs before writing integration code.
- MCP in the product: the calendar adapter may consume a Google Calendar MCP server (backend as MCP client — the model never gets raw calendar tools); spike decides vs googleapis SDK (TC-CAL-01, ADR-0003 §6).
