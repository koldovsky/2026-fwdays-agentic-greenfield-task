## Why

Users want to send a **body progress photo** and get honest, qualitative feedback on how the cut is
going (**US-8**, milestone M5) — the counterpart to the numeric `body-metrics` track. A progress
photo is a low-friction check-in the tape measure can't capture (posture, visible midsection change).
The vision front door already exists (`food-photo-logging` extended the single LLM seam with an
optional image block); this change reuses it for a **different, non-food** read: one vision call →
prose observations → **text saved, image discarded**. It closes the M5 body track alongside `metrics`.

## What Changes

- **New `progress-photo-logging` capability:** a body photo streams to the vision model in **exactly
  one call** (invariant #5, no agent loop) → **qualitative text observations** in the coach voice
  (key marker: **belly in profile**), explicitly **not** a diagnosis and **not** a body-fat %. Only
  the **text** is persisted; the image bytes are **discarded immediately** — never written to disk,
  storage, or the DB (invariant #4, the load-bearing one — a CRITICAL fs-spy test).
- **New `progress_notes` table** (`id, user_id, date, observations, created_at` — **no image
  column**, requirements §6): one row per progress check-in, tenant-scoped (invariant #8). Authored
  with a hand-written Prisma migration (sandbox has no DB; `migrate deploy` applies it on-box).
- **Trigger routing** (how a photo becomes a *progress* photo vs a food plate): (a) the photo
  **caption** contains a progress keyword (RU `прогресс`, UA `прогрес`, EN `progress`), **or** (b) the
  user first sends **`/progress`**, which arms a short-lived **ephemeral in-memory** per-chat flag
  (reuse the ADR-0019 lazy-TTL pattern — no timer, nothing persisted) so the **next** photo is read as
  progress. Any other photo stays a food plate (existing `logPhoto`, unchanged).
- **Prose language** mirrors the caption (`detectLang`, invariant #6); an armed photo with **no
  caption** defaults to **Russian** (the primary RU/UA user base — English-by-default would be wrong
  for most bare check-ins). English enums/structural values are moot here — the row stores only prose.
- **`/progress` command + a progress branch in the `message:photo` handler** (`bot-runtime` wiring),
  a new `ProgressService` in `BotDeps`/`index.ts`, reusing the in-memory `downloadPhotoBase64` helper.
- **Refactor (dup-gate rule #12, folded in):** `toDbDate` is copy-pasted **verbatim in 4 files**
  (`food/write`, `metrics/write`, `metrics/service`, `query/aggregate`); `progress/write` needs it
  too. Extract one `src/util/date.ts` and repoint all sites — **no behavior change**, no copy #5.

## Capabilities

### New Capabilities
- `progress-photo-logging`: send a body photo (via `/progress` or a `прогресс` caption) → one vision
  call → honest qualitative observations (not a diagnosis / not a body-fat %) → persist the **text
  only** to `progress_notes` (tenant-scoped) → **discard the image**. Includes the trigger routing,
  the ephemeral `/progress` arming flag, and the language-mirror rule.

### Modified Capabilities
<!-- None. The LLM seam already accepts an optional image (added by food-photo-logging); progress
     reuses it unchanged. The new progress_notes table is specified within this capability (it is a
     feature-specific table, not one of data-layer's core five), so data-layer needs no delta. -->

## Impact

- **Code:** new `src/progress/` module (`types.ts`, `detect.ts` caption keyword, `store.ts` ephemeral
  armed-flag, `analyze.ts` one vision call + `{observations}` schema, `write.ts` tenant-scoped insert,
  `service.ts` orchestrator); `src/bot/bot.ts` + `types.ts` (`/progress` command + progress branch in
  `handlePhoto`); `src/bot/types.ts` `BotDeps` + `src/index.ts` wiring; new `src/util/date.ts`
  (`toDbDate`) with `food/write`, `metrics/write`, `metrics/service`, `query/aggregate` repointed.
  `prisma/schema.prisma` (+ `ProgressNote` model, `User.progressNotes`) + a new hand-written
  migration. Tests mirror under `test/`. Reuses `parseStructured`, `systemPrefix`, `detectLang`,
  `resolveDate`, `tenantWhere`, `downloadPhotoBase64` — **no new duplicates** (rule #12).
- **Invariants touched:** **#4** (image never persisted — CRITICAL fs-spy test across a full run),
  **#5** (exactly one vision call, no loop, no re-vision), **#6** (prose mirrors language), **#8**
  (tenant-scoped write), **#9** (body/progress data is sensitive — tight DB access, no raw-value
  logging).
- **LLM cost:** exactly **one** vision call per progress photo (Sonnet 4.6). No fan-out, no loop; the
  cached system prefix is reused. Progress photos are infrequent (PRD: ~2–4 weeks), so negligible
  spend against the M5 ≤ $3/mo cap.
- **Memory:** image bytes live only transiently in a base64 buffer during the call, then drop — no
  persistence, negligible steady-state footprint (bot ≤ 512 MB, invariant #7).
- **Deps/build:** no new runtime dependency (grammY `getFile` + `fetch`; the Anthropic SDK already
  supports image blocks). No change to the off-box build.
- **Evals:** progress-observation *quality* (coach voice, belly-in-profile marker, no body-fat %, no
  diagnosis) is a subjective **judge eval** per ADR-0013 — but like `food-photo-logging`'s vision
  eval it needs a labeled **image** set + `ANTHROPIC_API_KEY`, so the live judge eval is **deferred
  to deploy-time** (logged skip). Image-never-persisted and single-call are **tests**, not evals
  (ADR-0013 boundary rule).
