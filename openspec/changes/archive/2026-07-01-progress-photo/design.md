## Context

US-8 / §8.5: a body **progress photo** → one Sonnet vision call → qualitative observations → **text
saved, image discarded**. The vision seam already exists — `food-photo-logging` extended
`parseStructured` with an optional image block (exactly one `messages.create`, cached prefix, no
agent loop) and added the in-memory `downloadPhotoBase64` helper to `bot.ts`. So this change is mostly
**wiring a new, non-food read** through that seam plus a new persistence table.

The one genuinely new problem is **routing**: `bot.on('message:photo')` currently sends *every* photo
to `logPhoto` (food). Progress must divert a subset. Both trigger docs name two entry points —
caption `прогресс` and a `/progress` flow — so routing has to handle a stateless caption path and a
stateful "arm the next photo" path without persisting chat state (invariant #1, ADR-0019).

## Goals / Non-Goals

**Goals:**
- One vision call → honest qualitative prose (belly-in-profile marker), **no** body-fat % / diagnosis.
- Persist **text only** to a new tenant-scoped `progress_notes` table; **image never persisted** (#4).
- Route photos to progress via caption keyword **or** an ephemeral `/progress` arming flag.
- Reuse the seam, `detectLang`, `resolveDate`, `tenantWhere`, `downloadPhotoBase64` — zero new dups.

**Non-Goals:**
- No body-fat estimation, no measurement extraction, no trend diffing of photos (that is the numeric
  `body-metrics` track). No storing/thumbnailing the image. No inclusion of progress notes in reviews
  yet (a `reviews`-change concern). No multi-photo sessions. No live vision eval in-sandbox.

## Decisions

**D1 — New `src/progress/` module, mirroring the food/metrics service shape.** Small single-purpose
files: `detect.ts` (`isProgressCaption`), `store.ts` (ephemeral armed-flag), `analyze.ts` (the one
vision call + schema), `write.ts` (the `progress_notes` insert), `service.ts` (orchestrator), and
`types.ts`. Keeps the vision/persist/route concerns separable and unit-testable (backend-conventions:
small modules, injected client).

**D2 — Vision output schema is a single prose field: `{ observations: string }`.** The observations
are qualitative and language-mirrored; there are no numbers to structure (invariant #2 — the model
emits no metrics). The analyze prompt instructs: describe visible markers (esp. **belly in profile**),
stay in the honest coach voice (the cached prefix already carries the persona), and **explicitly
forbid** a body-fat % or diagnosis. Language: "respond in the caption's language; if there is no
caption, respond in Russian" — the sole language decision lives in the model output, so the whole
reply is that prose (no separately-built header to language-match). One call through `parseStructured`
with the image block (invariant #5), no re-vision.

**D3 — Trigger routing lives in `handlePhoto`, checked before `logPhoto`.** Order: (1) onboarding gate
(unchanged); (2) if `isProgressCaption(caption)` **or** the armed flag is present-and-fresh → progress
path; (3) else food path. The flag is **consumed** (`take`) whenever a photo is handled so a stray
`/progress` can't silently reroute a later food photo; an expired/absent flag is a no-op. This keeps
food the default and adds one branch, mirroring how `handleText` branches on a pending Open Question.

**D4 — `/progress` arms an ephemeral in-memory flag (ADR-0019 pattern), not a persisted state.** A
tiny `Map<bigint, Date>` (armed-at timestamp) with a lazy `isExpired` check — no timer, nothing in the
DB (invariant #1). `/progress` sets the flag and replies with a one-line "send your photo" prompt.
Rationale: the alternative — persisting an "expecting progress" user state — would put transient UI
state in the DB, contradicting the DB-is-memory boundary; and a bare instructional `/progress` (no
arming) would fail the "via /progress flow" acceptance for a caption-less photo. The flag reuses the
**TTL constant/`isExpired` helper** shape from `clarify/store.ts`; the progress store keeps its own
tiny Map (different value type — a timestamp, not an OpenQuestion) but shares the expiry semantics.

**D5 — `progress_notes` is a feature-specific 6th table, specified in this capability.** Prisma model
`ProgressNote` (`@@map("progress_notes")`, `userId @map("user_id")`, `date @db.Date`, `observations
String`, `createdAt`, `@@index([userId, date])`, `User` relation `onDelete: Cascade`) + `progressNotes
ProgressNote[]` on `User`. It is **not** one of data-layer's "core five", so data-layer's spec is
untouched. The migration is **hand-authored** SQL in `prisma/migrations/<ts>_progress_notes/` (the
sandbox has no DB — `prisma migrate dev` can't run; `migrate deploy` applies it on-box at container
start, exactly as `_init` does). No image column exists — the schema structurally enforces #4 at rest.

**D6 — Language default = Russian for a caption-less armed photo.** `detectLang` needs text; an armed
`/progress` photo often has none. English-by-default (what `detectLang('')` returns) would be wrong
for the RU/UA-primary user base. So the *prompt* carries the default ("no caption → Russian"), not a
`detectLang` call. When a caption exists, the model mirrors it. Documented as a product default.

**D7 — Dedupe `toDbDate` inline (dup-gate rule #12).** `const toDbDate = (isoDate) => new
Date(\`${isoDate}T00:00:00.000Z\`)` is copied verbatim in `food/write`, `metrics/write`,
`metrics/service`, `query/aggregate`. `progress/write` needs the same. Rather than add copy #5,
extract `src/util/date.ts` (`export const toDbDate`) and repoint all four sites + progress. Precedent:
`clarify` extracted `src/util/num.ts DECIMAL_SOURCE` inline when it needed a shared helper. No behavior
change — the existing food/metrics/query suites stay green; add `test/util/date.test.ts`.

**D8 — Evals: defer the live judge eval.** Observation quality (coach voice, belly marker, no
body-fat %/diagnosis) is subjective → a **judge eval** per ADR-0013. But it needs a labeled **image**
set + `ANTHROPIC_API_KEY`, neither available in-sandbox — so, exactly like `food-photo-logging`'s
vision eval, the live eval is **deferred to deploy-time** with a logged skip. The load-bearing
behaviors (image-never-persisted, single-call, tenant-scoped write) are **vitest tests** (ADR-0013
boundary: no LLM call → it's a test).

## Risks / Trade-offs

- **Image-never-persisted is the load-bearing invariant.** Mitigation: a **CRITICAL fs-spy test**
  asserts zero `fs`/disk writes across a full `analyzeAndSave` run (mirrors food-photo's spied test);
  the schema has no image column; the write function's type signature never accepts image bytes.
- **Model could still emit a body-fat % or diagnosis** despite the prompt. This is model-dependent, so
  it's gated by the (deferred) judge eval's CRITICAL rubric rather than a unit test. In-sandbox we
  can only assert the prompt forbids it; the live rubric is the real gate at deploy-time.
- **Caption-keyword collision:** a food photo captioned with the word "progress" would divert to the
  progress path. Accepted — the keyword is an explicit opt-in; a user photographing a plate is
  unlikely to caption it `прогресс`. Documented in the detect module.
- **Russian default** is occasionally wrong for an English user who sends a caption-less armed photo.
  Accepted as the better expected-value default; a caption removes the ambiguity.
- **Ephemeral flag lost on restart** (in-memory). Accepted per ADR-0019 — the user simply re-sends
  `/progress`; nothing is persisted, consistent with the clarify store.
