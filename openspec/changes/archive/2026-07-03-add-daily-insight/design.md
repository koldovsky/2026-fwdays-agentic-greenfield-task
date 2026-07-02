## Context

`daily-insight` is Phase 5 — the single AI feature. It sits on top of the Phase-4 aggregation:
`packages/shared/src/stats.ts` already turns a flat `TimeEntry[]` into per-day / period / per-tag
totals, and every function takes an explicit `now` for determinism (FR-STATS-05). The server owns
the data (all entries live in Postgres via Prisma in `apps/api`), auth is a `JwtAuthGuard` +
`@CurrentUser()` pattern already used by `time-entries` and `tags`, and config comes from
`@nestjs/config` (`ConfigModule.forRoot({ isGlobal: true })`).

Two hard constraints shape everything here:

1. **Local-day correctness.** The insight is "today's pace" and is cached "per local day", but the
   server has no inherent knowledge of the user's time zone, and `stats.ts` currently derives local
   days from the *runtime's* zone (`Date.getFullYear/Month/Date`). Server-side we must bucket days in
   the **user's** zone. This is the item deferred out of `profile-stats`.
2. **Key safety + cost.** The Anthropic key is server-only (TC-STACK-07, FR-INSIGHT-02) and calls are
   bounded to one per user per local day (NFR-COST-01), so caching is a requirement, not an
   optimization.

## Goals / Non-Goals

**Goals:**

- A pure, framework-free, time-zone-aware **summary shaper** and a **deterministic fallback**
  sentence in `packages/shared`, unit-tested as an evals suite (TC-PURE-01, TC-TEST-01).
- A server `insight` module: shape → (LLM | fallback) → guardrails → per-day cache, user-scoped.
- A Stats **insight card** with refresh and calm states.
- The feature is fully functional **without** an API key (serves fallback), so dev/CI are unblocked.

**Non-Goals:**

- Sending raw rows/notes to the model (only aggregates — FR-INSIGHT-04).
- Per-request generation or any client-side LLM call (non-goals in the capability doc).
- Streak/goal signals (→ `streaks`) and non-English output (English-only — FR-INSIGHT-05).
- Server-side storage of the user's IANA zone (the client passes it per request; see Decisions).

## Decisions

### 1. Time zone travels with the request; shaping is TZ-aware in `shared`

The client sends its IANA zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`, e.g.
`Europe/Kyiv`) as a `tz` query param. The server computes "today" and the 14-day window in that zone.

- Add a TZ-aware key helper to `packages/shared/src/dates.ts`:
  `localDateKeyInTz(value: string | Date, timeZone?: string): string` using
  `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day })` → `YYYY-MM-DD`. When `timeZone` is
  omitted it falls back to the runtime zone (preserving today's `localDateKey` behavior).
- New shaping in `packages/shared/src/insight.ts`:
  `buildInsightInput(entries: TimeEntry[], now: Date, timeZone: string): InsightSummary`. It reuses the
  same windowing logic as `stats.ts` but keyed via `localDateKeyInTz`, producing a compact,
  model-ready object.

*Why:* correctness (the user's midnight, not the server's) with zero new persistence. *Alternatives:*
(a) store the zone on `User` — more state, still needs a client source of truth, punts to `auth`;
(b) client computes the whole summary and POSTs it — server can't trust it and it duplicates logic.
Validate `tz` against `Intl.supportedValuesOf('timeZone')` (or a try/catch `DateTimeFormat`), default
to `UTC` on an invalid value.

### 2. `InsightSummary` shape (what the model and fallback both consume)

```ts
interface InsightSummary {
  timeZone: string;        // resolved IANA zone used for bucketing
  todayDate: string;       // YYYY-MM-DD in that zone
  todaySec: number;
  days: DayTotal[];        // last 14 local days, oldest first (date + totalSec)
  avgPriorDaySec: number;  // mean of the prior 13 days (context for "ahead/behind")
  activeDaysPrior: number; // how many of the prior 13 had > 0
  topTags: TagTotal[];     // top 3 by time over the window
  totalWindowSec: number;
}
```

All fields are numbers/strings derived from aggregates — no ids beyond tag identity, no notes. This
is the *entire* payload the LLM sees (FR-INSIGHT-04).

### 3. Persist the cache in a `DailyInsight` Prisma model

```prisma
model DailyInsight {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  localDate String   // YYYY-MM-DD in the user's zone
  text      String
  source    String   // "llm" | "fallback"
  model     String?  // model id when source == "llm"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, localDate])
  @@index([userId])
}
```

*Why persist:* one-generation-per-day (NFR-COST-01) must survive restarts and concurrent requests;
the `@@unique([userId, localDate])` enforces it. Refresh does an `upsert`. *Alternative:* in-memory
cache — lost on restart, not multi-instance safe, can't guarantee the bound. `User` gets a
`dailyInsights DailyInsight[]` back-relation; migration via `npm run migrate`.

### 4. `AnthropicService` wrapping `@anthropic-ai/sdk`, key from config

A thin injectable reads `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from `ConfigService`. If the key is
absent, `isEnabled()` is false and the insight service skips straight to fallback. The call runs with
a short timeout (~4 s) via `AbortController`; any throw/timeout → fallback. The system prompt fixes
tone and the hard rules (≤ 200 chars, English, no emojis, only numbers from the summary, one
sentence); the user message is `JSON.stringify(summary)`.

*Model:* the exact slug is **configurable** via `ANTHROPIC_MODEL` with a current-Claude default in
`.env.example`; we don't hardcode a slug in source that could drift. *Why a wrapper:* keeps the SDK at
one seam (testable, mockable, satisfies "only from the backend" — TC-STACK-07).

### 5. Guardrail pipeline (server-side, after generation)

`sanitizeInsight(raw, summary)` in `shared` (pure, tested): trim/collapse whitespace → strip emoji
(Unicode property escapes) → enforce single sentence → reject if > 200 chars after trimming → extract
integer/decimal tokens and reject if any isn't a known figure derived from the summary (a small
allow-set: the totals/day values rendered as hours, plus small ordinals). On rejection, return
`null` and the service falls back. *Trade-off:* the number check is best-effort (it can't catch a
wrong *word*), but it reliably kills fabricated figures, which is the FR-INSIGHT-05 risk that matters.

### 6. Endpoints

- `GET /insight?tz=<IANA>` — return today's cached insight; if none for today, shape → generate →
  cache → return.
- `POST /insight/refresh?tz=<IANA>` — force one regeneration and `upsert` the day's row.

Response contract `DailyInsight` (shared): `{ text: string; source: 'llm' | 'fallback'; localDate:
string; createdAt: string }`. Both guarded by `JwtAuthGuard`, scoped via `@CurrentUser()`.

### 7. Mobile: `useInsight` + card on Stats

`useInsight()` (TanStack Query) calls `api.getInsight(tz)` with the device zone; the card sits above
the totals on `StatsScreen`. Refresh uses a mutation hitting `/insight/refresh` and updates the query
cache. Loading → calm shimmer/text; error → still render whatever the server returned (server already
degrades to fallback, so the client rarely sees a hard error) with a quiet retry. Tokens only.

## Risks / Trade-offs

- **Anthropic key not yet provisioned (blocks *live* output only).** → The service treats "no key" as
  "fallback mode", so the whole stack (endpoints, cache, UI, tests) ships and works now; wiring the key
  later flips on real generation with no code change.
- **`Intl` time-zone data in Hermes (client) / Node (server).** Server bucketing runs in Node, which
  has full ICU — safe. The client only needs its *own* zone string, not TZ math, so Hermes Intl gaps
  don't bite. → Keep all TZ bucketing server/shared-in-Node; client just reads its zone.
- **Best-effort "no invented figures".** Can't fully verify semantic truth. → Constrain hard via prompt
  + numeric allow-set check + deterministic fallback; document as best-effort.
- **Clock/zone skew across a day boundary.** A user traveling zones could regenerate. → Acceptable;
  cache key is `(userId, localDate-in-sent-tz)`, refresh is always available.
- **Cost spikes via refresh.** → Refresh is explicit and user-initiated; still one row per day
  (`upsert`), and generation only fires when enabled. A per-day refresh cap can be added later if needed.

## Migration Plan

1. Add the `DailyInsight` model + `User` back-relation; `npm run migrate` (dev) generates the migration
   and client. No backfill (cache fills lazily).
2. Add `@anthropic-ai/sdk` to `apps/api`; add `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` to
   `.env.example` (blank key by default).
3. Ship shared + API + mobile. With no key set, behavior is fallback-only and green through `gate`.
4. Rollback: drop the module/routes and the table (no other feature depends on it).

## Open Questions

- Exact default model slug for `ANTHROPIC_MODEL` — pick the current Claude at implementation time; the
  default lives in `.env.example`, not source.
- Whether to cap explicit refreshes per day (deferred unless cost becomes a concern).
