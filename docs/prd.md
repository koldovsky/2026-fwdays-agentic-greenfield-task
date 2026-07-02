# Sport & Nutrition Coach — Product Requirements (PRD)

*Version 1.0 · Last updated: 2026-06-28 · Status: ready to build*
*Owner: Ihor Volchkov · Related: [requirements.md](./requirements.md) (architecture), [review-templates.md](./review-templates.md) (review output specs)*

---

## 1. Problem

Cutting (fat loss without muscle loss) lives or dies on two daily habits: **logging what you
eat** and **acting on the trend**. Existing tools fail one of them:

- **Macro apps** (MyFitnessPal etc.) demand structured input — search, pick portion, tap.
  Friction kills logging within weeks.
- **Notion / spreadsheets** are flexible but do no math and give no feedback. You log into a
  void.
- The user's prior **Notion-based coaching project** had the right structure and review
  discipline but required manual data entry and manual review writing.

There is no tool where you just **say** "200г куриного филе" or **send a photo of the plate**
and get correct macros, a running daily total, and an honest weekly verdict — in your own
language, on the device you already message on.

## 2. Solution (one line)

A **Telegram bot** that turns natural messages and plate photos into logged macros, keeps a
database as the single source of truth, and produces honest daily / weekly / monthly reviews —
acting like a personal cutting coach.

## 3. Goals & Non-Goals

### Goals
- **G1 — Frictionless logging.** Log a meal in one message (text or photo), no forms.
- **G2 — Trustworthy numbers.** Daily/period totals always come from the database SUM, never
  from the model re-reading chat. Food Database matches are fact; the rest is a flagged estimate.
- **G3 — Coaching, not bookkeeping.** Reviews give an honest verdict and concrete next action,
  not a pat on the back.
- **G4 — Predictable cost & footprint.** Runs at ~$1–3/month on existing hardware without
  threatening the box's other workloads.
- **G5 — Privacy by default.** Body/progress photos are never persisted; sensitive data stays
  on infrastructure the user controls.

### Non-Goals (v1)
- Not a social/sharing app, not a meal planner, not a recipe generator.
- No food-exclusions filter, supplements, cardio/steps escalation, or training log (ported later).
- No image persistence of any kind.
- No web dashboard (Telegram is the only surface in v1).
- Not an autonomous agent — operations are deterministic single LLM calls (see requirements §5).

## 4. Success Metrics

The product is working if, for the active user(s):

| # | Metric | Target |
|---|---|---|
| M1 | Logging friction | ≥ 90% of meals logged in a **single** message (no clarifying round-trip) |
| M2 | Macro accuracy | Food Database matches exact; photo/text estimates within **±20–30%** |
| M3 | Number integrity | **0** instances of a daily/period total disagreeing with the DB SUM |
| M4 | Review reliability | **100%** of days get a review (manual trigger or midnight fallback), no doubles |
| M5 | Cost | Anthropic spend ≤ **$3/month** at ~10–20 msgs/day across a few users |
| M6 | Footprint | Bot RSS ≤ **512 MB** cap, Postgres ≤ **256 MB** cap; crypto-bot mysqld never OOM-killed |
| M7 | Reply latency | Text log confirmed in **< 3 s**, photo log in **< 8 s** (p90) |
| M8 | Durability | **0** logged entries lost; Notion mirror failures never lose data (Postgres is truth) |

## 5. Target Users

- **Primary — "the owner" (v1):** a single experienced cutter (the developer) who wants
  effortless logging + honest weekly coaching, and owns the hosting and Notion workspace.
- **Secondary — "a handful of friends" (v1):** multi-user from day one, keyed on Telegram
  `chat_id` (the chat *is* the auth). They log and get reviews; Notion mirror off until they
  connect their own workspace.
- **Future:** other users via Notion OAuth into their own workspaces (schema shaped for it now;
  not built in v1).

All users write in **RU / UA / EN / mixed**; the bot mirrors their language.

## 6. User Stories & Acceptance Criteria

Each story is testable; acceptance criteria double as eval/test targets.

### 6.1 Onboarding — *"Set me up as a coach client."*
- **US-1:** As a new user, I send `/start` and answer a few questions, so the bot can compute
  my targets.
- **Accept:** Unknown `chat_id` → `users` row created. Collects age, sex, height, weight, goal,
  activity, timezone (default `Europe/Kyiv`). Computes targets via Mifflin–St Jeor → TDEE ×
  activity → goal-adjusted kcal (**no extreme deficits**), protein 1.8–2.2 g/kg, fat ≥ 0.8 g/kg,
  carbs = remainder. Confirms targets back to the user.

### 6.2 Log food by text — *"Just let me type what I ate."*
- **US-2:** As a user, I send "запиши 200г куриного филе" and it's logged with correct macros.
- **Accept:** Parser extracts qty + product from terse RU/UA/EN. Food Database match → macros ×
  portion, `source=fact`. No match → estimate, `source=estimate`, offer to add to the Food Database. Meal
  type inferred if absent. Row inserted for the correct date (user TZ). Confirmation **never**
  hand-sums the day — totals come from a SUM query only.

### 6.3 Log food by photo — *"Here's a photo of my plate (or the label)."*
- **US-3:** As a user, I send a plate photo **or a nutrition-facts / КБЖУ label** (optionally
  several photos at once) with a caption of what I ate, and get itemized macros.
- **Accept:** All photos of one message stream to vision in **exactly 1 call** (a Telegram media
  group buffers to a single call). When a caption is present it is the **authoritative item list** —
  one item per caption entry, so text-only items with no photo (sugar, black coffee) are **kept, not
  dropped**. Per item: macros read from a printed label → `source=fact` (label > Food Database >
  visual precedence, not overridden by a catalog match); a Food Database name match → `fact`; a
  visual-only guess → `estimate` (±20–30%). Rows inserted; confirmed. **Image(s) discarded
  immediately — never written to disk/storage.**

### 6.4 Ask the database — *"How much have I had today?"*
- **US-4:** As a user, I ask "сколько белка сегодня?" and get the real number.
- **Accept:** Answer comes from `SELECT … WHERE date=today`, never reconstructed from chat. DB
  is the memory.

### 6.5 Correct an entry — *"No, that was 300g not 200."*
- **US-5:** As a user, I correct my last entry and the DB updates.
- **Accept:** Router classifies as `correction`; the last relevant entry is updated; confirmation
  reflects the corrected value.

### 6.6 Clarify only when it matters — *"Don't interrogate me."*
- **US-6:** As a user, I'm asked a question only when it materially changes macros.
- **Accept:** Bot logs its best result by default (estimate tag is the pressure valve). Asks only
  on material ambiguity (e.g. творог 0/5/9% fat, unknown portion, multiple Food Database matches,
  unidentifiable photo component). Uses **inline keyboard** for fixed choices, free text
  otherwise. The open question is **ephemeral** (expires in minutes); the next message resolves
  it; no chat history is sent to the model.

### 6.7 Log body metrics — *"вес 89.2, талия 90."*
- **US-7:** As a user, I log Body Metrics and see trend-aware diffs.
- **Accept:** Parsed into `body_metrics`. Diffs compare **like-with-like vs the most recent prior
  entry**, not vs the start. Reviews remind on stale Body Metrics (weight ~weekly, tape
  ~biweekly, progress photo ~2–4 weeks).

### 6.8 Progress photo — *"Here's my progress pic."*
- **US-8:** As a user, I send a body photo and get qualitative observations.
- **Accept:** Via `/progress` or caption `прогресс`. Vision → qualitative notes (key marker:
  **belly in profile**); not a diagnosis or precise body-fat %. **Only text observations saved;
  image discarded.**

### 6.9 Reviews — *"Готово на сегодня."*
- **US-9:** As a user, I close out my day and get an honest review; weeks and months roll up
  automatically.
- **Accept:** Manual trigger ("готово на сегодня" / `/done`) generates today's review and marks
  it reviewed. Midnight cron fallback generates it if not reviewed. After a daily review:
  **Sunday** also generates the **weekly** (from 7 dailies); **last day of month** also generates
  the **monthly** (from that month's weeklies). `reviewed_flag` per (user, date) prevents doubles.
  Output follows [review-templates.md](./review-templates.md); numbers from code, prose from model.

### 6.10 Notion mirror — *"Keep my Notion in sync."*
- **US-10:** As the owner, my data also appears in my Notion workspace, without slowing the bot.
- **Accept:** Each successful Postgres write enqueues a Notion sync job. Background worker writes
  the page (respecting ~3 req/s). User is confirmed the instant **Postgres** succeeds — Notion
  never blocks. Failures retry with backoff and never lose data. Feature-flagged per user.

## 7. Functional Requirements (summary)

The bot MUST:
- **FR-1** Route every inbound message via one classifying LLM call into: `log`, `query`,
  `metric`, `review_trigger`, `correction`, `answer` (see requirements §8.0).
- **FR-2** Treat the **database as memory**; never reconstruct facts/totals from chat history.
- **FR-3** Tag every food entry `source = fact | estimate` and surface estimates honestly.
- **FR-4** Resolve each row to the correct date (user TZ; honor "вчера"/"yesterday" overrides).
- **FR-5** Mirror the user's language in prose; keep DB fields/enums in English.
- **FR-6** Never persist food or body images.
- **FR-7** Generate daily/weekly/monthly reviews per templates with numbers computed in code.

Full behavioral detail lives in **requirements.md §8** (Core Flows). This PRD owns the *what
and why*; requirements.md owns the *how*.

## 8. Non-Functional Requirements

- **Cost:** ≤ $3/month (Anthropic only); raw API + tool-use/structured output, no agent loop;
  prompt caching on the stable system prefix.
- **Footprint:** bot ≤ 512 MB, Postgres ≤ 256 MB hard caps; builds happen **off the box** (CI →
  GHCR; Coolify pulls). Must never OOM-kill the co-resident crypto-bot's mysqld.
- **Latency:** see M7.
- **Reliability:** Postgres is source of truth; Notion async + best-effort; midnight cron
  guarantees a review exists for every day.
- **Privacy/security:** images never stored; Notion token in env only (never in DB plaintext);
  tight DB access; avoid logging raw body values.
- **Availability:** single Node process (long-poll + worker + cron); Coolify restart on crash.

## 9. Release Plan

Maps to **requirements.md §12 (build order)**. Milestone gates:

| Milestone | Delivers | Done when |
|---|---|---|
| **M0 — Pipe** | Repo skeleton, long-poll, `/start` echo, multi-stage Dockerfile, CI→GHCR, Coolify pull | A message round-trips through the deployed bot |
| **M1 — Data** | Postgres (capped+tuned), Prisma schema + migrations | App reads/writes the DB on the box |
| **M2 — Onboarding** | `/start` flow + target calculation | US-1 passes |
| **M3 — Core logging** | Text log + Food Database lookup/add | US-2, US-4, US-5, US-6 pass |
| **M4 — Vision** | Photo plate logging (ephemeral) | US-3 passes |
| **M5 — Body** | Metrics + trend diffs; progress notes | US-7, US-8 pass |
| **M6 — Reviews** | Daily + cron fallback + weekly/monthly rollups | US-9 passes |
| **M7 — Mirror** | Notion async mirror | US-10 passes |
| **M8 — Hardening** | Retries, rate-limit handling, prompt caching, memory-cap verification | All success metrics (§4) verified |

**MVP = M0–M6** (a usable coach without Notion). M7–M8 are fast-follow.

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OOM killer takes down the crypto-bot | High | Hard memory caps on bot+PG; build off-box; tune PG down |
| LLM hallucinates totals | High (trust) | Numbers always from SQL; model writes prose only |
| Estimate accuracy disappoints | Medium | Honest `estimate` tag ±20–30%; Food-Database-first; "add to the Food Database" loop improves over time |
| Anthropic cost creep | Medium | No agent loop; single calls; prompt caching; Haiku fallback option |
| Notion API flakiness | Low | Async, best-effort, retry w/ backoff; never blocks; data safe in Postgres |
| After-midnight logging ambiguity | Low | Deferred; "вчера" override covers it; per-user cutoff later |

## 11. Open Questions

(Resolve before/while building; tracked in requirements §11.)
1. **Food Database sharing** — confirm shared global Food Database + per-user additions (assumed yes).
2. **Onboarding length** — keep sex + activity, or shorten?
3. **Review template fidelity** — exact source-project template captured in review-templates.md;
   confirm it matches the original prose/format.
4. **Registry** — GHCR assumed for CI builds; confirm.

## 12. Out of Scope — see §3 Non-Goals.
