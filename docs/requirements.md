# Sport & Nutrition Coach — Telegram Bot
## Requirements & Architecture (v1)

*Version 1.1 · Last updated: 2026-06-28 · Status: stack finalized, ready to scaffold*
*Related: [prd.md](./prd.md) (product goals, user stories, success metrics) · [review-templates.md](./review-templates.md) (review output specs) · [adr/](./adr/) (decision records — the "why" behind the stack)*

> **Scope of this doc:** the *how* — architecture, stack, data model, flows. The *what & why*
> (problem, users, goals, measurable success criteria) lives in [prd.md](./prd.md). User stories
> there (US-1…US-10) map to the Core Flows in §8 here.

---

## 1. Vision

A Telegram bot that acts as a personal cutting/nutrition coach. On first contact it
onboards a user (age, height, weight, goal) and computes daily calorie and macro
targets. Thereafter the user logs food (by text or photo), body metrics, and progress
photos; the bot saves everything to a database and produces daily / weekly / monthly
reviews. Postgres is the source of truth; Notion is a best-effort mirror.

Ported and adapted from the original Notion-based "Sport & Nutrition" coaching project.

---

## 2. Scope

### In scope for v1
- Per-user onboarding + target calculation (BMR/TDEE → kcal, protein, fat, carbs)
- Food logging by **text** ("запиши 200г куриного филе") and by **photo of a plate**
- A shared **Food Database** with per-user additions; matched items = fact, unmatched = estimate
- **Food Log** (per-user, per-day consumed entries)
- **Body Metrics** (weight, tape measurements) with trend-aware diffs
- **Progress photos** — analyzed visually, **never stored**; only text observations saved
- **Reviews**: daily (manual trigger + midnight auto-fallback), weekly (Sundays), monthly (month-end)
- **Notion mirror** from day one (async, non-blocking, best-effort)
- Multi-user (a handful of people), keyed on Telegram chat_id

### Explicitly NOT in v1 (port later)
- Food Exclusions filter
- Supplements tracking
- Cardio / steps escalation logic
- Training Log / workout screenshot parsing
- Image/photo persistence of any kind

---

## 3. Final Stack

| Layer | Choice | Notes |
|---|---|---|
| Language / runtime | **TypeScript + Node.js** | |
| Framework | **None — plain TS** | NestJS dropped to save RAM on a tight box (see §4) |
| Telegram lib | **grammY** | TS-first; composers/middleware give structure without a framework |
| LLM | **Anthropic API**, Sonnet 4.6 primary | no agent framework (see §5) |
| ORM | **Prisma** | schema-in-code, version-controlled migrations |
| Database | **PostgreSQL in Coolify** | on the user's Hetzner box, capped (see §6/§7) |
| Scheduling | `node-cron` (or similar) | midnight review fallback |
| Hosting | **Coolify on existing Hetzner server** | ~$0 marginal cost (see §7) |
| CI / builds | **GitHub Actions → GHCR**, Coolify pulls | build OFF the box to avoid RAM spikes |
| Notion mirror | Notion official SDK | async queue, retry, never blocks core loop |

**Estimated monthly cost: ~$1–3 (Anthropic API only). Hosting + DB are ~$0 marginal.**

---

## 4. Why plain TypeScript, not NestJS

The host box is RAM-constrained (4 GB, already swapping ~1.3 GiB, see §7) and will *also*
run Postgres. Every megabyte the app avoids is one less fighting Postgres + the existing
crypto-bot's mysqld for residency.

- Plain grammY app idles ~60–100 MB RSS; NestJS ~150–250 MB.
- Lighter/faster builds, smaller images, smaller deploy spikes.
- This bot is a message router + a few services + one cron — NestJS's DI/module
  machinery is overhead at this size. grammY's composers/middleware are enough.

Structure is kept via folder discipline, not a framework:

```
src/
  bot/          grammY instance, middleware, command + message handlers
  food/         parse, Food Database lookup, food-log writes
  metrics/      body metrics + trend diffs
  reviews/      daily/weekly/monthly generation + cron
  llm/          Anthropic client, prompts, structured-output schemas
  notion/       async mirror queue + worker
  db/           Prisma client, schema
  config/       env validation (zod)
```

Porting into NestJS later is straightforward if the project grows.

---

## 5. Why NO agent framework (the cost decision)

The bot's operations are deterministic single calls, not autonomous agent loops:

- "Save 200g chicken, 450 kcal" → parse → INSERT (1 call, or 0 if regex handles it)
- Photo of plate → 1 vision call → structured JSON → INSERT
- "Make today's review" → fetch rows → 1 summarization call → save

An agent loop would multiply token cost 10–50× and make spend unpredictable. Instead:

- **Raw Anthropic API** with **tool-use / structured outputs** (forced JSON).
- **Primary model: Sonnet 4.6** ($3 / $15 per Mtok) for parsing, vision, and reviews.
- Haiku 4.5 ($1 / $5) kept as an optional later optimization for trivial text parsing.
- **Prompt caching** on the stable system prompt (food rules, schema) — ~90% saving on that prefix.

At ~10–20 messages/day across a few users: roughly **$1–3/month**. The user still gets an
"agent-like" Telegram experience (natural messages, lookups, reasoning) without the cost.

---

## 6. Database

PostgreSQL runs as a **Coolify-managed resource on the user's own Hetzner server**. No
external free tier, so no pause/row/bandwidth caps, and sensitive body/progress data stays
on infrastructure the user controls. It is a tiny, single-purpose DB (kilobytes/day).

**Tuning (because the box is RAM-tight):**
- `shared_buffers = 64MB`
- `max_connections = 20` (Prisma pools; bot needs only a few)
- `work_mem = 4MB`, `effective_cache_size = 128MB`
- Container hard memory limit: **256 MB** (see §7)

**Backups:** Coolify scheduled Postgres dump → existing S3 Storage target. This is the only
copy — set up from day one.

### Multi-tenancy
- `users` keyed on Telegram `chat_id` (that *is* the auth — no passwords).
- Every domain row carries `user_id`; the service layer enforces the filter (no RLS needed,
  only our backend touches the DB).

### Tables (sketch — finalize in Prisma schema)
- **users**: id, chat_id, name, age, sex, height_cm, activity, goal, tz,
  target_kcal, target_protein_g, target_fat_g, target_carbs_g, created_at
- **food_database**: id, name, per (100g/100ml/portion/piece/dish), kcal, protein_g,
  fat_g, carbs_g, user_id (nullable = global), created_by, created_at
- **food_log**: id, user_id, date, meal, entry_name, qty, unit, kcal, protein_g,
  fat_g, carbs_g, source (fact/estimate), food_db_id (nullable), created_at
- **body_metrics**: id, user_id, date, weight_kg, waist_cm, chest_cm, hips_cm,
  bicep_cm, thigh_cm, conditions (free text), created_at
- **progress_notes**: id, user_id, date, observations (text), created_at  *(no image)*
- **reviews**: id, user_id, period (daily/weekly/monthly), period_start, period_end,
  body (text), reviewed_flag, created_at
- **notion_sync**: id, source_table, source_id, notion_page_id, status, attempts, last_error
- **notion_config**: user_id, auth_type ('env'|'oauth'), credential_ref, db_foodlog_id,
  db_reviews_id, db_metrics_id, db_fooddb_id, enabled  *(see §9; only 'env' in v1)*
- **open_questions**: id, user_id, question_type, draft_payload (jsonb), created_at,
  expires_at  *(ephemeral; see §8.0 — resolves the next reply, expires in minutes)*

> "Daily totals only from a SUM query/view, never hand-summed in chat" is a **behavioral
> rule** for the bot's responses, enforced in prompt + code — not a schema concern.

---

## 7. Hosting — Coolify on existing Hetzner box

Reusing the user's existing Hetzner + Coolify (v4.1.2) server, which already runs a
separate `crypto-bot` project (backend, frontend, Redis, MySQL). The nutrition bot goes in
a **new, dedicated Coolify project** (`nutrition-bot` → `production`) — separate containers,
network, and env vars. Marginal hosting cost ~$0.

### Box reality (measured, 8-day uptime)
- CPU: load ~0.37 on 2 cores (~18%) — 🟢 idle, tons of headroom
- Disk: 13 G / 38 G used, 24 G free — 🟢 plenty
- RAM: 3.7 GiB total, 1.9 GiB used, ~1.8 GiB available (1.4 GiB reclaimable cache) — 🟡 tight
- Swap: 1.3 GiB of 4 GiB already in use — 🟡 **RAM is the binding constraint**

### Mandatory guardrails (so the bot can NEVER OOM-kill the crypto-bot's mysqld)
The Linux OOM killer ignores project boundaries — under memory pressure it kills whatever
process it picks. Logical isolation is real; physical RAM contention is not. Therefore:

1. **Hard memory caps** (Coolify → resource → Resource Limits):
    - Bot app: **512 MB** (idles ~80 MB; cap is a runaway fuse)
    - Postgres: **256 MB**
      With caps set, worst case is the bot or its DB is killed/restarted — mysqld stays up.
2. **Build OFF the box.** GitHub Actions builds the image, pushes to GHCR; Coolify only
   **pulls and runs**. No `npm install`/`tsc` on the box = no build-time RAM spike. Use a
   **multi-stage Dockerfile** so only the slim runtime ships.
3. **Tune Postgres down** (see §6).

### Deployment shape
- **1 Application** resource (the bot: long-poll receiver + worker + cron, one Node process)
- **1 PostgreSQL** resource
- No frontend in v1 (add a web dashboard later if wanted)
- Telegram delivery via **long-polling** (`getUpdates`) — see [ADR-0014](./adr/0014-long-polling-over-webhook.md);
  no public domain/TLS needed. The app exposes `PORT` only for an internal `/health` probe.

---

## 8. Core Flows

### 8.0 Message routing, context & date handling (applies to every inbound message)

**Memory model: the database is the memory.** Facts and totals are never reconstructed from
chat history — they come from queries (e.g. "сколько сегодня?" → `SELECT ... WHERE date=today`).
This honors the project rule: totals come from the SUM, never from re-reading the conversation.

**Message router (first job on every message).** A single Sonnet parse call classifies the
message and extracts structured data in one shot (no extra cost):
- `log` — a food entry to record
- `query` — a question to answer from the DB ("сколько белка сегодня?")
- `metric` — a Body Metric
- `review_trigger` — "готово на сегодня" / `/done`
- `correction` — fixes the last entry ("нет, 300г не 200")
- `answer` — a reply to a pending open question (only if one is pending; see below)

**Which date a row belongs to.**
- Default: the user's **current local date** (timezone, default Europe/Kyiv).
- Override when the message contains a time reference ("вчера", "yesterday", "утром вчера")
  → the parser back-dates the row accordingly.
- After-midnight edge: **deferred** — for now the row takes the message-arrival local date;
  "вчера" override covers late-night cases manually. (Per-user cutoff can be added later.)
- Consequence: a review for a day pulls `WHERE date = that_day`, so it contains **only** the
  dishes logged *to* that day. A "вчера" entry lands in yesterday's review, not today's.

**Log by default; ask only when it materially matters.**
- The bot logs its best result by default. The `estimate` source tag is the pressure-release
  valve — small uncertainty is logged as an estimate (±20–30%), not interrogated.
- The bot asks a clarifying question only when the difference **materially** changes macros
  and can't be resolved confidently: ambiguous product variant (творог 0/5/9% fat),
  unknown portion, multiple Food Database matches, unidentifiable photo component.
- Don't ask when the message is already complete ("200г куриного филе"), a clean Food Database
  match, or when an estimate is good enough.

**Open-question mechanic (ephemeral context).**
- When the bot asks, it stores a tiny per-user **open question**: what's being asked + the
  half-built draft entry waiting on the answer.
- The next message is interpreted as an **answer** only while a question is pending; it
  resolves the draft, logs it, and clears the open question.
- Open questions **expire after a few minutes** (abandoned questions don't haunt the user).
- No chat history is sent to the model — just the open question + the user's reply.

**Disambiguation UI.** Use **Telegram inline keyboard buttons** for fixed-choice questions
("Куриное филе Сільпо / Свинина / Другое") — tap-to-answer, nicer on mobile, no answer-parsing
ambiguity. Fall back to free text when the answer isn't a small fixed set ("сколько грамм?").

### 8.1 Onboarding (`/start`)
1. Unknown `chat_id` → create `users` row.
2. Collect: age, sex, height (cm), weight (kg), goal (cut/maintain/lean-bulk),
   activity level, timezone (default `Europe/Kyiv`).
3. Compute targets: Mifflin–St Jeor BMR → TDEE × activity → goal-adjusted kcal
   (**no extreme deficits**), protein 1.8–2.2 g/kg, fat ~0.8 g/kg floor, carbs = remainder.
4. Save targets; confirm.

### 8.2 Log food by text
1. Parse qty + product (Sonnet, structured output) from terse RU/UA/EN shorthand.
2. Search **Food Database**: match → Food Database macros × portion (× `per`), `source = fact`;
   no match → estimate, `source = estimate`, offer to add to the Food Database.
3. Infer meal type if not given; INSERT into **Food Log** for today (user TZ).
4. Confirm. **Never hand-sum daily totals in chat** — totals come from a SUM query only.

### 8.3 Log food by photo (plate)
1. Stream image bytes → Sonnet vision (1 call) → structured items + macro estimates.
2. Caption naming a Food Database product → prefer Food Database macros (fact) over visual estimate.
3. Visual-only items marked `estimate` (±20–30%); INSERT; confirm.
4. **Image discarded immediately** — never written to disk/storage.

### 8.4 Body metrics
1. Parse ("вес 89.2", "талия 90, грудь 105") → INSERT into **Body Metrics**.
2. Diffs compare **like-with-like vs the most recent prior entry** (trend > point).
3. On Reviews, check when each Body Metric was last logged and remind: weight ~weekly,
   tape ~biweekly, progress photo ~2–4 weeks.

### 8.5 Progress photo (body)
1. Via `/progress` flow or caption `прогресс`.
2. Stream to Sonnet vision → qualitative observations (key marker: **belly in profile**).
   Not a diagnosis, not a precise body-fat %.
3. Save **text observations only**; discard image.

### 8.6 Reviews
- **Manual trigger**: "готово на сегодня" / `/done` → generate today's review now, mark reviewed.
- **Auto-fallback**: cron at user's local midnight → if not reviewed, generate it.
- After a daily review, check the date (user TZ):
    - **Sunday** → also generate **weekly** from the 7 dailies.
    - **Last day of month** → also generate **monthly** from that month's weeklies.
- Guard with `reviewed_flag` per (user, date) to prevent double-generation.
- Reviews follow the templates in [review-templates.md](./review-templates.md) (numbers from
  code, prose from the model); saved to **Reviews** + mirrored to Notion.

---

## 9. Notion Mirror (nice-to-have, from day one)

**Principle: Postgres is source of truth. Notion is best-effort and async.**

- Each successful Postgres write enqueues a Notion sync job.
- A background worker writes the Notion page (respecting Notion's ~3 req/sec limit).
- User is confirmed the moment **Postgres** succeeds — Notion never blocks the reply.
- Failed Notion writes retry with backoff; failure never loses data (safe in Postgres).
- Feature-flagged per user; can be turned off without touching the core loop.

### Ownership model: separate Notion per user (privacy-first)
Each user's data mirrors into **their own** Notion workspace, not a shared one. This is the
scalable, privacy-respecting model and is the chosen long-term direction.

- **Today (single user = owner):** one internal **integration token**, held in the bot's
  **env config** (`NOTION_TOKEN`), never stored in the DB. The owner's four database IDs
  also live in env. Mirror enabled.
- **Future (other users):** **Notion OAuth** — each user grants access to their own
  workspace; their data mirrors there. Not built now; the schema is shaped so it slots in
  without touching any write path.

### Per-user config (built now, even though only the owner exists)
```
notion_config
  user_id        FK
  auth_type      'env' (owner) | 'oauth' (future)   // only 'env' implemented in v1
  credential_ref env var name (e.g. 'NOTION_TOKEN') | oauth token id   // never the raw secret
  db_foodlog_id  per-user database IDs (owner's come from env today)
  db_reviews_id
  db_metrics_id
  db_fooddb_id
  enabled        bool (owner: true; future users default false until connected)
```

A **`NotionCredentialResolver`** reads `auth_type` and returns a ready Notion client.
v1 implements only the `'env'` branch. Opening up to others = add the `'oauth'` branch +
an OAuth onboarding flow; **the mirror worker and all write paths stay unchanged.**

### Credential handling (safety)
- The bot uses a **direct Notion API client with an integration token**, not MCP, as its
  write path (simpler/more reliable for an always-on service).
- The **owner** creates the integration in their own Notion settings, generates the token,
  and shares the Food Log / Reviews / Body Metrics / Food Database pages with it. The token
  goes into the bot's **env**; it is never hardcoded and never stored as plaintext in the DB.

---

## 10. Language & Privacy

- **Bot replies** in whatever language the user writes (RU / UA / EN / mixed), mirroring them.
- **Database fields, enum values, stored structural content stay English**
  (`meal: "lunch"`, `source: "estimate"`).
- **Review prose** written in the user's language for readability; structural fields English.
- Food and progress photos are **never persisted by us** — streamed to the model, discarded.
  (Telegram retains the file on *its* servers per its own lifecycle — outside our control.)
- Body/progress data is sensitive; keep DB access tight, avoid verbose logging of raw values.

---

## 11. Open questions / decisions pending
*(Mirrored in [prd.md](./prd.md) §11 — keep in sync.)*
1. **Food Database sharing** — confirm: shared global Food Database + per-user additions (assumed yes).
2. **Onboarding fields** — is sex + activity level OK to ask, or keep onboarding shorter?
3. **Review template** — provide the exact template text from the original project to reproduce formatting.
4. **GHCR vs another registry** — GitHub Container Registry assumed for CI builds; confirm or name another.

---

## 12. Suggested build order
1. Repo skeleton (plain TS + grammY) + long-poll + `/start` echo + multi-stage Dockerfile.
2. GitHub Actions → GHCR pipeline; Coolify project + app pulling the image; prove the pipe.
3. PostgreSQL resource in Coolify (capped + tuned); Prisma schema + migrations + connection.
4. Onboarding flow + target calculation.
5. Food logging by text (parse → Food Database lookup → Food Log).
6. Food Database add/lookup.
7. Photo logging (vision pipeline, ephemeral).
8. Body metrics + trend diffs.
9. Progress photo notes.
10. Reviews (manual + cron fallback + weekly/monthly rollups).
11. Notion async mirror.
12. Hardening: error handling, retries, rate-limit handling, prompt caching, memory-cap verification.