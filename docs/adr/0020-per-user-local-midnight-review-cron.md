# ADR-0020 — Per-user local-midnight review cron (hourly global tick)

*Status: Accepted · Date: 2026-07-01 · Source: [requirements.md](../requirements.md) §8.6 (Reviews),
[prd.md](../prd.md) US-9 + M4 (100% of days reviewed, no doubles),
[openspec/backlog.md](../../openspec/backlog.md) `reviews` (M6). Contrast:
[ADR-0019](./0019-in-memory-open-question-store.md) (lazy, no-timer expiry — a different cadence).*

## Context

Reviews must fire at each user's **local** midnight as a fallback when the user never sends
`/done` (US-9; PRD metric **M4**: every day gets a review, manual or auto, with no doubles). Users
carry their own `tz` (default `Europe/Kyiv`); the single long-poll process (ADR-0014) runs in one
server timezone. The host is RAM-tight (≤512 MB, invariant #7) and there is **no agent loop**
(invariant #5). We need a scheduler that (a) respects each user's timezone, (b) is cheap, and (c)
never double-generates.

`node-cron` is already the sanctioned scheduler in requirements §3 ("`node-cron` — midnight review
fallback"). The open question is the *shape* of the job, not the library.

## Decision

**One `node-cron` job on an hourly tick (`0 * * * *`) that sweeps all users and generates a review
only for users whose local clock has just crossed midnight** — the finished day is detected
per-user from their own `tz`.

- **Hourly tick, per-user local-hour check.** Each tick, for every user, compute their current local
  hour (via the existing `Intl.DateTimeFormat`-based `localDateString`/tz helpers). A user whose
  local hour is `00` has just entered a new local day; the *finished* day is their local "yesterday".
- **Idempotency does the guarding, not the clock.** The job generates the finished day's daily review
  only if no `reviews` row exists for `(user, "daily", that_date)` — the unique
  `(user_id, period, period_start)` constraint + upsert make a manual `/done` and the sweep converge
  on the same row (no doubles, M4). So even if a tick is missed or runs twice, coverage is
  eventually-correct and duplication-free.
- **Auto-generated reviews push proactively** to the chat via an injected `send(chatId, text)`
  callback (the bot's `api.sendMessage`), stored with `reviewed_flag = false` to distinguish them
  from user-closed days (`true`).

## Consequences

- **+** Timezone-correct for every user with **one** job and no per-user timers — the hourly tick is
  the coarsest cadence that still hits every distinct local midnight (DST included, since the local
  hour is recomputed each tick from `Intl`, not precomputed offsets).
- **+** Negligible footprint (invariant #7): one interval, bounded queries per tick (a users scan +
  one aggregate per due user), no standing in-memory state. Fits the ≤512 MB cap.
- **+** Restart-safe: state lives in the `reviews` table, not in the scheduler. A restart at 00:30
  still generates the day on the next tick because the row doesn't exist yet; a restart after
  generation is a no-op (row exists). No missed/duplicated day survives a bounce.
- **+** Cost-safe (invariant #5): each due user costs exactly **one** cached-prefix LLM call; the
  sweep itself makes zero LLM calls for users with nothing due.
- **−** Up-to-59-minute latency: a review lands within the hour after local midnight, not at
  00:00:00 sharp. Accepted — a next-morning fallback review has no sub-hour SLA, and the manual
  `/done` path is instant for users who want it now.
- **−** A user who changes timezone mid-day could in principle skip or double a local midnight; the
  idempotency guard makes a *double* impossible, and a *skip* self-heals on any later tick where the
  finished day still lacks a row. Acceptable for a personal-coach bot.

## Alternatives considered

- **Per-user `setTimeout`/`node-cron` job at each user's exact midnight.** Fires at 00:00 sharp.
  Rejected: N timers to schedule/reschedule (on tz change, on every new user, on restart), more
  moving parts and RAM for a sub-hour-latency gain we don't need — and closer to a background-loop
  smell than a single tick.
- **One daily cron in the server timezone.** Trivial, but generates every user's review at the
  *server's* midnight — wrong for anyone not in the server tz. Rejected: violates the "user's local
  midnight" requirement (§8.6).
- **One `node-cron` job per distinct user timezone (with cron's `timezone` option).** Correct and
  fires on-time, but needs dynamic job management as the tz set changes and multiplies jobs.
  Rejected as premature: the hourly-sweep is simpler, restart-safe, and the latency is immaterial.
  Revisit only if on-the-minute delivery ever becomes a requirement.
