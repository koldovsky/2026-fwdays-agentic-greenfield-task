# Change Backlog — Sport & Nutrition Coach

*Last updated: 2026-06-30 · Single source of truth for **what work remains and in what order**.*

This is the **dependency-ordered backlog of OpenSpec changes**. Each row maps **1:1** to a future
`openspec/changes/<id>/` — the `id` here **is** the change id. The implementation loop reads this
file to pick the next change, runs it through the gates, and flips its `status`.

Per-change spec/design/tasks live in `openspec/changes/<id>/`. Cross-cutting project status lives
in [docs/current-state.md](../docs/current-state.md). Acceptance criteria are **not duplicated
here** — they live in the PRD (US-#) and the change's own `specs`; this file references them.

---

## How the loop uses this file

**Ready item** = `status: todo` **and** every `blocked-by` id is `status: done`.
The runner picks the lowest-wave ready item of `kind: agent` (ties: any; same wave = parallel-eligible).

**`kind: manual` items are human-executed** — one-time infra the loop can't (and must not) do
(Coolify clicks, secrets). The runner never runs them: when a `manual` item is the next thing
gating progress, it surfaces the linked **runbook** and pauses; the human does it and flips it
`done`. Everything downstream stays blocked until then.

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

**Status enum:** `todo` · `doing` · `blocked` · `done`. **Kind enum:** `agent` · `manual`.

---

## DAG (machine-readable — keep columns stable)

| id | status | kind | wave | blocked-by | US | milestone | title |
|----|--------|------|------|-----------|-----|-----------|-------|
| provision | done | manual | 0 | — | — | M0 | Coolify provisioning: project + capped Postgres + env/secrets + GHCR — [runbook](../docs/runbooks/coolify-setup.md) (GHCR public toggle deferred to first `pipe` push, path A) |
| pipe | done | agent | 0 | provision | — | M0 | Pipe: skeleton + long-poll + `/start` echo + Dockerfile + CI→GHCR + Coolify deploy |
| data | done | agent | 1 | pipe | — | M1 | Data layer: Prisma schema + migrations + connection + multi-tenancy (against provisioned PG) |
| router | todo | agent | 2 | data | FR-1 | M3 | Message router: 6-intent classifier + Anthropic client + date/TZ (§8.0) |
| coach-persona | todo | agent | 3 | router | — | M3 | Coach persona (honest voice) in stable system prefix + precision-first clarification policy ([ADR-0015](../docs/adr/0015-coach-persona-precision-first-clarification.md)) |
| onboarding | todo | agent | 2 | data | US-1 | M2 | Onboarding: `/start` Q&A → Mifflin–St Jeor targets |
| food-text | todo | agent | 3 | router | US-2 | M3 | Food log by text: parse → Food DB lookup/add → food_log write |
| metrics | todo | agent | 3 | router | US-7 | M5 | Body metrics + trend diffs (like-vs-like) |
| query | todo | agent | 4 | food-text | US-4 | M3 | Ask the DB: SQL SUM (DB-as-memory) |
| correction | todo | agent | 4 | food-text | US-5 | M3 | Correct last entry |
| clarify | todo | agent | 4 | food-text, coach-persona | US-6 | M3 | Ephemeral open-question + inline keyboard — precision-first ask (ADR-0015) |
| food-photo | todo | agent | 4 | food-text, coach-persona | US-3 | M4 | Plate photo: vision (1 call), ephemeral, never persisted — ask on hidden calorie-movers (ADR-0015) |
| progress-photo | todo | agent | 5 | metrics, food-photo | US-8 | M5 | Progress photo → qualitative notes (ephemeral) |
| reviews | todo | agent | 5 | food-text, metrics, coach-persona | US-9 | M6 | Reviews: daily + cron fallback + weekly/monthly rollups |
| notion-mirror | todo | agent | 6 | data, reviews | US-10 | M7 | Notion async best-effort mirror (queue + worker) |
| hardening | todo | agent | 7 | all | — | M8 | Hardening: retries, rate-limit, prompt-cache + memory-cap verification |

**Waves** = parallel cohorts. After wave 2, the **food track** (food-text → query/correction/
clarify/food-photo) and **body track** (metrics → progress-photo) run independently in parallel.
**coach-persona** (wave 3) lands the honest voice into the shared system prefix once, then gates the
voice-heavy surfaces (clarify, food-photo, reviews) so they build on it.

```
provision (manual) → pipe → data ─┬─ router ─┬─ food-text ─┬─ query
             │          │         │           │            ├─ correction
             │          │         │           │            ├─ clarify ◄────┐
             │          │         │           │            └─ food-photo ◄─┤
             │          │         │           └─ coach-persona ────────────┤
             │          │         └─ metrics ───────────────── progress-photo
             └─ onboarding                            │
                    food-text + metrics + coach-persona → reviews → notion-mirror → hardening
```

---

## Items

> Each item: what the vertical slice delivers end-to-end. Acceptance = the referenced US in
> [docs/prd.md](../docs/prd.md) §6 + invariants in [config.yaml](./config.yaml). Detail is
> generated into `openspec/changes/<id>/` at `opsx:propose` time — keep this brief.

### provision — M0 · **kind: manual** · blocked-by: none
One-time Coolify infra the loop can't do — see [docs/runbooks/coolify-setup.md](../docs/runbooks/coolify-setup.md).
Create the `nutrition-bot` project; add a Postgres resource capped ≤256 MB + tuned (must never
OOM-kill the co-resident crypto-bot mysqld); set env/secrets (env only, never repo/DB) per AGENTS.md
§Environment; connect GHCR so Coolify can pull. Deploy happens in `pipe` once the first image exists.
Telegram delivery is **long-polling** ([ADR-0014](../docs/adr/0014-long-polling-over-webhook.md)) — no
public domain/TLS/webhook secret needed (the free `sslip.io` URL can't get valid TLS). **Done when the
project + capped Postgres + env + GHCR pull are in place** — the human flips this to `done`.

### pipe — M0 · blocked-by: provision
Thinnest end-to-end tracer bullet: plain-TS + grammY repo (`src/` per requirements §4), **long-poll**
update handling ([ADR-0014](../docs/adr/0014-long-polling-over-webhook.md)) + a minimal `/health` HTTP
server on `PORT` (Coolify liveness, not public), `/start` echo, multi-stage Dockerfile, zod env
validation in `config/`, GitHub Actions → GHCR, deploy on the provisioned Coolify project. **Done when
a message round-trips through the deployed bot.** Also wires the deferred `typecheck` + Fallow CI steps
(need `src/` to exist).

### data — M1 · blocked-by: pipe
Prisma schema + migrations + connection against the provisioned Postgres. Tables per requirements §6:
users (keyed on Telegram `chat_id`), food_db, food_log, body_metrics, reviews. Multi-tenancy base:
every domain row carries `user_id`; service layer enforces the filter.
**Done when the app reads/writes the DB on the box.**

### router — M3 · blocked-by: data
The FR-1 spine: one classifying LLM call → `log | query | metric | review_trigger | correction |
answer` (§8.0). Anthropic client (Sonnet 4.6, raw API + tool-use, structured output, **no agent
loop**), prompt cache on the stable system prefix, date/TZ resolution incl. "вчера"/"yesterday"
override. First consumer can be the `query`/echo path. **Verify via intent-classification eval.**

### coach-persona — M3 · blocked-by: router
The honest **Coaching Voice** ([ADR-0015](../docs/adr/0015-coach-persona-precision-first-clarification.md))
written into the **stable, prompt-cached system prefix** that every LLM call shares (built in
`router`): blunt-factual about energy balance and trade-offs ("pizza won't make you thinner"),
**no food-moralizing** (no good/bad foods, guilt, shame), surfaces estimates honestly, mirrors the
user's language (RU/UA/EN) in prose. Also lands the **precision-first clarification policy** as the
shared rule the ask-surfaces enforce: log when the calorie-setting info is complete; ask **one
batched round** only on a hidden **high-leverage** calorie-mover (cooking fat, sauce/dressing,
fried-vs-baked, unknown portion, sugary drink, protein fat%); skip ≈±50 kcal; estimate is the
**fallback** on open-question expiry, not the first move. Evals: a **tone judge rubric**
(`CRITICAL:` non-moralizing, no shame, numbers-not-verdict) per [ADR-0013](../docs/adr/0013-eval-framework.md).
The ask/log **discrimination** dataset eval is authored in `clarify`/`food-photo` where the mechanic
lives. **Done when the persona prefix is live and the tone eval is green.**

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

### clarify — M3 · blocked-by: food-text, coach-persona
Implements the **precision-first** ask from coach-persona / [ADR-0015](../docs/adr/0015-coach-persona-precision-first-clarification.md):
ask **one batched round** only on a hidden **high-leverage** calorie-mover (творог 0/5/9% fat,
unknown portion, cooking fat, sauce/dressing, multiple Food DB matches); **log without asking** when
the info is already complete; skip ≈±50 kcal. Inline keyboard for fixed choices, free text otherwise.
Open question is **ephemeral** (expires in minutes); next message resolves it; **no chat history
sent to the model**; on expiry → log best `estimate` (the fallback, not the first move). Authors the
**ask/log discrimination** dataset eval (asks fire on high-leverage unknowns and *only* those). US-6.

### food-photo — M4 · blocked-by: food-text, coach-persona
Plate photo streamed to vision (**1 call**) → structured items + estimates. Caption naming a Food
DB product prefers Food DB macros (fact) over visual estimate. Per **precision-first**
([ADR-0015](../docs/adr/0015-coach-persona-precision-first-clarification.md)): if the photo is
self-sufficient → log, no question; if a hidden calorie-mover is ambiguous (oil/butter, sauce,
fried-vs-baked, portion) → **one batched question** (reuses the `clarify` mechanic) before logging.
Visual-only items `estimate` ±20–30%. Rows inserted; confirmed. **Image discarded immediately —
never written to disk/DB.** US-3.

### progress-photo — M5 · blocked-by: metrics, food-photo
Via `/progress` or caption `прогресс`. Vision → qualitative notes (key marker: belly in profile);
not a diagnosis or body-fat %. **Only text observations saved; image discarded.** US-8.

### reviews — M6 · blocked-by: food-text, metrics, coach-persona
Manual trigger ("готово на сегодня" / `/done`) generates today's review + sets `reviewed_flag`.
Midnight cron fallback if not reviewed. After a daily: **Sunday** → weekly (from 7 dailies);
**last day of month** → monthly (from that month's weeklies). `reviewed_flag` per (user, date)
prevents doubles. Output per [review-templates.md](../docs/review-templates.md): **numbers from
code, prose from model**, in the honest **Coaching Voice** from coach-persona ([ADR-0015](../docs/adr/0015-coach-persona-precision-first-clarification.md)). US-9.

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
