# ADR-0019 — In-memory ephemeral store for the Open Question

*Status: Accepted · Date: 2026-07-01 · Source: [ADR-0015](./0015-coach-persona-precision-first-clarification.md)
(precision-first clarification), [CONTEXT.md](../../CONTEXT.md) (Open Question glossary term),
[openspec/backlog.md](../../openspec/backlog.md) `clarify` (US-6). Contrast:
[ADR-0016](./0016-db-backed-onboarding-state-machine.md) (DB-backed onboarding state).*

## Context

The `clarify` change implements the precision-first ask from [ADR-0015](./0015-coach-persona-precision-first-clarification.md):
on a hidden high-leverage calorie-mover, the bot raises **one** Open Question, waits, and either
refines-and-logs on the answer or logs the best `estimate` on expiry. This needs somewhere to hold
the **pending Open Question** — the resolved-so-far food, the routed message, the target date, and
the ask timestamp — between the bot asking and the user answering.

[ADR-0016](./0016-db-backed-onboarding-state-machine.md) set a precedent: onboarding conversation
state lives in the **DB** so a mid-flow restart resumes cleanly. The Open Question looks superficially
similar (per-user pending conversational state) — but [CONTEXT.md](../../CONTEXT.md) defines it as the
opposite: *"An ephemeral, per-user clarification… The next message answers it; it expires in minutes.
Nothing else from the conversation is remembered."* So the precedent does **not** automatically carry.

## Decision

**Hold the pending Open Question in an in-memory `Map`, keyed by Telegram `chat_id`,** with an
`askedAt` timestamp and **lazy expiry** checked on the next inbound message — not in the database.

- One small map in the (RAM-tight, ≤512 MB) bot process; each entry is a single pending clarification
  that lives for minutes. Negligible footprint (rule 7).
- **Lazy expiry, no timer:** when the next message arrives, if the pending question is older than the
  TTL, the bot first logs the best `estimate` (the ADR-0015 fallback), then classifies the new message
  fresh. No `setTimeout` / cron / agent loop (rule 5).
- **No chat history persisted** — the map holds exactly the one open question and nothing else,
  matching invariant #1 (the DB is the memory; chat is not) and CONTEXT.md's "nothing else remembered."
- The router already gates the `answer` intent on `hasPendingQuestion` (§8.0); the store is what makes
  that flag true for a given user.

## Consequences

- **+** Zero schema/migration and zero DB load for a thing that lives minutes — the store *is* the
  ephemerality CONTEXT.md specifies, not durable state pretending to be ephemeral.
- **+** Simple: a module-scoped map behind a small interface (`get`/`set`/`take`), trivially unit-tested
  with an injected clock; no Prisma round-trip on the hot path.
- **+** Consistent with rules 1/5/7 — no chat memory, no loop/timer, no RAM/DB growth.
- **−** A bot restart inside the (minutes-long) window drops the pending question, so that one entry
  never gets its expiry-fallback estimate logged. Accepted: restarts are rare, the window is minutes,
  and the user can simply re-send. This is the deliberate trade vs ADR-0016 (which pays a table +
  migration to survive restart for a *long, resumable* onboarding flow — a different cost/benefit).
- **−** In-memory state is per-process; if the bot is ever horizontally scaled, the map must move to a
  shared store. Not a concern for the single-instance long-poll deployment (ADR-0014); revisit then.

## Alternatives considered

- **DB-backed `open_questions` table (ADR-0016 style)** — survives restart, guarantees the
  estimate-fallback always fires. Rejected as over-durable: CONTEXT.md frames the Open Question as
  ephemeral and non-remembered, and paying a table + migration + cleanup path to persist something
  that expires in minutes buys resilience against a rare edge (restart mid-window) at a standing cost.
- **`setTimeout`-driven eager expiry** — fire the fallback log exactly at TTL without waiting for the
  next message. Rejected: adds background timers (closer to a loop), and lazy expiry-on-next-message is
  enough for the UX (the fallback matters when the user re-engages).
