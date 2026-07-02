## Why

Honeydo tracks time but never *reflects* it back. The one AI feature — a single, plain-English
sentence about today's pace — turns the raw log into a calm daily read ("You're ahead of your
usual Thursday"). It's the Phase-5 differentiator, and it now has everything it depends on: the
pure aggregation from `profile-stats` (Phase 4) that shapes the model's numeric input.

## What Changes

- **New `daily-insight` capability** — a short natural-language insight for **today**, derived
  from the user's recent history (last 14 local days), shown on the Stats screen.
- **Shared** — a pure, framework-free **insight-input shaping** function (history → compact
  numeric summary: per-day series, totals, top tags) plus a **deterministic fallback template**
  (history → sentence) and the `DailyInsight` / `InsightSummary` contracts. Fully unit-tested
  with an evals-style fixture suite (TC-PURE-01, TC-TEST-01, FR-INSIGHT-04).
- **API (NestJS)** — a user-scoped insight endpoint that shapes the summary from the user's own
  rows (in the user's time zone), calls the **Anthropic API server-side** (key never leaves the
  backend), enforces output guardrails, and **caches one generation per user per local day**
  with an explicit refresh. Falls back to the deterministic template on any LLM
  timeout/failure/missing key — never errors or blanks (FR-INSIGHT-01/02/03/05/06, TC-STACK-07,
  NFR-COST-01).
- **Mobile (Expo/RN)** — an insight card on the Stats screen (the sentence, its source/day, a
  refresh control) with loading, error-degrades-to-fallback, and empty states, using tokens only.
- **New dependency** — `@anthropic-ai/sdk` in `apps/api` only. **New env**: `ANTHROPIC_API_KEY`
  (+ optional `ANTHROPIC_MODEL`). **New Prisma model**: `DailyInsight` (the per-day cache).

## Capabilities

### New Capabilities

- `daily-insight`: A single-sentence, server-generated read on today's tracked-time pace,
  built from a pre-computed numeric summary of recent history, cached per user per local day,
  constrained in length/tone, with a deterministic fallback that guarantees the card always
  shows something.

### Modified Capabilities

<!-- None. profile-stats aggregation is reused, not changed; no existing spec's requirements change. -->

## Impact

- **Packages:** `packages/shared` (new `insight.ts` + contracts + tests), `apps/api` (new
  `insight` module: controller/service/DTO + `AnthropicService`; Prisma model + migration),
  `apps/mobile` (Stats insight card + `useInsight` query hook + api client method).
- **APIs:** new `GET /insight?tz=<IANA>` (cached-or-generate for today) and
  `POST /insight/refresh?tz=<IANA>` (force one regeneration), both behind `JwtAuthGuard`
  and user-scoped (FR-AUTH-06, BC-SCOPE-01).
- **Data:** new `DailyInsight` table, unique per `(userId, localDate)`; migration required.
- **Config/ops:** `ANTHROPIC_API_KEY` must be set server-side for live insights; without it the
  API transparently serves the deterministic fallback (so dev/CI need no key). API key is
  **never** shipped to the client (TC-STACK-07, FR-INSIGHT-02).
- **Cost:** bounded to one LLM call per user per local day plus explicit refreshes (NFR-COST-01).
- **Deferred:** streak/goal signals in the summary (→ `streaks`); multi-language output
  (English-only per FR-INSIGHT-05); on-device/client LLM (explicitly a non-goal).
