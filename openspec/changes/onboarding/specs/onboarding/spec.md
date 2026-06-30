## ADDED Requirements

### Requirement: First-contact user creation
The system SHALL create a `users` row keyed on the Telegram `chat_id` the first time an unknown
chat sends `/start`, and SHALL NOT create a duplicate row for a `chat_id` that already exists.

#### Scenario: Unknown chat sends /start
- **WHEN** a `chat_id` with no `users` row sends `/start`
- **THEN** the system creates exactly one `users` row for that `chat_id` and begins the onboarding
  Q&A at the first unanswered field

#### Scenario: Known chat sends /start mid-onboarding
- **WHEN** a `chat_id` that already has a `users` row with onboarding incomplete sends `/start`
- **THEN** the system reuses the existing row and resumes at the first still-null field (no
  duplicate row, no loss of already-collected answers)

### Requirement: DB-backed onboarding progress
The system SHALL persist each onboarding answer to the DB as it is received and SHALL determine the
next question from persisted state, never from chat history (invariant #1). Onboarding progress
SHALL therefore survive a process restart.

#### Scenario: Answer is persisted immediately
- **WHEN** the user answers the current onboarding question
- **THEN** the system writes that value to the corresponding `users` column (or `body_metrics` for
  weight) before asking the next question

#### Scenario: Restart resumes from persisted state
- **WHEN** the bot process restarts after the user has answered some but not all questions
- **THEN** the next `/start` (or pending answer) resumes at the first still-null field, with no
  re-asking of already-answered fields

### Requirement: Onboarding question sequence
The system SHALL collect, in order, the fields required to compute targets: age, sex, height (cm),
weight (kg), goal, activity level, and timezone (default `Europe/Kyiv`). The next question asked
SHALL be the first field still missing.

#### Scenario: Fixed-choice question uses an inline keyboard
- **WHEN** the system asks for sex, goal, activity level, or timezone confirmation
- **THEN** it presents Telegram inline-keyboard buttons whose callback values are English literals
  (e.g. `goal: "cut" | "maintain" | "lean_bulk"`), and the user's tap is recorded as that literal

#### Scenario: Numeric question takes validated free text
- **WHEN** the system asks for age, height, or weight
- **THEN** it accepts a free-text number, parses it, and records it only if it falls within the
  plausible range for that field

#### Scenario: Out-of-range or unparseable numeric answer is re-asked
- **WHEN** the user replies to a numeric question with a value that is unparseable or outside the
  plausible range
- **THEN** the system does not persist it, explains the expected input, and re-asks the same
  question (it does not advance)

#### Scenario: Timezone defaults without blocking
- **WHEN** the system reaches the timezone question
- **THEN** it offers `Europe/Kyiv` as the default (one tap to accept) so onboarding can complete
  without the user knowing an IANA timezone name

### Requirement: Weight is recorded as a body metric
The system SHALL store the onboarding weight as the user's first `body_metrics` entry (dated today
in the user's timezone), not on the `users` row, and SHALL use that value as the Mifflin–St Jeor
weight input.

#### Scenario: Onboarding weight creates the first body_metrics row
- **WHEN** the user provides their weight during onboarding
- **THEN** the system inserts a `body_metrics` row for that `user_id` with `weight_kg` set and the
  date resolved in the user's timezone

### Requirement: Mifflin–St Jeor target calculation
The system SHALL compute targets in code (no LLM call) as: Mifflin–St Jeor BMR from age, sex,
height, and weight → TDEE = BMR × activity multiplier → goal-adjusted kcal. Protein SHALL be set in
the 1.8–2.2 g/kg range, fat SHALL be at least 0.8 g/kg (a floor), and carbs SHALL be the remaining
energy after protein and fat. Macro gram targets SHALL be internally consistent with the kcal
target (4/4/9 kcal per gram of protein/carb/fat).

#### Scenario: BMR uses the sex-specific Mifflin–St Jeor constant
- **WHEN** targets are computed
- **THEN** BMR = 10·kg + 6.25·cm − 5·age + s, where s = +5 for male and −161 for female

#### Scenario: Macros respect their floors and sum to the kcal target
- **WHEN** macro grams are computed for a given goal-adjusted kcal
- **THEN** protein is within 1.8–2.2 g/kg, fat is ≥ 0.8 g/kg, and
  protein_g·4 + carbs_g·4 + fat_g·9 equals the kcal target (within rounding)

### Requirement: No extreme deficits
A cutting goal SHALL apply a bounded calorie deficit: the goal-adjusted kcal SHALL NOT fall below a
safe floor (neither below BMR nor below an absolute minimum), so onboarding can never produce a
dangerously low target.

#### Scenario: Aggressive cut is clamped to the safe floor
- **WHEN** the computed deficit for a cut goal would push kcal below the safe floor (BMR or the
  absolute minimum, whichever is higher)
- **THEN** the system clamps the target up to that floor rather than returning the lower number

### Requirement: Targets persisted and confirmed
On completing onboarding the system SHALL write `target_kcal`, `target_protein_g`, `target_fat_g`,
and `target_carbs_g` to the `users` row and SHALL send the user a confirmation message stating their
targets.

#### Scenario: Completion writes targets and confirms
- **WHEN** the user answers the final onboarding question
- **THEN** the system persists the four target columns on the `users` row and replies with a
  confirmation that includes the kcal and macro numbers

#### Scenario: Confirmation prose mirrors the user's language; stored values stay English
- **WHEN** the confirmation is sent and during the whole flow
- **THEN** prose mirrors the user's language (RU/UA/EN), while stored enum/literal values
  (`goal`, `activity`, `sex`) remain English literals (invariant #6)

### Requirement: Tenant-scoped access
Every onboarding read and write SHALL be scoped to the acting user (by `chat_id` for the `users`
lookup and by `user_id` for `body_metrics`), per the multi-tenancy invariant.

#### Scenario: Writes carry the acting user's id
- **WHEN** onboarding writes a `body_metrics` row or updates the `users` row
- **THEN** the row is scoped to the acting user's `user_id` / `chat_id` and no other tenant's data
  is read or modified
