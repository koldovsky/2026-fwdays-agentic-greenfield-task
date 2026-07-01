# Current State — Sport & Nutrition Coach

*Last updated: 2026-07-01 · by: Ihor + agent · Update rule: see bottom*

<!-- correction (M3, wave 4) landed 2026-07-01: in-place edit of the last food_log entry -->
<!-- shared-lang (M3, wave 4, tech debt) landed 2026-07-01: extracted src/util/lang.ts, deduped 3 detectLang copies; filed shared-fmt follow-up -->
<!-- shared-fmt (M3, wave 4, tech debt) landed 2026-07-01: extracted src/util/num.ts (fmt), deduped 3 copies; shared-lang sibling closed -->
<!-- clarify (US-6, M3, wave 4) landed 2026-07-01: precision-first Open Question mechanic (ephemeral in-memory store ADR-0019, ask-vs-log decision, resolve/expiry-fallback); unblocked after 2 review rounds (C1 disambiguation + invariant-#6 language); extracted src/util/num.ts DECIMAL_SOURCE -->
<!-- food-photo (US-3, M4, wave 4) landed 2026-07-01: plate photo → ONE vision call (seam extended with optional image block, invariant #5) → multi-item extraction → batched Food-DB lookup (fact-vs-estimate per item, no N+1) → one code-scaled food_log row per item → multi-item confirmation; image base64 in memory only, never persisted (invariant #4, CRITICAL fs-spy test); interactive plate ask split to food-photo-ask (image discarded, needs text-only refine) -->
<!-- food-photo-ask (US-3/US-6, M4, wave 5) landed 2026-07-01: precision-first plate ask — vision flags one hidden high-leverage mover via an optional plate-level `clarify` on the SAME one call (invariant #5); OpenQuestion becomes a discriminated union on `variant` (text | photo), photo variant holds ResolvedFood[] + clarification + meal/date, NO image (invariant #4); logPhoto → LogOutcome; the answer refines the held items via ONE text-only refinePlate call (no re-vision, no chat history — invariants #1/#4) → resolvePlate re-tag fact/estimate → one code-scaled row per item (an added mover comes back as its OWN item so a fact item's calories survive); expiry logs EVERY held item AS-IS preserving each resolved source (fact stays fact — invariant #3, never drops); caption stored as the confirmation language anchor (text only, invariant #4 unbroken); bot handlePhoto gains the ask branch (reuses store + q:<index> UI); tests 233 total -->


Living snapshot of where the **whole project** is right now. Read at session start; update at
session end or after meaningful progress. This is the cross-cutting status — per-change specs and
tasks live in `openspec/`; product/architecture intent lives in `docs/`. The dependency-ordered
**change backlog** (what the impl loop runs next) lives in [openspec/backlog.md](../openspec/backlog.md).

## TL;DR
**M0 `pipe` + M1 `data` + M2 `onboarding` + M3 `router` (FR-1) + M3 `coach-persona` + M3 `food-text` + M5 `metrics` code-complete locally.** `pipe`:
grammY long-poll skeleton, zod config, `/health`, Dockerfile, CI→GHCR. `data`: Prisma schema (5 core
tables), migration, pooled client, `user_id` tenancy helper, `migrate deploy` + `$connect` at startup.
`router`: Anthropic client seam (Sonnet 4.6, single call, temp 0, cached prefix, **no agent loop**),
6-intent classifier, date-resolved-in-code (TZ back-dating), eval framework (runner + key-less
ratchet + 18-case dataset). `onboarding`: `/start` Q&A → DB-backed state machine (ADR-0016, the DB
*is* the state — resumes after restart) → Mifflin–St Jeor targets in code (no LLM, no-extreme-deficit
floor), inline-keyboard choices + validated numeric free text, weight → `body_metrics`. `coach-persona`:
honest non-moralizing voice + precision-first clarification policy in the shared cached prefix
(ADR-0015), plus the first **LLM judge-eval** path (rubric grader, CRITICAL gating, double-judge on
borderline — ADR-0013) seeded with `coach-persona-tone`. `food-text`: act on the `log` intent — parse
→ Food DB fact / one-call LLM estimate → `reconcileQty` (qty/basis reconciliation) → code-scaled
`food_log` write → honest confirmation + add-to-catalog (US-2), with a deterministic `food-scale`
eval. `metrics`: deterministic body-metrics parse → upsert one row/day → like-with-like trend diffs,
zero LLM calls (US-7). `query`: DB-as-memory — answer a nutrition question from a tenant-scoped
`food_log` SUM → totals vs goal, zero LLM calls (US-4). `correction`: act on the `correction` intent
— update the user's most recent `food_log` row **in place** (quantity-only rescales the row's own basis
in code, **zero** LLM calls; a named product re-resolves through the same `resolveFood` pipeline, ≤1
call), tenant-scoped, honest confirmation (US-5). `shared-lang`: extracted `src/util/lang.ts` (one home for
`detectLang`/`Lang`/Cyrillic regexes), deduped 3 verbatim copies (rule #12), no behavior change.
`shared-fmt`: extracted `src/util/num.ts` (one home for the `fmt` trailing-`.0` trim), deduped the
sibling 3-copy triple (rule #12), no behavior change. `clarify`: precision-first **Open Question**
mechanic (US-6) — `src/clarify/` (ephemeral in-memory store ADR-0019, `decideAskOrLog`, question
shaping, answer resolve, expiry-fallback); `logFood` returns a discriminated `LogOutcome`; asks one
batched question only on a hidden high-leverage mover (estimate `clarify` field) or multiple Food-DB
matches, else logs directly; the answer routes by the stored `Clarification.kind` (quantity rescale =
0 calls, descriptor re-resolve ≤1, disambiguation select-by-id = a `fact`), no chat history to the
model (invariant #1), tenant-scoped write (#8), language-mirrored prose (#6).
197 tests green; all gates + a **two-round** maker≠checker review passed (round 1: C1 disambiguation
non-functional; round 2: invariant-#6 language on the resolved-answer confirmation). Remaining: the
**human deploy** + the live LLM/eval run incl. seeding the tone-eval + clarify-discrimination
baselines (need `ANTHROPIC_API_KEY` + egress).

## Milestone status *(milestones defined in [prd.md](./prd.md) §9)*
| Milestone | State |
|---|---|
| M0 — Pipe (skeleton, long-poll, Dockerfile, CI→GHCR, Coolify) | 🟡 in progress (provision ✅; `pipe` code-complete + archived; **deploy round-trip pending human**) |
| M1 — Data (Postgres capped+tuned, Prisma schema+migrations) | 🟡 code-complete + archived; on-box migrate/read-write pending human deploy |
| M2 — Onboarding (`/start` + targets) | 🟡 code-complete + archived; on-box verify pending human deploy |
| M3 — Core logging (text + Food DB) | 🟡 router (FR-1) + LLM-client seam + eval framework + coach-persona + **food-text** + **query** + **correction** + **clarify** (US-6: precision-first Open Question — ask-vs-log, ephemeral store, resolve/expiry-fallback) landed; food-photo (M4) next voice surface |
| M4 — Vision (photo plate) | 🟡 **food-photo** + **food-photo-ask** landed (US-3: 1 vision call → multi-item, fact-vs-estimate, one row/item, image never persisted; precision-first plate ask — vision flags one hidden mover, photo-variant Open Question, ONE text-only refine on the answer, expiry logs all as estimate); `progress-photo` next; on-box vision-accuracy eval deferred (needs labeled image set + key) |
| M5 — Body (metrics + progress notes) | 🟡 **metrics** landed (parse body metrics → upsert one row/day → like-with-like trend diffs); progress-photo next |
| M6 — Reviews (daily + cron + rollups) | ⬜ not started |
| M7 — Notion mirror | ⬜ not started |
| M8 — Hardening | ⬜ not started |

Legend: ⬜ not started · 🟡 in progress · ✅ done

## Done
- Product/architecture docs: `docs/prd.md`, `docs/requirements.md`, `docs/review-templates.md`.
- Decision records: `docs/adr/` (0001–0018). Latest: **ADR-0018** run-backlog model tiering (Opus·high
  for every reasoning/impl loop phase, Haiku only for mechanical steps; amends ADR-0012 — dev-loop only,
  not the bot's Sonnet 4.6 runtime). **ADR-0017** dropped `temperature` from the LLM seam. **ADR-0016**
  DB-backed onboarding state machine (resume-after-restart, no chat state). **ADR-0015** coach persona
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
- **M3 `food-text`** — first food-track slice (US-2): acts on the router's `log` intent. `src/food/`
  resolves a terse RU/UA/EN item to a unified `ResolvedFood` — a Food DB hit (own + global catalog via
  `catalogWhere`) is `source: fact` with **zero** LLM calls; a miss is **one** `parseStructured`
  estimate (`source: estimate`, no agent loop). `reconcileQty` maps the router's raw qty+unit onto the
  resolved `per` basis (missing qty → one serving, weight-vs-count mismatch clamped — no "200 dishes"),
  then macros are **scaled in code** (`scaleFactor`/`scaleMacros`, kcal Int) and written to one
  tenant-scoped `food_log` row (`tenantWhere`). Meal inferred from the user-TZ clock (no LLM).
  Confirmation shows the row's OWN numbers + honest source tag (never a daily SUM), prose mirrors
  language, enums stay English. Estimate path offers an inline `food:addfdb:<id>` button →
  `saveLoggedFoodToCatalog` reconstructs the per-basis macros into a user-owned Food DB row; reply
  localized off the row's entryName. 92 tests green (+ deterministic `food-scale` eval, key-less).
  Reviewer-resolved (two MAJOR scaling fixes). Live estimate/parse eval cases are deploy-time (no key).
- **M5 `metrics`** — first body-track slice (US-7): acts on the router's `metric` intent. `src/metrics/`
  parses terse RU/UA/EN body measurements (вес/талия/грудь/бедра/бицепс/бедро + UA/EN synonyms) into the
  six `body_metrics` columns via a **deterministic** word-boundary-anchored keyword parser — **zero LLM
  calls** (invariant #5). Upserts ONE tenant-scoped row per (user, date) (merges same-day fields, never
  nulls an unmentioned one), then computes **like-with-like** trend deltas: each field diffed in code
  against its own most-recent-prior entry (`date < D`, never vs the start, never cross-metric) from a
  single bounded history fetch (no N+1). Confirmation is code-built (values + signed ↑/↓ deltas + prior
  date), prose mirrors language, columns stay English. `metricStaleness` exposed for the future
  `reviews`. 121 tests green (+28). Opus reviewer → CLEAN; resolved 3 MINOR parser false-positives
  (word-boundary fix). Deterministic — no eval suite (unit-tested).
- **M3 `query`** — the read side of US-4 and the literal embodiment of **invariant #1 (the DB is the
  memory)**: acts on the router's `query` intent. `src/query/` answers a nutrition question for the
  resolved date (incl. `вчера`) from a **single tenant-scoped `food_log` SUM** (`aggregate({_sum})` —
  never a row-fetch + JS reduce, invariant #2). The asked nutrient is resolved by a deterministic
  RU/UA/EN keyword parser anchored at **both** ends (`(?<!\p{L})…(?!\p{L})` — "fat" matches but not
  "fate"/"carbon"); no keyword → full breakdown. **Zero LLM calls** (#5). The answer is code-rendered —
  `logged of goal (remaining)` when `users.target_*` is set (remaining floored at 0), bare total
  otherwise; an empty day answers honestly ("nothing logged"), never a misleading `0`. Prose mirrors
  language, fields stay English. 149 tests green (+28). Opus reviewer → CLEAN (no findings).
  Deterministic — no eval suite (unit-tested).
- **M3 `correction`** (wave 4, US-5) — acts on the router's `correction` intent: updates the acting
  user's **most recent** `food_log` row **in place** (never inserts). Quantity-only recovers the row's
  own per-basis and rescales in code (`base × factor`, **zero** LLM calls, invariant #2/#5); a named
  product re-resolves through the same `resolveFood` pipeline logging uses (Food DB hit → `fact`, miss →
  **one** structured estimate, no loop). Read (`findLastFoodLog`, `id DESC`) and write (`updateFoodLog`,
  `updateMany`) both go through `tenantWhere` — another user's row can never be touched (invariant #8).
  Confirmation reuses the food-text builder (`buildCorrectionConfirmation`), mirrors language, keeps
  enums English, offers add-to-catalog when the correction lands on an estimate. Extracted `foodLogValues`
  (one home for the `resolved → row` scale+mapping, shared by insert/update) + `resolveUserId` (deduped
  the service preamble). 162 tests green (+13). Opus reviewer → resolved 1 dup WARNING + 1 coverage
  SUGGESTION (two-user isolation test). Deterministic core — no eval suite.
- **M3 `shared-lang`** (wave 4, tech debt, no US) — extracted `src/util/lang.ts` (`export detectLang`,
  `export type Lang`; `UK_CHARS`/`CYRILLIC` regexes module-private) and repointed `src/food/confirm.ts`,
  `src/metrics/confirm.ts`, `src/query/answer.ts` to it, deleting the 3 verbatim copies (backend-conventions
  rule #12; canonical dup surfaced by the run-backlog step-7 gate). **No behavior change** — food/metrics/
  query suites stay green; added `test/util/lang.test.ts` (uk via `іїєґ`, ru via `а-яё`, en default, mixed
  precedence). 166 tests green (+4). Opus reviewer → CLEAN (0 findings). The step-7 scan also surfaced a
  sibling `fmt` triple-copy → filed **`shared-fmt`** follow-up (out of scope here).
- **M3 `shared-fmt`** (wave 4, tech debt, no US) — extracted `src/util/num.ts` (`export fmt`, the
  trailing-`.0` trim) and repointed `src/food/confirm.ts`, `src/metrics/confirm.ts`, `src/query/answer.ts`
  to it, deleting the 3 verbatim copies (backend-conventions rule #12; the sibling dup the `shared-lang`
  step-7 scan surfaced). **No behavior change** — food/metrics/query suites stay green; added
  `test/util/num.test.ts` (integer, fractional-round, whole-valued float, negatives). 170 tests green
  (+4). Opus reviewer → CLEAN (0 findings, both axes). Lands before the voice surfaces
  (`clarify`/`food-photo`) can write copies #4+.
- **M3 `clarify`** (wave 4, US-6) — the precision-first **Open Question** mechanic (ADR-0015). New
  `src/clarify/` module: `store.ts` (ephemeral in-memory `Map<chatId, OpenQuestion>`, lazy `isExpired`,
  no timer — ADR-0019), `decide.ts` (`decideAskOrLog`: ask on the estimate call's optional `clarify`
  field or on >1 Food-DB match, else log — **zero new LLM call class**), `question.ts` (localized
  disambiguation prose via `src/util/lang.ts`), `resolve.ts` (routes by the stored `Clarification.kind`
  — quantity = code rescale/0 calls, descriptor = re-resolve/≤1 call, disambiguation = select-by-id →
  `fact`/0 calls; expiry fallback logs an honest `estimate`, never drops the entry). `logFood` now
  returns a discriminated `LogOutcome` (`logged` | `ask`); bot wires a `q:<index>` callback namespace
  (index, not value → 64-byte-safe) + pending-question branches in `handleText`. Estimate schema gained
  an optional `clarify` object; authored the `clarify-discrimination` eval (deterministic grader; live
  run deploy-time). Extracted `src/util/num.ts` `DECIMAL_SOURCE` (deduped the number regex vs
  `metrics/parse.ts`, rule #12). 197 tests green (+27). **Two review rounds**: round 1 → 1 CRITICAL
  (multi-match disambiguation lost the `fact` + bare-number misroute — root cause: `OpenQuestion` didn't
  record the asked `unknown`); round 2 → 1 MAJOR (invariant #6: resolved-answer confirmation localized
  off the answer, not the user's words) + MINOR + a suggestion; round 3 → CLEAN. No chat history to the
  model (#1), tenant-scoped writes (#8), language-mirrored prose (#6).
- **M4 `food-photo`** (wave 4, US-3) — the **vision front door** (§8.3). Extended the single LLM seam
  (`src/llm/structured.ts`) with an optional `images` param → image content block(s) **before** the
  text in the SAME one `messages.create` (invariant #5, text callers untouched). New `src/food/photo.ts`:
  `estimatePlate` (ONE vision call → `{ items: PlateItem[] }`, each item = name + `per` basis + macros +
  observed qty) and `resolvePlate` (per-item fact-vs-estimate). Added `lookupFoodsByNames` to
  `lookup.ts` — ONE batched `findMany` over all names (own+global via `catalogWhere`, own preferred),
  reduced to a best-match-per-name Map (no N+1). A name hit → `fromMatch` (`fact`, Food-DB macros
  preferred over the visual estimate); a miss → the vision item's OWN macros as `estimate` with **zero**
  extra LLM calls (invariant #5). `service.logPhoto` writes one code-scaled `food_log` row per item via
  the existing `writeFoodLog` (tenant-scoped #8, no hand-summed total #2), meal from `inferMeal`, date =
  today (user TZ via `resolveDate`). New `buildPlateConfirmation` in `confirm.ts` reuses `macroLine` +
  `detectLang` + `fmt` (no copies, rule #12): per-row lines + one honest estimate note, prose mirrors
  the caption. Bot `message:photo` handler downloads the largest `PhotoSize` to **base64 in memory** and
  discards it — **never written to disk/DB** (invariant #4; the **CRITICAL fs-spy test** asserts zero
  writes across a full `logPhoto` run). 220 tests green (+~23). Live vision-accuracy eval **deferred**
  (needs a labeled image set + key — logged skip, ADR-0013). Interactive plate ask split to
  `food-photo-ask` (invariant #4 discards the image, so the follow-up is a text-only refine).
- Loop tooling: `run-backlog` assigns a **model+effort tier per phase** — **Opus · high for every
  reasoning/implementation/coherence/prose phase** (propose, plan gate, apply-maker, verify, dup/improve,
  review, sync-docs, pre-archive, archive spec-sync) and **Haiku · low** only for pure mechanical steps
  (select, test-run, evals, commit, archive-move). No phase runs on Sonnet: at current pricing Opus·high
  is both stronger and cheaper than Sonnet 5 for this work (updated 2026-07-01; earlier the reasoning/impl
  phases were Sonnet 5). Maker ≠ checker stays a **role** split — apply and review are separate Opus
  subagents. `run-backlog` is also **autonomous/gate-driven** — the two human checkpoints dropped,
  escalate only on a critical fork (ADR-0012 amendment 2026-06-30). Fixed an `openspec/config.yaml`
  YAML bug (colon-space in unquoted scalars silently dropped the `design`/`tasks` rule arrays).

## In progress
- M0/M1 deploy (human): push branch → CI builds + pushes image → flip GHCR package public (path A) →
  Coolify pulls + runs → container `migrate deploy` creates tables → confirm `/start` round-trip +
  `/health` + a DB read/write, idle RSS < 512 MB.

Work is sliced into [openspec/backlog.md](../openspec/backlog.md) (16 changes + 1 manual `provision`;
added `coach-persona` wave 3 on 2026-06-30, `shared-fmt` wave 4 on 2026-07-01), driven by
`/run-backlog` (ADR-0012/0013).

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
7. ✅ **`food-text` (M3): code-complete + archived** — parse → Food DB lookup/estimate → code-scaled
   `food_log` write + add-to-catalog. Live estimate/parse eval is deploy-time (needs key).
8. ✅ **`metrics` (M5, wave 3): code-complete + archived** — deterministic body-metrics parse → upsert
   → like-with-like trend diffs (US-7). Deterministic, no live-LLM gate.
9. ✅ **`query` (M3, wave 4): code-complete + archived** — DB-as-memory SUM → totals vs goal (US-4).
   Deterministic, no live-LLM gate.
10. ✅ **`correction` (M3, wave 4): code-complete + archived** — in-place edit of the last `food_log`
    entry (quantity rescale in code / product re-resolve), tenant-scoped (US-5). Deterministic core, no
    live-LLM gate.
11. ✅ **`shared-lang` (M3, wave 4, tech debt): code-complete + archived** — extracted `src/util/lang.ts`,
    deduped the 3-copy `detectLang` before the voice surfaces. Deterministic, no live-LLM gate.
12. ✅ **`shared-fmt` (M3, wave 4, tech debt): code-complete + archived** — extracted `src/util/num.ts`
    (`fmt`), deduped the sibling 3-copy triple before the voice surfaces. Deterministic, no live-LLM gate.
13. ✅ **`clarify` (M3, wave 4, US-6): code-complete + archived** — precision-first Open Question
    mechanic (ask-vs-log, ephemeral store ADR-0019, resolve/expiry-fallback). Two review rounds
    resolved. Live discrimination eval is deploy-time (needs key).
14. ✅ **`food-photo` (M4, wave 4, US-3): code-complete** — plate photo → ONE vision call (seam extended
    with optional image block) → multi-item extraction → batched fact-vs-estimate lookup → one
    code-scaled row per item → multi-item confirmation; image base64 in memory only, never persisted
    (CRITICAL fs-spy test). Live vision eval deferred (needs image set + key). Review + archive pending.
15. **`food-photo-ask` (M4, wave 5): NEXT** — precision-first plate ask over the extracted items as a
    photo-variant Open Question (text-only refine — the image is already discarded). `reviews` (wave 5)
    is also ready (`food-text` + `metrics` + `coach-persona` done); `progress-photo` waits on `food-photo`.

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
