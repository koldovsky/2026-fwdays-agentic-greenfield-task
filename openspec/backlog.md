# Change Backlog — Sport & Nutrition Coach

*Last updated: 2026-06-29 · Single source of truth for **what work remains and in what order**.*

This is the **dependency-ordered backlog of OpenSpec changes**. Each row maps **1:1** to a future
`openspec/changes/<id>/` — the `id` here **is** the change id. The implementation loop reads this
file to pick the next change, runs it through the gates, and flips its `status`.

Per-change spec/design/tasks live in `openspec/changes/<id>/`. Cross-cutting project status lives
in [docs/current-state.md](../docs/current-state.md). Acceptance criteria are **not duplicated
here** — they live in the PRD (US-#) and the change's own `specs`; this file references them.

---

## How the loop uses this file

**Ready item** = `status: todo` **and** every `blocked-by` id is `status: done`.
The runner picks the lowest-wave ready item (ties: any; same wave = safe to run in **parallel**).

Per item, run the gates **in order** — each must pass before the next:

```
opsx:explore (optional, fuzzy items)
  → opsx:propose        # proposal + specs + design + tasks  (config.yaml rules apply)
  → opsx:apply          # implement tasks
  → opsx:verify         # plan ⇄ implementation coherence
  → review              # SEPARATE reviewer subagent: Standards + Spec axes (maker ≠ checker)
  → npm test            # vitest
  → fallow + npm run lint + format:check + typecheck   # static gates (ADR-0011 / 0009)
  → evals               # trajectory + output evals where the change has them (e.g. router intents)
  → sync docs           # current-state.md + any AGENTS.md planned→live flips + docs:check
  → opsx:archive        # move change to openspec/changes/archive, sync specs
```

Only after **archive** does the item become `status: done`. If any gate fails, status →
`blocked` with a one-line reason; do not advance dependents.

**Status enum:** `todo` · `doing` · `blocked` · `done`.

---

## DAG (machine-readable — keep columns stable)

| id | status | wave | blocked-by | US | milestone | title |
|----|--------|------|-----------|-----|-----------|-------|
| pipe | todo | 0 | — | — | M0 | Pipe: skeleton + webhook + `/start` echo + Dockerfile + CI→GHCR + Coolify |
| data | todo | 1 | pipe | — | M1 | Data layer: Postgres capped/tuned + Prisma schema + migrations + multi-tenancy |
| router | todo | 2 | data | FR-1 | M3 | Message router: 6-intent classifier + Anthropic client + date/TZ (§8.0) |
| onboarding | todo | 2 | data | US-1 | M2 | Onboarding: `/start` Q&A → Mifflin–St Jeor targets |
| food-text | todo | 3 | router | US-2 | M3 | Food log by text: parse → Food DB lookup/add → food_log write |
| metrics | todo | 3 | router | US-7 | M5 | Body metrics + trend diffs (like-vs-like) |
| query | todo | 4 | food-text | US-4 | M3 | Ask the DB: SQL SUM (DB-as-memory) |
| correction | todo | 4 | food-text | US-5 | M3 | Correct last entry |
| clarify | todo | 4 | food-text | US-6 | M3 | Ephemeral open-question + inline keyboard (ask only on material ambiguity) |
| food-photo | todo | 4 | food-text | US-3 | M4 | Plate photo: vision (1 call), ephemeral, never persisted |
| progress-photo | todo | 5 | metrics, food-photo | US-8 | M5 | Progress photo → qualitative notes (ephemeral) |
| reviews | todo | 5 | food-text, metrics | US-9 | M6 | Reviews: daily + cron fallback + weekly/monthly rollups |
| notion-mirror | todo | 6 | data, reviews | US-10 | M7 | Notion async best-effort mirror (queue + worker) |
| hardening | todo | 7 | all | — | M8 | Hardening: retries, rate-limit, prompt-cache + memory-cap verification |

**Waves** = parallel cohorts. After wave 2, the **food track** (food-text → query/correction/
clarify/food-photo) and **body track** (metrics → progress-photo) run independently in parallel.

```
pipe → data ─┬─ router ─┬─ food-text ─┬─ query
             │          │             ├─ correction
             │          │             ├─ clarify
             │          │             └─ food-photo ─┐
             │          └─ metrics ───────────────── progress-photo
             └─ onboarding                            │
                              food-text + metrics → reviews → notion-mirror → hardening
```

---

## Items

> Each item: what the vertical slice delivers end-to-end. Acceptance = the referenced US in
> [docs/prd.md](../docs/prd.md) §6 + invariants in [config.yaml](./config.yaml). Detail is
> generated into `openspec/changes/<id>/` at `opsx:propose` time — keep this brief.

### pipe — M0 · blocked-by: none
Thinnest end-to-end tracer bullet: plain-TS + grammY repo (`src/` per requirements §4), webhook
handler, `/start` echo, multi-stage Dockerfile, zod env validation in `config/`, GitHub Actions →
GHCR, Coolify `nutrition-bot` project. **Done when a message round-trips through the deployed bot.**
Also wires the deferred `typecheck` + Fallow CI steps (need `src/` to exist).

### data — M1 · blocked-by: pipe
Postgres resource in Coolify (capped ≤256 MB + tuned), Prisma schema + migrations + connection.
Tables per requirements §6: users (keyed on Telegram `chat_id`), food_db, food_log, body_metrics,
reviews. Multi-tenancy base: every domain row carries `user_id`; service layer enforces the filter.
**Done when the app reads/writes the DB on the box.**

### router — M3 · blocked-by: data
The FR-1 spine: one classifying LLM call → `log | query | metric | review_trigger | correction |
answer` (§8.0). Anthropic client (Sonnet 4.6, raw API + tool-use, structured output, **no agent
loop**), prompt cache on the stable system prefix, date/TZ resolution incl. "вчера"/"yesterday"
override. First consumer can be the `query`/echo path. **Verify via intent-classification eval.**

### onboarding — M2 · blocked-by: data
`/start` collects age, sex, height, weight, goal, activity, timezone (default `Europe/Kyiv`) →
Mifflin–St Jeor → TDEE × activity → goal-adjusted kcal (no extreme deficits), protein 1.8–2.2 g/kg,
fat ≥ 0.8 g/kg, carbs = remainder. Confirms targets. Command-driven (no router dependency). US-1.

### food-text — M3 · blocked-by: router
Parse terse RU/UA/EN qty+product → Food DB lookup (match = `source: fact`; miss = `source:
estimate` ±20–30% + offer "add to Food DB"). Insert food_log row for correct date (user TZ).
Confirmation **never hand-sums** — totals come from a SUM query only. US-2.

### metrics — M5 · blocked-by: router
Parse "вес 89.2, талия 90" → body_metrics. Diffs compare **like-with-like vs most recent prior
entry**, not vs start. Staleness reminders feed reviews. US-7.

### query — M3 · blocked-by: food-text
"сколько белка сегодня?" → `SELECT … WHERE date=today` SUM. **Never reconstructed from chat** —
DB is the memory. US-4.

### correction — M3 · blocked-by: food-text
Router classifies `correction` → update the last relevant entry; confirmation reflects the
corrected value. US-5.

### clarify — M3 · blocked-by: food-text
Ask a question **only on material ambiguity** (творог 0/5/9%, unknown portion, multiple Food DB
matches, unidentifiable photo component). Inline keyboard for fixed choices, free text otherwise.
Open question is **ephemeral** (expires in minutes); next message resolves it; **no chat history
sent to the model**. The `estimate` tag is the default pressure valve. US-6.

### food-photo — M4 · blocked-by: food-text
Plate photo streamed to vision (**1 call**) → structured items + estimates. Caption naming a Food
DB product prefers Food DB macros (fact) over visual estimate. Visual-only items `estimate`
±20–30%. Rows inserted; confirmed. **Image discarded immediately — never written to disk/DB.** US-3.

### progress-photo — M5 · blocked-by: metrics, food-photo
Via `/progress` or caption `прогресс`. Vision → qualitative notes (key marker: belly in profile);
not a diagnosis or body-fat %. **Only text observations saved; image discarded.** US-8.

### reviews — M6 · blocked-by: food-text, metrics
Manual trigger ("готово на сегодня" / `/done`) generates today's review + sets `reviewed_flag`.
Midnight cron fallback if not reviewed. After a daily: **Sunday** → weekly (from 7 dailies);
**last day of month** → monthly (from that month's weeklies). `reviewed_flag` per (user, date)
prevents doubles. Output per [review-templates.md](../docs/review-templates.md): **numbers from
code, prose from model.** US-9.

### notion-mirror — M7 · blocked-by: data, reviews
Each successful Postgres write enqueues a Notion sync job. Background worker writes the page
(~3 req/s). User confirmed the instant **Postgres** succeeds — Notion never blocks. Failures retry
w/ backoff, never lose data. Feature-flagged per user. Token in env only, never in DB. US-10.

### hardening — M8 · blocked-by: all
Error handling, retries, rate-limit handling, prompt-caching verification, memory-cap verification
(bot ≤512 MB, PG ≤256 MB, crypto-bot mysqld never OOM-killed). **Done when all PRD §4 metrics
(M1–M8) verified.**

---

### Update rule
When a change's gate state advances, flip its `status` in the DAG table (and on `done`, after
`opsx:archive`). When slicing changes (split/merge/new dependency), update **both** the table and
the DAG diagram + the affected item block. Keep this file and `docs/current-state.md` in sync.
