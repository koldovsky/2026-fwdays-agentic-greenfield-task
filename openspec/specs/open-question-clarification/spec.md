# open-question-clarification

## Purpose

Precision-first clarification for food logging (US-6): on a `log` event, after the food is resolved,
the system decides whether to log directly or raise exactly one clarifying question when a
high-leverage calorie-mover is hidden or ambiguous (per ADR-0015). A raised question is held in an
ephemeral, per-`chat_id` in-memory Open Question store (ADR-0019) — never in the DB, never retaining
chat history (invariant #1). The next inbound message resolves the pending question (refine + write a
tenant-scoped `food_log` row) or, past a short lazily-checked TTL, expires it to a logged `estimate`
fallback that never drops the entry. At most one question per event, at most one pending question per
user, and at most one LLM call to resolve — no agent loop, no interrogation (invariants #3, #5, #6, #8).
## Requirements
### Requirement: Decide ask-vs-log on a logging event

On a `log` event, after the food is resolved, the system SHALL decide whether to **log directly** or
**raise one clarifying question**, per the precision-first policy
([ADR-0015](../../../docs/adr/0015-coach-persona-precision-first-clarification.md)). It SHALL raise
a question only when a **high-leverage** calorie-mover is hidden or ambiguous — cooking fat
(oil/butter/ghee), sauce/dressing/mayo, fried-vs-baked-vs-raw, unknown portion, sugary drink, protein
variant fat% (творог 0/5/9), or **multiple Food-Database matches** for the named product. When the
calorie-setting information is already complete (complete text, a clean single Food-DB match), it
SHALL log with **no** question. Uncertainty below the leverage threshold (≈±50 kcal) SHALL be logged
as an estimate, not questioned (invariant #3). The ask-vs-log decision SHALL add **no** LLM call
beyond the resolution the log path already performs — the semantic judgment rides the existing
structured estimate call, and code detects the mechanical unknowns (missing quantity, multiple
matches).

#### Scenario: Hidden high-leverage unknown raises one question
- **WHEN** the user logs an item whose calorie-setting detail is hidden (e.g. "творог" of unstated
  fat%, or "картошка" without oil/prep)
- **THEN** the system raises exactly one clarifying question targeting that variable instead of
  writing a `food_log` row

#### Scenario: Complete input logs with no question
- **WHEN** the input already carries the calorie-setting detail (e.g. "200г куриного филе") or matches
  a single Food-DB row cleanly
- **THEN** the system logs the entry directly with no clarifying question

#### Scenario: Multiple Food-DB matches raise a disambiguation question
- **WHEN** the named product matches more than one `food_database` row (own + global catalog)
- **THEN** the system asks which one, offering the matches as fixed choices, rather than guessing

#### Scenario: Sub-threshold uncertainty is logged, not asked
- **WHEN** the only uncertainty moves the entry ≈±50 kcal or less
- **THEN** the system logs an `estimate` without asking (invariant #3 pressure-release)

### Requirement: At most one batched question, no multi-turn chain

A logging event SHALL trigger **at most one** clarifying message, batching the highest-leverage
unknown(s) into a single question (invariant #5 — no agent loop, no interrogation). Fixed-choice
unknowns (fat%, fried/baked, which catalog match) SHALL be offered as an **inline keyboard**;
open-ended unknowns (portion, free description) SHALL accept free text. The question prose SHALL
mirror the user's language while any structural choice values stay English (invariant #6).

#### Scenario: Fixed-choice unknown uses an inline keyboard
- **WHEN** the hidden unknown has a small fixed answer set (e.g. творог 0% / 5% / 9%)
- **THEN** the question is posed with inline-keyboard buttons for those choices

#### Scenario: No second question for the same event
- **WHEN** one clarifying question has already been raised for a logging event
- **THEN** the system does not raise a second follow-up question for that same event — it logs on the
  answer or on expiry

#### Scenario: Question prose mirrors language, choice values stay English
- **WHEN** the user wrote in Russian
- **THEN** the question prose is Russian while any structured callback/choice values remain English
  literals

### Requirement: Ephemeral in-memory Open Question store

A raised Open Question SHALL be held in an **in-memory**, per-`chat_id` store
([ADR-0019](../../../docs/adr/0019-in-memory-open-question-store.md)) — never in the database. The
Open Question is a **discriminated union** over how it will be resolved: a **text** variant holding the
single resolved-so-far food + the routed message context (the text-log ask), and a **photo** variant
holding the resolved-so-far **item list** for a plate (the vision ask). Neither variant SHALL hold the
photo bytes — the image is discarded immediately after the vision call (invariant #4). Each entry SHALL
hold only what is needed to log on resolution: for text, the resolved-so-far food, routed context, and
target date; for photo, the resolved item list, the plate clarification, and the meal/date captured at
ask time — plus an `askedAt` timestamp in both. The store SHALL NOT retain chat history or any earlier
turns (invariant #1 — the DB is the memory; the model sees only the current message plus the pending
question). At most one Open Question SHALL be pending per user at a time, regardless of variant.

#### Scenario: The pending question holds no chat transcript
- **WHEN** an Open Question is stored
- **THEN** the stored record contains only the pending clarification's own data (resolved food or item
  list, routed/meal context, date, timestamp) and no prior conversation turns

#### Scenario: The photo variant holds an item list and no image
- **WHEN** a plate photo raises a clarifying question
- **THEN** the pending record holds the resolved item list, the plate clarification, and meal/date —
  and no image bytes (the photo was already discarded)

#### Scenario: A new logging event replaces any stale pending question
- **WHEN** a user already has an Open Question pending and sends a fresh unrelated message that
  resolves or expires it
- **THEN** at most one Open Question remains pending for that user afterward, regardless of variant

### Requirement: Resolve the pending question from the next message

While an Open Question is pending, the next inbound message SHALL be classified with
`hasPendingQuestion = true` so the router's `answer` intent is selectable (message-router). An
`answer` SHALL **refine** the resolved-so-far food (apply the fixed choice or parse the free-text
detail) and then write one **tenant-scoped** `food_log` row through the existing food-logging path
(invariant #8), clearing the pending question. Resolving an answer SHALL cost **at most one** LLM call
(invariant #5) and send **no** chat history beyond the pending question + the reply (invariant #1).

#### Scenario: A fixed-choice tap resolves and logs
- **WHEN** the user taps an inline-keyboard choice answering the pending question
- **THEN** the resolved food is refined with that choice and one tenant-scoped `food_log` row is
  written, and the pending question is cleared

#### Scenario: A free-text reply resolves and logs
- **WHEN** the user replies in free text (e.g. "150 грамм") to the pending question
- **THEN** the message classifies as `answer`, the detail refines the entry, and it is logged for the
  originally-resolved date

#### Scenario: Refined entry is written for the original date, tenant-scoped
- **WHEN** an answer resolves a question that was raised for a back-dated entry ("вчера …")
- **THEN** the written row carries the originally-resolved date and the acting user's `user_id`

### Requirement: Expiry falls back to a logged estimate, never drops the entry

The Open Question SHALL expire after a short TTL (minutes), checked **lazily** on the next inbound
message — no background timer or cron (invariant #5,
[ADR-0019](../../../docs/adr/0019-in-memory-open-question-store.md)). When a message arrives after
the TTL, the system SHALL first log the best `estimate` (`source = estimate`, ±20–30%) for the
expired question — never dropping the entry — and then handle the newly-arrived message fresh (it is
**not** consumed as the answer). The estimate is the **fallback**, not the first move.

#### Scenario: Late message triggers the fallback estimate then processes fresh
- **WHEN** the next message arrives after the Open Question's TTL has passed
- **THEN** the pending entry is logged as an `estimate`, and the new message is then classified and
  handled on its own (not treated as the answer)

#### Scenario: Fallback never drops the entry
- **WHEN** an Open Question expires unanswered
- **THEN** the entry it was clarifying is still recorded as an `estimate`, not discarded

### Requirement: Ask/log discrimination eval

The change SHALL author an ask/log **discrimination** dataset eval (deterministic code grader,
[ADR-0013](../../../docs/adr/0013-eval-framework.md)): labeled cases assert a clarifying question
fires on high-leverage hidden unknowns and **only** those, while complete text and clean single
Food-DB matches do **not** trigger a question. Cases SHALL be tagged by capability and carry a
`trace` to US-6. The live LLM run is deploy-time (no key in CI); the key-less ratchet gates committed
scores.

#### Scenario: Discrimination cases cover ask and no-ask
- **WHEN** the eval dataset is authored
- **THEN** it includes both cases that MUST raise a question (hidden fat%, unknown portion, multiple
  matches) and cases that MUST NOT (complete text, clean Food-DB match)

#### Scenario: Eval is capability-tagged and traced to US-6
- **WHEN** a discrimination case is added
- **THEN** it carries the capability tag the eval gate selects on and a `trace` to US-6

### Requirement: Resolve a photo Open Question by one text-only item-list refine

While a **photo** Open Question is pending, the next inbound answer SHALL refine the **held item list**
— never re-run vision, since the image is already discarded (invariant #4). The refine SHALL cost **at
most one** text-only structured LLM call (invariant #5) that adjusts the items for the answered mover
(a tapped fixed choice or free-text detail), then write **one tenant-scoped `food_log` row per item**
through the existing food-photo write path (invariants #2/#8), clearing the pending question. The model
SHALL receive **no** chat history beyond the held items plus the reply (invariant #1). Confirmation
prose SHALL mirror the caption's language while structural values stay English (invariant #6).

#### Scenario: A plate answer refines items and logs one row each
- **WHEN** the user answers a pending plate question (tap or free text)
- **THEN** the held items are refined by at most one text-only call and one `food_log` row is written
  per item, and the pending question is cleared

#### Scenario: The plate refine never re-runs vision
- **WHEN** the plate answer is resolved
- **THEN** no vision request is issued and no image is sent — only the held items and the reply reach
  the model

### Requirement: An expired photo Open Question logs every held item with its resolved source

The system SHALL log **all** held items with their **resolved** source (fact/estimate) — never dropping
any — when a **photo** Open Question expires unanswered (short lazily-checked TTL, no timer — invariant
#5), using the macros resolved at ask time (a catalog `fact` stays a `fact`, a visual-only `estimate`
stays an `estimate` — invariant #3) — writing one tenant-scoped `food_log` row per item for the
originally-captured meal and date, then handle the newly-arrived message fresh (it is **not** consumed
as the answer). The fallback logs what was already resolved — it is not the first move.

#### Scenario: A late message logs the full plate then processes fresh
- **WHEN** the next message arrives after a plate question's TTL has passed
- **THEN** every held item is logged as a `food_log` row for its original meal/date keeping its
  resolved `source`, and the new message is then classified and handled on its own (not treated as the
  answer)

#### Scenario: Plate expiry drops nothing
- **WHEN** a plate question expires unanswered
- **THEN** all items it was clarifying are still recorded (keeping their resolved fact/estimate source),
  none discarded

