## MODIFIED Requirements

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

### Requirement: The image is never persisted
The system SHALL stream **every** supplied photo's bytes to the single vision call and discard them
immediately. It SHALL NOT write any image to disk, object storage, or the database at any point
(invariant #4), including while several images are buffered for one media group. Only the extracted
text/structured items and the resulting `food_log` rows are persisted.

#### Scenario: No image bytes are written anywhere, across all images
- **WHEN** one or more photos are processed (including a buffered multi-photo media group)
- **THEN** no filesystem, storage, or database write of any image's bytes occurs — the bytes live
  only transiently in memory for the duration of the vision call and are then released

## ADDED Requirements

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
