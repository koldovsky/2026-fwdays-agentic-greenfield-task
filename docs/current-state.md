# Current State — Sport & Nutrition Coach

*Last updated: 2026-06-30 · by: Ihor + agent · Update rule: see bottom*

Living snapshot of where the **whole project** is right now. Read at session start; update at
session end or after meaningful progress. This is the cross-cutting status — per-change specs and
tasks live in `openspec/`; product/architecture intent lives in `docs/`. The dependency-ordered
**change backlog** (what the impl loop runs next) lives in [openspec/backlog.md](../openspec/backlog.md).

## TL;DR
**M0 `pipe` + M1 `data` code-complete locally.** `pipe`: grammY long-poll skeleton, zod config,
`/health`, Dockerfile, CI→GHCR. `data`: Prisma schema (5 core tables), init migration, pooled
client (pinned pool), `user_id` tenancy helper, `migrate deploy` + `$connect` at startup. 16 tests
green; all gates + maker≠checker review passed on both. Remaining: the **human deploy** (push →
GHCR public → Coolify pull → migrate → round-trip).

## Milestone status *(milestones defined in [prd.md](./prd.md) §9)*
| Milestone | State |
|---|---|
| M0 — Pipe (skeleton, long-poll, Dockerfile, CI→GHCR, Coolify) | 🟡 in progress (provision ✅; `pipe` code-complete + archived; **deploy round-trip pending human**) |
| M1 — Data (Postgres capped+tuned, Prisma schema+migrations) | 🟡 code-complete + archived; on-box migrate/read-write pending human deploy |
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
- Decision records: `docs/adr/` (0001–0015). Latest: **ADR-0015** coach persona (honest voice) +
  precision-first clarification policy (grilled 2026-06-30).
- Agent docs: `AGENTS.md` (canonical) + `CLAUDE.md` (pointer).
- CodeRabbit config + PR template (from homework starter).
- OpenSpec config: `openspec/config.yaml` context + per-artifact rules (incl. maker≠reviewer task).
- Lint/format tooling: ESLint flat (type-aware) + Prettier + husky pre-commit. ADR-0009.
- Test runner: Vitest (ADR-0010). CI quality gate (`.github/workflows/ci.yml`) + husky pre-push
  (docs-sync + tests). Docs-drift guard: `scripts/check-docs-sync.mjs`.
- **M0 `pipe` runtime skeleton** — `src/{index,bot/bot,bot/health,config/env}.ts` (grammY long-poll
  ADR-0014, zod env, internal `/health`), Vitest suites (env/bot/health, 9 tests), multi-stage
  `Dockerfile` (non-root, heap-capped) + `.dockerignore`, CI `image` job (build on PRs, push GHCR on
  `main`) + `typecheck` wired. `npm run dev/build/start` now live. Reviewer-resolved (rule-6 arrows,
  PR image build). **Fallow still deferred** (ADR-0011 — not wired; tracer-bullet scope).
- **M1 `data` layer** — `prisma/schema.prisma` (users, food_database, food_log, body_metrics,
  reviews; Int kcal, Decimal grams/cm, `@db.Date`, English enums), `prisma/migrations/*_init`,
  `src/db/client.ts` (pooled singleton, `connection_limit=5`), `src/db/tenancy.ts` (`user_id`
  choke-point), startup `migrate deploy` + `$connect`. `db:generate/migrate/deploy` scripts live.
- Loop tooling: `run-backlog` is now **autonomous/gate-driven** — the two human checkpoints dropped,
  escalate only on a critical fork (ADR-0012 amendment 2026-06-30). Fixed an `openspec/config.yaml`
  YAML bug (colon-space in unquoted scalars silently dropped the `design`/`tasks` rule arrays).

## In progress
- M0/M1 deploy (human): push branch → CI builds + pushes image → flip GHCR package public (path A) →
  Coolify pulls + runs → container `migrate deploy` creates tables → confirm `/start` round-trip +
  `/health` + a DB read/write, idle RSS < 512 MB.

Work is sliced into [openspec/backlog.md](../openspec/backlog.md) (15 changes + 1 manual `provision`;
added `coach-persona` wave 3 on 2026-06-30), driven by `/run-backlog` (ADR-0012/0013).

## Next up
1. ✅ **`provision` (manual, M0): DONE** — Coolify `nutrition-bot` project; Postgres capped 256 MB +
   tuned (`shared_buffers=64MB`, `max_connections=20`, `work_mem=4MB`); app shell (Docker Image from
   GHCR, 512 MB cap, long-poll so no domain/TLS, `PORT=3000` for `/health`); env set
   (`TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `TZ`, `PORT`; `NOTION_*` deferred to M7).
   GHCR package goes **public after `pipe`'s first CI push** (path A — one click, mid-`pipe`).
2. ✅ **`pipe` (M0): code-complete + archived** — `src/` skeleton, long-poll + `/health`, multi-stage
   Dockerfile, zod env, CI→GHCR, 9 tests, review resolved. `typecheck` wired; **Fallow deferred**
   (ADR-0011, not yet installed). Remaining: human deploy + first-push GHCR public toggle (path A).
3. ✅ **`data` (M1): code-complete + archived** — schema (5 tables) + init migration + pooled client
   + tenancy helper + startup migrate/connect. On-box verify is deploy-time (human).
4. **`router` (M3) / `onboarding` (M2): NEXT** — both unblocked by `data` (wave 2). `onboarding`
   (`/start` Q&A → Mifflin targets, command-driven) or `router` (6-intent classifier + Anthropic).

## Key decisions (locked)
- Plain TS, no NestJS (RAM); no agent framework (cost); raw Anthropic API + structured output.
- Postgres = source of truth; Notion = async best-effort mirror.
- Images never persisted. Totals always from SQL SUM. (Full rules: `AGENTS.md`.)
- Telegram delivery = **long-polling**, not webhook (ADR-0014) — free `sslip.io` URL can't get valid TLS.
- Coach persona = one honest, blunt-factual, **non-moralizing** voice in the shared cached system
  prefix; clarification is **precision-first** (ask one round only on hidden high-leverage
  calorie-movers; estimate is the fallback) — ADR-0015.

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
