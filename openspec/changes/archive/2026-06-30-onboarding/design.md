## Context

`/start` today returns a static greeting (the `pipe` tracer bullet in `src/bot/bot.ts`). The `data`
change landed the `users` table with **all onboarding columns nullable** (`age`, `sex`, `heightCm`,
`activity`, `goal`, the four `target_*`) plus `tz` defaulting to `Europe/Kyiv`, and a `body_metrics`
table where `weight_kg` lives. Tenancy helpers (`tenantWhere`) and the pooled Prisma client exist.
This change turns `/start` into the US-1 onboarding flow and computes targets. It is **command-driven
and has no router dependency** — blocked only by `data`.

Constraints that shape the design: RAM-tight host (512 MB bot cap, invariant #7), no build steps on
the box (CI → GHCR, ADR-0006), DB-is-memory (invariant #1), language mirrored in prose only
(invariant #6), every row tenant-scoped (invariant #8), body data kept private (invariant #9).

## Goals / Non-Goals

**Goals:**
- `/start` collects age, sex, height, weight, goal, activity, timezone and computes Mifflin–St Jeor
  targets, persisting them and confirming back (US-1 acceptance).
- Onboarding state is durable (survives restart) and resumable, with no new dependency.
- The target calculator is a **pure, fully unit-tested function** — no LLM, no I/O.

**Non-Goals:**
- No router involvement (router classifies *post-onboarding* messages; onboarding owns the flow
  while it is incomplete).
- No editing of individual answers after completion beyond re-running `/start` to recompute (a
  dedicated `/profile` editor is a later change if needed).
- No body-fat / Katch-McArdle formula — Mifflin–St Jeor only (matches requirements §8.1).

## Decisions

### D1 — DB-nullable columns ARE the state machine (no conversation plugin)
The `users` row already has a nullable column per onboarding field. The **next question is the first
still-null field**, in a fixed order (age → sex → height → weight → goal → activity → tz). Answers
are written immediately, so progress is durable and resumable for free, and a restart loses nothing.

*Alternatives:* (a) `@grammyjs/conversations` — adds a dependency + per-user in-RAM session state
(against the memory cap and DB-is-memory); (b) an in-memory `Map<chatId, step>` — lost on restart,
not multi-process-safe. Rejected. **This pattern is recorded in [ADR-0016](../../../docs/adr/0016-db-backed-onboarding-state-machine.md).**

One wrinkle: weight is stored in `body_metrics`, not `users`. So "is onboarding complete?" is:
all `users` onboarding columns non-null **and** at least one `body_metrics` row exists. The "next
question" logic treats weight as answered iff a `body_metrics` weight row exists for the user.

### D2 — Onboarding owns the next text message while incomplete
Free-text numeric answers (age/height/weight) arrive as ordinary `message:text` updates. The text
handler gates **before** the router: if the acting user's onboarding is incomplete, the message is
the answer to the current question; otherwise it falls through to `classifyMessage`. This keeps the
router blind to onboarding (it never sees a bare "32" out of context) and needs no router change.

### D3 — Inline keyboards for fixed-choice, validated free-text for numbers
Sex, goal, activity, and the timezone-default confirm are **inline keyboards** (requirements §8
disambiguation UI) whose `callback_data` carries the English literal (`goal:cut`, `activity:moderate`,
`sex:male`). A `callback_query` handler records the literal and advances. Numeric questions take
free text, parsed + range-validated (age 13–100, height 100–250 cm, weight 30–400 kg); an invalid
answer is **re-asked, not persisted** (spec scenario). Enum/literal values stay English; only prose
is localized (invariant #6).

### D4 — Pure calculator: Mifflin–St Jeor → TDEE → goal-adjusted, with floors
`computeTargets({ age, sex, heightCm, weightKg, activity, goal })` in `src/onboarding/calculator.ts`,
no I/O, returns `{ kcal, proteinG, fatG, carbsG }`:
- **BMR** = 10·kg + 6.25·cm − 5·age + (male `+5` / female `−161`).
- **TDEE** = BMR × activity multiplier — the standard 5-level set: sedentary 1.2, light 1.375,
  moderate 1.55, active 1.725, very_active 1.9.
- **Goal adjust**: cut −20%, maintain ×1.0, lean_bulk +10%.
- **No extreme deficit (invariant from US-1)**: clamp the cut result up to `max(BMR, 1200)` — never
  below BMR, never below an absolute 1200 kcal floor.
- **Macros**: protein = 2.0 g/kg (mid of 1.8–2.2); fat = `max(0.8·kg, 25% of kcal / 9)` so the
  0.8 g/kg floor always holds; carbs = remaining kcal after protein·4 + fat·9, floored at 0. Grams
  rounded; the calculator guarantees `4·protein + 4·carbs + 9·fat ≈ kcal` (within rounding).

This is arithmetic — there is **no LLM call in this change at all**, so invariant #5 (no agent loop)
holds trivially and the LLM-cost impact is zero. The confirmation message is templated prose with
the computed numbers interpolated (numbers from code, never from a model — same discipline as totals).

### D5 — Module layout
`src/onboarding/` — `calculator.ts` (pure), `questions.ts` (the ordered field defs + keyboards +
validators), `flow.ts` (next-question resolution + answer persistence via Prisma + tenancy helpers),
and the wiring in `src/bot/bot.ts` (rewire `start`, add `callback_query`, gate `message:text`).
Tests mirror into `test/onboarding/`.

## Risks / Trade-offs

- **[Two-store completeness check]** weight in `body_metrics` means "complete?" reads two tables →
  *Mitigation:* a single `flow.ts` helper computes it (one `users` fetch with a `body_metrics`
  existence check / `_count`), no N+1, and it is the only place that decides the next step.
- **[A pending numeric answer could be a real command]** a user typing `/start` again mid-flow →
  *Mitigation:* commands (leading `/`) are dispatched by grammY's command handler, not the text
  gate, so `/start` always resumes rather than being eaten as an answer.
- **[Stale inline keyboard taps]** an old keyboard tapped after the field is set → *Mitigation:* the
  callback handler is idempotent — if the field is already non-null it acknowledges and re-shows the
  current question instead of double-advancing.
- **[Localization scope creep]** prose localization is best-effort templating, not full i18n →
  accepted; matches invariant #6 (mirror in prose, English literals in storage).

## Migration Plan

No DB migration — all columns exist (`data`). Deploy is the standard CI → GHCR → Coolify pull
(ADR-0006); nothing builds on the box. Rollback = redeploy the prior image; partially-onboarded
rows remain valid (nullable columns) and resume cleanly on the next `/start`.

## Open Questions

- Activity-level wording for the 5 buttons (UX copy) — defaulting to the standard sedentary→very
  active labels; refine with real usage. Not blocking.
