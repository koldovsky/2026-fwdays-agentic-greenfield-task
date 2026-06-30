# ADR-0016 — DB-backed onboarding state machine (no conversation plugin)

*Status: Accepted · Date: 2026-06-30 · Source: onboarding (M2) change · Relates to invariant #1
(DB is the memory) and #7 (memory caps)*

## Context
The `/start` onboarding flow (US-1) is a multi-step Q&A: it must ask age, sex, height, weight, goal,
activity, and timezone across several Telegram messages, surviving the gaps between them. Telegram
bots conventionally hold this with a **conversation/session plugin** (`@grammyjs/conversations`),
which keeps per-user flow state in RAM (or a configured store) and drives a generator function.

Two project constraints push against that: the host is **RAM-tight** (bot ≤ 512 MB, invariant #7,
co-resident with another project's MySQL), and **the DB is the memory** (invariant #1) — we already
refuse to reconstruct state from chat history elsewhere. Meanwhile the `data` change landed the
`users` table with **every onboarding column nullable** and `body_metrics` holding `weight_kg`.

## Decision
Use the **`users` row itself as the onboarding state machine**. The next question is the **first
still-null onboarding field** in a fixed order; each answer is written to its column (weight → a
`body_metrics` row) the moment it arrives. Onboarding is "complete" when all onboarding columns are
non-null **and** a `body_metrics` weight row exists; completion computes + persists the `target_*`
columns.

No conversation plugin, no session store, no in-memory step map. While onboarding is incomplete the
text handler routes the next message to the current question **before** the router sees it; commands
(leading `/`) still dispatch normally, so `/start` resumes rather than being consumed as an answer.

## Consequences
- **+** Zero new dependency and zero long-lived in-RAM state — stays well within the memory cap.
- **+** Durable + resumable for free: a restart loses nothing; `/start` resumes at the first gap.
- **+** Consistent with invariant #1 — state lives in the DB, not in chat history or process memory.
- **+** Multi-process / redeploy safe (no node-local session affinity).
- **−** "Is onboarding complete?" spans two tables (`users` + `body_metrics`); concentrated in one
  `flow.ts` helper to avoid divergence and N+1.
- **−** Fixed-order Q&A only (no free-form branching dialog) — acceptable for a 7-field intake; a
  richer editor (`/profile`) can come later without changing this storage model.
- **−** The text-handler gate couples onboarding-completeness to message routing; documented in the
  onboarding `design.md` (D2) and kept to a single guard.

Alternatives rejected: `@grammyjs/conversations` (dependency + RAM state, against #1/#7); an
in-memory `Map<chatId, step>` (lost on restart, not multi-process-safe).
