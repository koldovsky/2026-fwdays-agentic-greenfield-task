# Current State — Sport & Nutrition Coach

*Last updated: 2026-06-30 · by: Ihor + agent · Update rule: see bottom*

Living snapshot of where the **whole project** is right now. Read at session start; update at
session end or after meaningful progress. This is the cross-cutting status — per-change specs and
tasks live in `openspec/`; product/architecture intent lives in `docs/`. The dependency-ordered
**change backlog** (what the impl loop runs next) lives in [openspec/backlog.md](../openspec/backlog.md).

## TL;DR
Greenfield. Design docs done (PRD, requirements, review templates, AGENTS.md). **No code
scaffolded yet.** Next milestone: **M0 — Pipe** (repo skeleton → deployed message round-trip).

## Milestone status *(milestones defined in [prd.md](./prd.md) §9)*
| Milestone | State |
|---|---|
| M0 — Pipe (skeleton, long-poll, Dockerfile, CI→GHCR, Coolify) | 🟡 in progress (Coolify provisioned: capped+tuned PG + app shell + env; runtime skeleton next) |
| M1 — Data (Postgres capped+tuned, Prisma schema+migrations) | ⬜ not started |
| M2 — Onboarding (`/start` + targets) | ⬜ not started |
| M3 — Core logging (text + Food DB) | ⬜ not started |
| M4 — Vision (photo plate) | ⬜ not started |
| M5 — Body (metrics + progress notes) | ⬜ not started |
| M6 — Reviews (daily + cron + rollups) | ⬜ not started |
| M7 — Notion mirror | ⬜ not started |
| M8 — Hardening | ⬜ not started |

Legend: ⬜ not started · 🟡 in progress · ✅ done

## Done
- Product/architecture docs: `docs/prd.md`, `docs/requirements.md`, `docs/review-templates.md`.
- Decision records: `docs/adr/` (0001–0011).
- Agent docs: `AGENTS.md` (canonical) + `CLAUDE.md` (pointer).
- CodeRabbit config + PR template (from homework starter).
- OpenSpec config: `openspec/config.yaml` context + per-artifact rules (incl. maker≠reviewer task).
- Lint/format tooling: ESLint flat (type-aware) + Prettier + husky pre-commit. ADR-0009.
- Test runner: Vitest (ADR-0010). CI quality gate (`.github/workflows/ci.yml`) + husky pre-push
  (docs-sync + tests). Docs-drift guard: `scripts/check-docs-sync.mjs`.

## In progress
- M0 runtime skeleton — `src/` tree, grammY wiring, Dockerfile, CI→GHCR (not started yet).

Work is sliced into [openspec/backlog.md](../openspec/backlog.md) (14 changes + 1 manual `provision`),
driven by `/run-backlog` (ADR-0012/0013).

## Next up
1. ✅ **`provision` (manual, M0): DONE** — Coolify `nutrition-bot` project; Postgres capped 256 MB +
   tuned (`shared_buffers=64MB`, `max_connections=20`, `work_mem=4MB`); app shell (Docker Image from
   GHCR, 512 MB cap, long-poll so no domain/TLS, `PORT=3000` for `/health`); env set
   (`TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `TZ`, `PORT`; `NOTION_*` deferred to M7).
   GHCR package goes **public after `pipe`'s first CI push** (path A — one click, mid-`pipe`).
2. **`pipe` (M0): NEXT** — scaffold plain-TS + grammY repo (`src/` per requirements §4), long-poll +
   `/health`, multi-stage Dockerfile, zod env in `config/` (`NOTION_*` optional), CI → GHCR, deploy on
   Coolify, prove a round-trip. Also wires the deferred `typecheck` + Fallow CI steps (ADR-0011).

## Key decisions (locked)
- Plain TS, no NestJS (RAM); no agent framework (cost); raw Anthropic API + structured output.
- Postgres = source of truth; Notion = async best-effort mirror.
- Images never persisted. Totals always from SQL SUM. (Full rules: `AGENTS.md`.)
- Telegram delivery = **long-polling**, not webhook (ADR-0014) — free `sslip.io` URL can't get valid TLS.

## Open questions / blockers
Tracked in [prd.md](./prd.md) §11 (Food DB sharing, onboarding length, template fidelity, registry).
No hard blockers — `provision` is done; `pipe` is ready to run. One mid-`pipe` manual step remains:
flip the GHCR package to public after the first CI push (path A).

---
### Update rule (keep this file honest)
Update when project state changes: milestone flips, a feature lands, a decision is made, or a
blocker appears. Touch only the affected lines + bump the date. If a planned command/struct in
`AGENTS.md` becomes real, unmark it there too. Stale state is worse than no state — a 30-second
update beats a misleading snapshot.
