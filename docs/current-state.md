# Current State — Sport & Nutrition Coach

*Last updated: 2026-06-30 · by: Ihor + agent · Update rule: see bottom*

Living snapshot of where the **whole project** is right now. Read at session start; update at
session end or after meaningful progress. This is the cross-cutting status — per-change specs and
tasks live in `openspec/`; product/architecture intent lives in `docs/`. The dependency-ordered
**change backlog** (what the impl loop runs next) lives in [openspec/backlog.md](../openspec/backlog.md).

## TL;DR
**M0 `pipe` + M1 `data` + M2 `onboarding` + M3 `router` (FR-1) + M3 `coach-persona` code-complete locally.** `pipe`:
grammY long-poll skeleton, zod config, `/health`, Dockerfile, CI→GHCR. `data`: Prisma schema (5 core
tables), migration, pooled client, `user_id` tenancy helper, `migrate deploy` + `$connect` at startup.
`router`: Anthropic client seam (Sonnet 4.6, single call, temp 0, cached prefix, **no agent loop**),
6-intent classifier, date-resolved-in-code (TZ back-dating), eval framework (runner + key-less
ratchet + 18-case dataset). `onboarding`: `/start` Q&A → DB-backed state machine (ADR-0016, the DB
*is* the state — resumes after restart) → Mifflin–St Jeor targets in code (no LLM, no-extreme-deficit
floor), inline-keyboard choices + validated numeric free text, weight → `body_metrics`. `coach-persona`:
honest non-moralizing voice + precision-first clarification policy in the shared cached prefix
(ADR-0015), plus the first **LLM judge-eval** path (rubric grader, CRITICAL gating, double-judge on
borderline — ADR-0013) seeded with `coach-persona-tone`. 66 tests green; all gates + maker≠checker
review passed. Remaining: the **human deploy** + the live LLM/eval run incl. seeding the tone-eval
baseline (need `ANTHROPIC_API_KEY` + egress).

## Milestone status *(milestones defined in [prd.md](./prd.md) §9)*
| Milestone | State |
|---|---|
| M0 — Pipe (skeleton, long-poll, Dockerfile, CI→GHCR, Coolify) | 🟡 in progress (provision ✅; `pipe` code-complete + archived; **deploy round-trip pending human**) |
| M1 — Data (Postgres capped+tuned, Prisma schema+migrations) | 🟡 code-complete + archived; on-box migrate/read-write pending human deploy |
| M2 — Onboarding (`/start` + targets) | 🟡 code-complete + archived; on-box verify pending human deploy |
| M3 — Core logging (text + Food DB) | 🟡 router (FR-1) + LLM-client seam + eval framework + coach-persona (voice/policy + judge-eval) landed; food-text/query/correction/clarify next |
| M4 — Vision (photo plate) | ⬜ not started |
| M5 — Body (metrics + progress notes) | ⬜ not started |
| M6 — Reviews (daily + cron + rollups) | ⬜ not started |
| M7 — Notion mirror | ⬜ not started |
| M8 — Hardening | ⬜ not started |

Legend: ⬜ not started · 🟡 in progress · ✅ done

## Done
- Product/architecture docs: `docs/prd.md`, `docs/requirements.md`, `docs/review-templates.md`.
- Decision records: `docs/adr/` (0001–0016). Latest: **ADR-0016** DB-backed onboarding state machine
  (the DB is the source of progress — resume-after-restart, no chat state). **ADR-0015** coach persona
  (honest voice) + precision-first clarification policy (grilled 2026-06-30).
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
- **M2 `onboarding`** — `src/onboarding/{calculator,flow,questions,types}.ts` + `src/bot` wiring.
  Pure Mifflin–St Jeor target calc (no LLM; protein 2 g/kg, fat ≥0.8 g/kg, no-extreme-deficit floor
  `max(BMR,1200)`). DB-backed flow (ADR-0016): `nextQuestion` = first still-null field via one
  `users` fetch + `body_metrics` existence check (no N+1); answers persist on arrival (`upsert`
  find-or-create, weight → `body_metrics`); resumes after restart. `/start`, `callback_query`, and
  onboarding-gated `message:text` handlers. 14 tests (calculator/flow/bot). Reviewer-resolved.
- **M3 `coach-persona`** — honest non-moralizing **Coaching Voice** + **precision-first** clarification
  policy (ADR-0015) written into the shared, prompt-cached `src/llm/systemPrefix.ts` (one
  `cache_control: ephemeral` block, now past Sonnet's ~2048-token cache min). First **judge-eval**
  path (ADR-0013): `evals/judge.ts` (pure CRITICAL-cap + borderline double-judge helpers + `llmJudge`
  call), `evals/cases/coach-persona-tone.eval.ts` (RU/UA/EN tone rubric, produces through the real
  prefix), wired into `evals/run.ts`; judge scores ride the existing key-less ratchet unchanged.
  Shared `MODEL` const extracted to `src/llm/client.ts`. 12 new tests. Reviewer-resolved. Live tone
  run + baseline seed is **deploy-time** (no key in sandbox; baseline stays `{}` so the ratchet passes).
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
4. ✅ **`router` (M3, FR-1): code-complete + archived** — LLM-client seam (Sonnet 4.6, single call,
   cached prefix), 6-intent classifier, date-in-code, eval framework bootstrap. Live LLM/eval run is
   deploy-time (needs key).
5. ✅ **`onboarding` (M2): code-complete + archived** — DB-backed `/start` Q&A → Mifflin targets
   (ADR-0016). On-box verify is deploy-time (human).
6. ✅ **`coach-persona` (M3, wave 3): code-complete + archived** — honest voice + precision-first
   policy in the shared cached prefix + first judge-eval path (ADR-0015/0013). Live tone run + baseline
   seed is deploy-time (needs key).
7. **`food-text` (M3): NEXT** — first food-track slice (parse → Food DB lookup → `food_log` write),
   unblocked by `router`. `clarify`/`food-photo` (wave 4) now also build on `coach-persona`.

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
