# AGENTS.md — Sport & Nutrition Coach (Telegram Bot)

Guidance for AI agents and humans working in this repo. This is the canonical agent doc;
`CLAUDE.md` points here.

> **Status:** greenfield. Only `docs/` exists today — no code is scaffolded yet. Sections
> marked *(planned)* describe the intended setup from the design docs, not current reality.
> Update them as code lands.

## What this is

A Telegram bot that acts as a personal cutting/nutrition coach: onboards a user, computes
calorie/macro targets, logs food (text + plate photo), logs body metrics, and produces
daily/weekly/monthly reviews. **Postgres is the source of truth; Notion is a best-effort mirror.**

**Start every session by reading [docs/current-state.md](./docs/current-state.md)** — the living
snapshot of what's done, in progress, and next. Then read these before non-trivial work:
- [docs/prd.md](./docs/prd.md) — product goals, user stories (US-1…US-10), success metrics.
- [docs/requirements.md](./docs/requirements.md) — architecture, stack, data model, core flows (§8).
- [docs/review-templates.md](./docs/review-templates.md) — exact review output specs.
- [docs/adr/](./docs/adr/) — why the stack is what it is (decision records). Add a new ADR when
  you make or reverse a significant architectural decision.

## How we work

**OpenSpec is the spec-to-archive backbone.** Every feature/change runs through it:
`opsx:propose → apply → verify → archive` (use `opsx:explore` to think, `opsx:ff` to fast-forward
artifacts). OpenSpec owns **spec, design, implementation, and verification** — don't reach for a
separate PRD or test-loop skill to do that work.

The matt-pocock skills are the **thinking and triage front-end** that OpenSpec doesn't cover:

| When | Skill | Feeds |
|---|---|---|
| Sharpen a fuzzy idea before speccing | **grill-with-docs** (writes ADRs + `CONTEXT.md` glossary; use plain **grill-me** only for a throwaway plan) | → `opsx:propose` |
| Sort an inbound issue/PR into an agent-ready brief | **triage** | → `opsx:propose` |
| Find refactor opportunities in existing code | **improve-codebase-architecture** (ends by grilling the one you pick) | → a new `opsx` change |
| Pre-commit code review (maker ≠ reviewer) | **review** (adds the *coding-standards* axis `opsx:verify` doesn't — does the diff follow [backend-conventions](#code-conventions)?) | **mandatory**, post-`opsx:apply`, run as a **separate subagent** before commit |

Loop: **grill-with-docs → `opsx:propose → apply → verify` → review → commit → `opsx:archive`**, with
`triage` / `improve-codebase-architecture` as alternate entry points.

The loop is sliced into a dependency-ordered backlog of OpenSpec changes
([openspec/backlog.md](./openspec/backlog.md)) and driven by the **run-backlog** skill (`/run-backlog`)
— the orchestrator that picks the next *ready* change, runs every gate (incl. `openspec validate
--strict` + the evals from [ADR-0013](./docs/adr/0013-eval-framework.md)), and stops/marks `blocked`
on failure. See [ADR-0012](./docs/adr/0012-implementation-loop-runner.md) for its full shape.

**Maker ≠ reviewer is a hard gate, enforced by convention (not a schema artifact).** After
`opsx:apply` + `opsx:verify`, the agent that wrote the code does **not** self-approve: hand the diff
to a **separate reviewer subagent** (the `review` skill runs Standards + Spec in parallel sub-agents)
and resolve its findings **before** committing. Every `tasks.md` carries this as its final task (see
`openspec/config.yaml` → `rules.tasks`). We deliberately did **not** fork a custom OpenSpec schema for
this: a schema `review` artifact can only review the *plan* (it runs before `apply`), never the *diff*
— `opsx:verify` already covers plan coherence, so code review stays a post-apply process step.

`to-prd` and `tdd` are intentionally **not installed** — `opsx:propose` and `opsx:apply` replace them.

## Stack

TypeScript + Node.js · **no framework** (plain TS, RAM-constrained host) · **grammY** (Telegram) ·
**Prisma** (ORM) · **PostgreSQL** · **Anthropic API** (Sonnet 4.6 primary, raw API + tool-use,
**no agent loop**) · `node-cron` · Notion SDK (async mirror) · CI: GitHub Actions → GHCR, Coolify pulls.

## Code structure *(planned — see requirements §4)*

```
src/
  bot/      grammY instance, middleware, command + message handlers
  food/     parse, Food Database lookup, food-log writes
  metrics/  body metrics + trend diffs
  reviews/  daily/weekly/monthly generation + cron
  llm/      Anthropic client, prompts, structured-output schemas
  notion/   async mirror queue + worker
  db/       Prisma client, schema
  config/   env validation (zod)
```

Structure is enforced by **folder discipline, not a framework**. Keep modules small and
single-purpose. If the project outgrows this, porting into NestJS is a deliberate later decision.

When writing/reviewing TS under `src/`, follow the code-craft conventions in
[.claude/skills/backend-conventions/SKILL.md](./.claude/skills/backend-conventions/SKILL.md)
(guard clauses, explicit return types, no N+1, Prisma migrations). The skill is model-invoked —
it loads automatically — and defers all behavioral laws to the "Non-negotiable rules" below.

## Non-negotiable rules

These come straight from the design and are the most common ways to get it wrong:

1. **The database is the memory.** Never reconstruct facts or totals from chat history. Answers
   and totals come from SQL queries (`SELECT … WHERE date=…`). No chat-history context is sent
   to the model beyond the ephemeral open-question + reply.
2. **Totals come from the SUM, never hand-summed.** Daily/period numbers are computed in code
   from `food_log` rows. The LLM writes prose only — never the numbers (prevents drift).
3. **Tag every food entry `source = fact | estimate`.** Food Database match = fact; otherwise a
   flagged estimate (±20–30%). Surface estimates honestly; don't interrogate the user over small
   uncertainty (the estimate tag is the pressure-release valve).
4. **Images are never persisted.** Food and progress photos stream to the model and are discarded
   immediately — never written to disk/storage/DB.
5. **No agent loop.** Operations are deterministic single LLM calls with structured output /
   tool-use. An autonomous loop would multiply cost 10–50×. Use prompt caching on the stable
   system prefix.
6. **Language:** mirror the user's language (RU/UA/EN/mixed) in *prose*. DB fields, enum values,
   and structural content stay **English** (`meal: "lunch"`, `source: "estimate"`).
7. **Memory caps are sacred.** Host is RAM-tight and co-resident with another project's MySQL.
   Bot ≤ 512 MB, Postgres ≤ 256 MB. **Build off the box** (CI → GHCR; Coolify only pulls/runs).
   Never run `npm install`/`tsc` on the server.
8. **Multi-tenancy:** every domain row carries `user_id`; the service layer enforces the filter.
   `users` is keyed on Telegram `chat_id` (the chat is the auth — no passwords).
9. **Privacy:** Notion token in env only, never in DB plaintext. Body/progress data is sensitive
   — keep DB access tight, avoid logging raw values.

## Commands

Live today (tooling scaffolded — see [ADR-0009](./docs/adr/0009-eslint-prettier-lint-format.md)
lint/format, [ADR-0010](./docs/adr/0010-vitest-test-runner.md) tests):

```bash
npm install            # deps (dev tooling only so far)
npm run lint           # eslint . (flat config, type-aware)
npm run lint:fix       # eslint . --fix
npm run format         # prettier --write .
npm run format:check   # prettier --check . (CI/pre-merge gate)
npm run typecheck      # tsc --noEmit (no inputs until src/ lands — expected)
npm test               # vitest run (passes with no tests until they land)
npm run test:watch     # vitest (watch mode, local dev)
npm run docs:check     # validate ADR index + scripts-documented (pre-push/CI gate)
```

Git hooks (husky): **pre-commit** runs lint-staged (eslint --fix + prettier on staged files);
**pre-push** runs `docs:check` then `npm test` — both block the push if red. CI (`.github/
workflows/ci.yml`) runs the same gates on PRs + pushes to `main`.

*(planned — land with the runtime scaffold / M0)*

```bash
npm run dev            # local bot (long-poll — ADR-0014)
npm run build          # tsc → dist/ (multi-stage Dockerfile for prod)
npx prisma migrate dev # apply schema migrations locally
npx prisma generate    # regenerate client
```

Confirm exact scripts against `package.json` — update this section when planned ones land.

## Environment *(planned — validate via zod in `config/`)*

Required env vars (no secret committed; never store secrets in the DB):

| Var | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | grammY bot auth |
| `ANTHROPIC_API_KEY` | LLM (Sonnet 4.6 primary) |
| `DATABASE_URL` | Postgres connection (Prisma) |
| `PORT` | internal `/health` probe port (no public ingress — long-poll, ADR-0014); default `3000` |
| `NOTION_TOKEN` | owner's integration token (mirror); env only, never in DB · **optional until M7** |
| `NOTION_DB_FOODLOG_ID` / `_REVIEWS_ID` / `_METRICS_ID` / `_FOODDB_ID` | owner's 4 Notion DB IDs · **optional until M7** |
| `TZ` / default user tz | review cron timing (default `Europe/Kyiv`) |

The `NOTION_*` vars are **optional in the zod schema** (the Notion mirror is M7, feature-flagged) —
the bot must boot without them. All others are required. Confirm exact names against the `config/`
schema when scaffolded.

## Workflow & verification

- **Keep state current.** When a milestone flips, a feature lands, or a decision/blocker
  changes, update [docs/current-state.md](./docs/current-state.md) (affected lines + date).
  Stale state is worse than none.
- **Maker ≠ checker.** Use a separate review pass/agent before merge; don't self-approve.
- **Verify, don't assume.** Behavioral rules above are testable — cover them with tests/evals
  (e.g. totals always equal the SUM; estimate vs fact tagging; date back-dating on "вчера";
  images never hit disk). See PRD §4 metrics for the bar.
- **Specs first** where it helps — the PRD user stories' acceptance criteria double as test targets.
- CI builds the image off-box and pushes to GHCR; Coolify pulls. Don't introduce build steps that
  run on the production host.
- Keep secrets out of the repo and out of the DB; use env (validated via zod in `config/`).

## Open questions

Tracked in [docs/prd.md](./docs/prd.md) §11 and [docs/requirements.md](./docs/requirements.md) §11.
Resolve there, then reflect decisions back into the relevant doc — keep the two §11 lists in sync.

## Agent skills

Per-repo configuration the engineering skills (`triage`, `to-issues`, `to-prd`, `qa`,
`improve-codebase-architecture`, `tdd`, …) read before acting.

### Issue tracker

GitHub Issues via the `gh` CLI (`origin` = `ivolchkov/…`). External PRs are **not** a triage
surface. See [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md).

### Triage labels

The five canonical roles, mapped 1:1 to their default strings (`needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`). See [docs/agents/triage-labels.md](./docs/agents/triage-labels.md).

### Domain docs

Single-context: `CONTEXT.md` (lazily created) + `docs/adr/` at the repo root. See
[docs/agents/domain.md](./docs/agents/domain.md).

### Code conventions

TS code-craft rules for `src/` live in
[.claude/skills/backend-conventions/SKILL.md](./.claude/skills/backend-conventions/SKILL.md)
(model-invoked).
