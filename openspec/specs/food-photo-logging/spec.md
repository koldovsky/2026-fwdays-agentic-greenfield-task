# food-photo-logging Specification

## Purpose
TBD - created by archiving change food-photo. Update Purpose after archive.
## Requirements
### Requirement: Plate photo logged in one vision call
The system SHALL accept one **or more** food photos and extract the eaten items in **exactly one**
vision request through the shared LLM seam (invariant #5 — no agent loop), even when multiple images
are supplied. A photo MAY be a **plate of food** or a **nutrition-facts label / macro screenshot**
(КБЖУ table). The request SHALL return a structured **multi-item** list where each item carries a
name, a `per` basis, per-basis macros (kcal + protein/fat/carb grams), an observed quantity, and a
`fromLabel` flag (whether its macros came from a printed label in one of the images). When a caption
is present it SHALL be treated as the **authoritative list of eaten items and quantities** (see the
caption-drives requirement below), not merely a naming hint. The system SHALL NOT issue a second
model call to log the photos.

#### Scenario: One or more photos produce itemized macros in one call
- **WHEN** a user sends one or more food photos (optionally captioned)
- **THEN** the system issues exactly one vision request over all supplied images and receives a
  structured list of items, each with a name, `per` basis, macros, quantity, and `fromLabel` flag —
  with no follow-up model round-trip

#### Scenario: A nutrition label is read as a label, not a plate
- **WHEN** an image is a nutrition-facts / КБЖУ label or a macro screenshot rather than a plate
- **THEN** the model reads the printed per-100g/ml macros for the matching caption item and sets that
  item's `fromLabel` to true, in the same single vision call

#### Scenario: Caption is the authoritative item list
- **WHEN** the photo message carries a caption naming what was eaten with quantities
- **THEN** the caption is included as the request's text and drives the emitted item list (one item
  per caption entry), with the images used as reference for macros

### Requirement: Each item tagged fact or estimate against the Food Database
For each extracted item the system SHALL decide its source with the precedence **label > Food Database
> visual/typical**:
- An item whose macros came from a printed nutrition label in one of the images (`fromLabel = true`)
  SHALL be logged as **`source: fact`** using the **label's** printed per-basis macros scaled by the
  caption quantity — it SHALL NOT be overridden by a Food Database lookup (the label the user just
  showed is authoritative for that product). This extends invariant #3: a nutrition label the user
  provides is a `fact` source, alongside a Food Database match.
- Otherwise the item name SHALL be looked up in the Food Database (the user's own rows **and** the
  global catalog, tenant-scoped — invariant #8) in a **single batched query** (no N+1): a **match**
  SHALL be logged as **`source: fact`** using the Food Database macros; a **miss** SHALL be logged as
  **`source: estimate`** (±20–30%) using the item's **own** vision macros — **without any additional
  LLM call** (invariant #5; the returned macros already *are* the estimate).

#### Scenario: A label-sourced item is logged as fact, not estimate
- **WHEN** an item's macros were read from a printed nutrition label (`fromLabel = true`)
- **THEN** it is logged with `source: fact` using the label's per-basis macros scaled by the caption
  quantity, and no Food Database lookup overrides those macros

#### Scenario: Caption/vision name matching the Food Database is logged as fact
- **WHEN** a non-label item's name matches a Food Database row (own or global)
- **THEN** that item is logged with `source: fact` and the Food Database macros, not the visual
  estimate

#### Scenario: A visual-only item is an honest estimate with no extra call
- **WHEN** a non-label item's name has no Food Database match
- **THEN** it is logged with `source: estimate` using the vision-provided macros, and no additional
  LLM request is made to price it

#### Scenario: Item lookups are batched
- **WHEN** multiple non-label items are extracted
- **THEN** the Food Database is queried once for all of their names, not once per item

### Requirement: One food_log row per item, numbers scaled in code
The system SHALL write **one tenant-scoped `food_log` row per plate item** (invariant #8). Each row's
stored macros SHALL be computed **in code** by scaling the resolved per-basis macros by the item's
quantity — never taken as a model-emitted total and never hand-summed across items (invariants #2).
The meal SHALL be inferred from the user's local clock and the date SHALL be the user's current local
date (user timezone). Enum and structural values (`meal`, `source`, `per`, unit labels) SHALL stay
English (invariant #6).

#### Scenario: A three-item plate writes three rows
- **WHEN** the vision call returns three items
- **THEN** three `food_log` rows are inserted, each carrying its own code-scaled macros, the same
  inferred meal, and the current local date

#### Scenario: Row macros are scaled, not hand-summed
- **WHEN** rows are written for a plate
- **THEN** each row's kcal/protein/fat/carbs come from scaling that item's per-basis macros by its
  quantity in code; no per-plate total is computed or stored (daily totals remain a SUM query)

### Requirement: Confirmation shows each item's own numbers, honestly and in the user's language
The confirmation SHALL be assembled **in code** (invariant #2 — the model writes no numbers) and
SHALL list **each logged item's own** macros, never a hand-summed plate total. When any item is an
`estimate`, the confirmation SHALL surface an honest estimate note (invariant #3). Prose SHALL mirror
the user's language (detected from the caption; a sensible default when there is no caption), while
enum/structural values stay English (invariant #6).

#### Scenario: Multi-item confirmation lists per-item macros
- **WHEN** a plate is logged
- **THEN** the confirmation shows one line per item with that item's own kcal and macros, and no
  combined plate total

#### Scenario: Estimates are surfaced honestly
- **WHEN** at least one logged item is an `estimate`
- **THEN** the confirmation includes an honest estimate note (±20–30%)

#### Scenario: Prose mirrors the caption language
- **WHEN** the caption is in Russian, Ukrainian, or English
- **THEN** the confirmation prose is in that language while `meal`/`source`/unit values remain English

### Requirement: The image is never persisted
The system SHALL stream **every** supplied photo's bytes to the single vision call and discard them
immediately. It SHALL NOT write any image to disk, object storage, or the database at any point
(invariant #4), including while several images are buffered for one media group. Only the extracted
text/structured items and the resulting `food_log` rows are persisted.

#### Scenario: No image bytes are written anywhere, across all images
- **WHEN** one or more photos are processed (including a buffered multi-photo media group)
- **THEN** no filesystem, storage, or database write of any image's bytes occurs — the bytes live
  only transiently in memory for the duration of the vision call and are then released

### Requirement: Every caption item is logged, including text-only items
When a caption lists what was eaten, the system SHALL log **one `food_log` row per caption item**,
including items that have **no corresponding photo** (e.g. sugar or black coffee described only in
text). A text-only item SHALL be logged with typical macros as `source: estimate` (unless it matches
the Food Database, then `fact`). No caption item SHALL be silently dropped for lack of a matching
image. The vision model SHALL convert each stated amount (grams, millilitres, teaspoons, or a count)
into the observed `qty` in the item's chosen `per` basis. Enum/structural values (`meal`, `source`,
`per`, units) stay English (invariant #6).

#### Scenario: A text-only item with no photo is still logged
- **WHEN** the caption names an item that appears in none of the photos (e.g. "1 tsp sugar")
- **THEN** a `food_log` row is written for it with typical macros as `source: estimate` (or `fact` on
  a Food Database match), and it is not dropped

#### Scenario: Labelled and text-only items are logged together
- **WHEN** a caption mixes labelled products (with a photo) and text-only items (no photo)
- **THEN** the labelled items are logged as `fact` from their label macros and the text-only items as
  `estimate`, each as its own code-scaled row — none omitted

#### Scenario: Stated amounts are converted into the basis quantity
- **WHEN** a caption states an amount in grams, millilitres, teaspoons, or a count
- **THEN** the item's observed `qty` is expressed in the chosen `per` basis unit so the row macros
  scale correctly

### Requirement: A multi-photo media group is one logging event
The system SHALL treat all photos a user sends as a **single Telegram media group** (sharing one
`media_group_id`) as **one** food-logging event: their images SHALL be buffered until the group is
complete (a short debounce) and then processed in **one** vision call together with the group's single
caption. A photo with **no** media group SHALL be processed immediately as a one-image event. Buffering
SHALL hold only transient image bytes in memory and SHALL NOT persist them (invariant #4). Progress-photo
routing SHALL be decided **per photo before** buffering, so a progress photo never enters the food
buffer.

#### Scenario: Three photos in one media group produce one vision call and one confirmation
- **WHEN** a user sends three photos in a single Telegram message (one `media_group_id`) with one
  caption
- **THEN** the system buffers the three images, issues exactly one vision call over all three plus the
  caption, and replies with one confirmation — not three separate calls or replies

#### Scenario: A single photo is logged without waiting
- **WHEN** a user sends a single photo with no media group
- **THEN** it is processed immediately as a one-image event, with the same label/plate handling

#### Scenario: A progress photo bypasses the food buffer
- **WHEN** a photo is routed as a progress photo (caption keyword or a fresh `/progress` arming flag)
- **THEN** it goes to progress analysis and is never added to the food media-group buffer

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

### Requirement: A multi-item plate offers to save the dish
The multi-item plate confirmation SHALL offer a **"save as dish"** affordance (an inline button) that
starts the composite-dish save flow (composite-dish capability), carrying the just-written `food_log`
row ids so the saved product's macros can be re-read and summed from those rows. The affordance SHALL
appear **only** when more than one item was logged, and SHALL be omitted (with a logged note, never a
truncated payload) when the row-id payload would exceed the callback size limit. Tapping it SHALL ask
the user for a name (free text) via the existing one-pending-per-chat question mechanic (ADR-0019),
and the user's next message SHALL be taken as the dish name. Declining (ignoring the button) SHALL
leave the already-logged rows untouched.

#### Scenario: A multi-item plate shows the save-as-dish button
- **WHEN** a plate logs more than one item
- **THEN** the confirmation includes a "save as dish" button carrying the written row ids

#### Scenario: Tapping asks for a name and the next message names the dish
- **WHEN** the user taps "save as dish"
- **THEN** the bot asks for a name and treats the next text message as the dish name, then saves the
  composite (composite-dish capability)

#### Scenario: A single-item plate shows no save button
- **WHEN** only one item was logged
- **THEN** no "save as dish" button is shown

