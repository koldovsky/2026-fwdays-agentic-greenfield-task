## MODIFIED Requirements

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

## ADDED Requirements

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
