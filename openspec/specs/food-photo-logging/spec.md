# food-photo-logging Specification

## Purpose
TBD - created by archiving change food-photo. Update Purpose after archive.
## Requirements
### Requirement: Plate photo logged in one vision call
The system SHALL accept a plate photo and extract its food items in **exactly one** vision request
through the shared LLM seam (invariant #5 — no agent loop). The request SHALL return a structured
**multi-item** list where each item carries a name, a `per` basis, per-basis macros (kcal + protein/
fat/carb grams), and an observed quantity. Any caption on the photo SHALL be passed as the request's
text so the model can name items precisely. The system SHALL NOT issue a second model call to log the
plate.

#### Scenario: A plate photo produces itemized macros in one call
- **WHEN** a user sends a plate photo (optionally captioned)
- **THEN** the system issues exactly one vision request and receives a structured list of items, each
  with a name, `per` basis, macros, and quantity — with no follow-up model round-trip

#### Scenario: Caption guides item naming
- **WHEN** the photo carries a caption naming what is on the plate
- **THEN** the caption is included as the request's text so the model's item names reflect it

### Requirement: Each item tagged fact or estimate against the Food Database
For each extracted item the system SHALL look the item name up in the Food Database (the user's own
rows **and** the global catalog, tenant-scoped — invariant #8). A **match SHALL be logged as
`source: fact`** using the Food Database macros (a caption or vision name that resolves to a catalog
product prefers Food Database macros over the visual estimate). A **miss SHALL be logged as
`source: estimate`** (±20–30%) using the vision item's **own** macros — **without any additional LLM
call** (invariant #5; the visual macros already returned *are* the estimate). Food Database lookups
SHALL be performed for all item names in a **single batched query**, never one query per item (no
N+1).

#### Scenario: Caption/vision name matching the Food Database is logged as fact
- **WHEN** an extracted item's name matches a Food Database row (own or global)
- **THEN** that item is logged with `source: fact` and the Food Database macros, not the visual
  estimate

#### Scenario: A visual-only item is an honest estimate with no extra call
- **WHEN** an extracted item's name has no Food Database match
- **THEN** it is logged with `source: estimate` using the vision-provided macros, and no additional
  LLM request is made to price it

#### Scenario: Item lookups are batched
- **WHEN** a plate yields multiple items
- **THEN** the Food Database is queried once for all item names, not once per item

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
The system SHALL stream the photo bytes to the vision call and discard them immediately. It SHALL
NOT write the image to disk, object storage, or the database at any point (invariant #4). Only the
extracted text/structured items and the resulting `food_log` rows are persisted.

#### Scenario: No image bytes are written anywhere
- **WHEN** a plate photo is processed
- **THEN** no filesystem, storage, or database write of the image bytes occurs — the bytes live only
  transiently in memory for the duration of the vision call and are then released

