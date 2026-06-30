## 1. Target calculator (pure, no I/O)

- [x] 1.1 Create `src/onboarding/calculator.ts`: `computeTargets({ age, sex, heightCm, weightKg, activity, goal })` → `{ kcal, proteinG, fatG, carbsG }`. Mifflin–St Jeor BMR (sex constant +5/−161) → TDEE × activity multiplier (sedentary 1.2 … very_active 1.9) → goal adjust (cut −20%, maintain 1.0, lean_bulk +10%). Explicit return type; guard clauses; activity/goal/sex as English-literal union types.
- [x] 1.2 Apply the **no-extreme-deficit** clamp: cut kcal floored to `max(BMR, 1200)`. Macros: protein 2.0 g/kg (within 1.8–2.2), fat `max(0.8·kg, 25% kcal / 9)`, carbs = remaining kcal floored at 0; round grams.

## 2. Question definitions

- [x] 2.1 Create `src/onboarding/questions.ts`: ordered field list (age → sex → height → weight → goal → activity → tz) with per-field type (numeric | choice), prompt text, inline-keyboard options (English `callback_data` literals: `sex:male|female`, `goal:cut|maintain|lean_bulk`, `activity:sedentary|light|moderate|active|very_active`, `tz:Europe/Kyiv`), and numeric validators with plausible ranges (age 13–100, height 100–250, weight 30–400).

## 3. Flow state machine (DB-backed)

- [x] 3.1 Create `src/onboarding/flow.ts`: `nextQuestion(userId)` resolves the first still-null field (weight treated as answered iff a `body_metrics` weight row exists) via one `users` fetch + `body_metrics` existence check — no N+1. Explicit-nullable return (`Question | null`; null = complete).
- [x] 3.2 `recordAnswer(userId, field, value)`: persist via tenancy helpers — numeric/choice fields update the `users` row; weight inserts a `body_metrics` row dated today in user TZ. Idempotent: ignore an answer for an already-set field.
- [x] 3.3 `completeOnboarding(userId)`: when all fields present, read them + the weight row, call `computeTargets`, write the four `target_*` columns on the `users` row. Returns the computed targets for the confirmation message.

## 4. Bot wiring

- [x] 4.1 In `src/bot/bot.ts`: rewire `/start` — find-or-create the `users` row by `chat_id`; if onboarding incomplete, ask `nextQuestion`; if complete, greet with existing targets.
- [x] 4.2 Add a `callback_query` handler: parse the English literal, `recordAnswer`, then ask the next question or finish + confirm. Acknowledge stale taps idempotently.
- [x] 4.3 Gate `message:text`: if the acting user's onboarding is incomplete, route the message to the current numeric question (validate → record or re-ask); else fall through to the existing router path. Commands (leading `/`) still dispatch via grammY.
- [x] 4.4 Confirmation message: prose mirrors the user's language; interpolated numbers come from `computeTargets` (never the model). English literals stay in storage.

## 5. Tests (mirror into test/onboarding/)

- [x] 5.1 `calculator.test.ts`: BMR matches the Mifflin formula for a known male+female case; macros respect 1.8–2.2 g/kg protein, ≥0.8 g/kg fat; `4·protein + 4·carbs + 9·fat ≈ kcal` within rounding.
- [x] 5.2 `calculator.test.ts`: **no-extreme-deficit** — an aggressive cut input clamps up to `max(BMR, 1200)`, never below.
- [x] 5.3 `flow.test.ts`: next-question resolution skips already-answered fields and treats weight as answered only when a `body_metrics` row exists; restart resumes mid-flow (invariant #1: state from DB, not chat).
- [x] 5.4 `flow.test.ts`: out-of-range numeric answer is **not** persisted and re-asks; valid answer persists and advances.
- [x] 5.5 `flow.test.ts`: weight is written to `body_metrics` (not `users`), scoped to the acting `user_id` (invariant #8); enum/literal values stored in English (invariant #6).
- [x] 5.6 `bot.test.ts`: `/start` on unknown chat creates exactly one user and asks the first question; text gate routes a bare number to onboarding when incomplete and to the router when complete.

## 6. Review (maker ≠ checker)

- [x] 6.1 Hand the diff to a **separate reviewer subagent** running the `review` skill (Standards + Spec axes). Resolve every finding before commit. Do not self-approve.
