## Why

A new user who sends `/start` today only gets a static greeting (the `pipe` tracer bullet). Before
the bot can coach, it must know who it is coaching: age, sex, height, weight, goal, activity, and
timezone — the inputs to a calorie/macro budget. This change delivers **US-1** (the M2 milestone
gate): `/start` collects those fields and computes personalized targets via Mifflin–St Jeor, so
every downstream feature (food logging, reviews) has a budget to compare against.

## What Changes

- **`/start` becomes a stateful Q&A flow**, replacing the static echo. An unknown `chat_id` creates
  a `users` row; a known one is greeted with their existing targets (re-running `/start` resumes an
  incomplete onboarding or offers to recompute).
- **Onboarding progress is persisted in the `users` row itself** — the next question asked is the
  first still-null field (age → sex → height → weight → goal → activity → timezone). No extra
  session store, no conversation plugin: the DB is the state, so a restart resumes mid-flow.
- **Fixed-choice questions use Telegram inline keyboards** (sex, goal, activity, timezone-default
  confirm); numeric questions (age, height, weight) take free-text with validation + re-ask on bad
  input. (Requirements §8 disambiguation UI.)
- **Weight is captured into `body_metrics`** (the first entry), not `users` — `users` has no weight
  column by design (weight is a tracked metric). The Mifflin calc reads that entry.
- **Target computation in code** (pure, deterministic — no LLM): Mifflin–St Jeor BMR → TDEE ×
  activity multiplier → goal-adjusted kcal with a **floor on the deficit** (no extreme cuts),
  protein 1.8–2.2 g/kg, fat ≥ 0.8 g/kg floor, carbs = remainder. Targets written to the `users`
  row; a confirmation message echoes them back in the user's language.
- **Command-driven** — `/start` is a grammY command handler; this change has **no router
  dependency** (it is blocked only by `data`).

## Capabilities

### New Capabilities
- `onboarding`: the `/start` Q&A state machine (DB-backed progress, inline-keyboard + validated
  free-text question types), the Mifflin–St Jeor target calculator (pure function: BMR → TDEE →
  goal-adjusted kcal + macros, with the no-extreme-deficit floor), and target persistence +
  confirmation.

### Modified Capabilities
- _none_ — `bot-runtime` gains an onboarding handler but its existing requirements don't change;
  the new behavior is fully described by the `onboarding` spec.

## Impact

- **Code:** new `src/onboarding/` (calculator + flow + question definitions); `src/bot/bot.ts`
  rewires the `start` command and adds a callback-query handler for inline-keyboard answers + routes
  non-command text to the active onboarding question when one is pending. Reads/writes `users` and
  `body_metrics` via the tenancy helpers (invariant #8). No schema migration — all needed columns
  exist (`data` change).
- **Invariants touched:** #1 DB-is-memory (onboarding *state* lives in the `users` row, not chat
  history — answers are written immediately, never reconstructed); #6 language (prose mirrors the
  user; enum/literal values like `goal: "cut"`, `activity` keys stay English); #8 multi-tenancy
  (every read/write scoped by `user_id` / `chat_id`); #9 privacy (body data — weight — kept in the
  DB, never logged raw).
- **LLM cost:** **zero** — onboarding is pure command/keyboard logic + arithmetic. No model call,
  so no cost and no agent-loop concern (invariant #5 trivially holds).
- **Memory:** negligible — no new long-lived state, no new dependency (no conversation plugin); a
  handful of small handlers. Stays well within the 512 MB bot cap (invariant #7).
