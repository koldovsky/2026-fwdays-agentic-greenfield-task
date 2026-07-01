## ADDED Requirements

### Requirement: Plate photo may raise one precision-first clarifying question

The system SHALL raise **at most one** plate-level clarifying question when a plate photo hides a
**high-leverage** calorie-mover — added cooking fat (oil/butter/ghee), sauce/dressing/mayo,
fried-vs-baked-vs-raw, or an unknown portion for a dominant item. The single
vision call SHALL flag it via an **optional plate-level `clarify`** field in the **same one** vision
response (invariant #5 — no second model call to detect it). When `clarify` is present the system
SHALL, instead of writing immediately, hold the extracted item list as a **photo-variant Open
Question** (open-question-clarification) and pose **exactly one** batched question, reusing the
inline-keyboard UI for fixed choices and free text otherwise. When `clarify` is absent the system
SHALL log the plate immediately exactly as before (per-item fact/estimate, one row per item). The
plate ask SHALL fire **only** on such a hidden high-leverage mover — a fully-specified plate
(complete portions, no hidden fat) SHALL log with no question. The uncertainty of any individual
`estimate` item below the leverage threshold SHALL be surfaced by the estimate tag, not questioned
(invariant #3).

#### Scenario: A hidden plate-level mover raises one question
- **WHEN** the vision call returns items plus a `clarify` flag (e.g. a salad whose dressing/oil is
  unstated)
- **THEN** the system poses exactly one clarifying question and holds the item list, writing no
  `food_log` row yet

#### Scenario: A fully-specified plate logs with no question
- **WHEN** the vision call returns items with no `clarify` flag
- **THEN** the plate is logged immediately with one row per item and no clarifying question

#### Scenario: Still exactly one vision call
- **WHEN** the plate is processed, whether or not a question is raised
- **THEN** the vision model is called exactly once; the `clarify` flag rides that same response with
  no extra call to detect the mover

### Requirement: The plate answer is applied by one text-only refine — never re-vision

The plate answer SHALL be applied **without re-running vision**, because the image is discarded
immediately after the vision call (invariant #4). The system SHALL make **at most one**
text-only structured LLM call (invariant #5) that adjusts the **held item list** for the answered
mover (e.g. folding in "with 1 tbsp oil" or a chosen portion), then write **one code-scaled,
tenant-scoped `food_log` row per item** (invariants #2/#8) and confirm. No chat history beyond the
held items plus the reply SHALL reach the model (invariant #1). Enum/structural values (`meal`,
`source`, `per`, units) SHALL stay English while confirmation prose mirrors the caption's language
(invariant #6).

#### Scenario: Answering the plate question refines items text-only and logs
- **WHEN** the user answers the plate question (tap or free text)
- **THEN** the held items are refined by at most one text-only structured call, one `food_log` row is
  written per item with code-scaled macros, and no vision call is issued

#### Scenario: The refine sends no image and no chat history
- **WHEN** the plate answer is resolved
- **THEN** the model receives only the held items and the reply — never the (already-discarded) image
  and never prior conversation turns

### Requirement: An expired plate question logs every held item with its resolved source

The system SHALL log **all** held items with their **resolved** source (fact/estimate) — never dropping
any — when a plate Open Question expires unanswered (short lazily-checked TTL, no timer — invariant #5),
using the macros resolved at ask time. A catalog `fact` item SHALL stay a `fact` and a visual-only
`estimate` SHALL stay an `estimate` (invariant #3 — catalog match = fact). One tenant-scoped `food_log`
row per held item SHALL be written for the originally-resolved meal and local date. The fallback logs
what was already resolved — it is not the first move.

#### Scenario: Expiry logs the full plate, preserving each item's source
- **WHEN** a plate question expires unanswered
- **THEN** every held item is written as a `food_log` row for the original meal and date, keeping its
  resolved `source` (a `fact` stays `fact`, an `estimate` stays `estimate`), and none is dropped

#### Scenario: Expiry uses no additional model call
- **WHEN** the plate fallback fires
- **THEN** the held items are written directly from their detected macros with no further LLM call
