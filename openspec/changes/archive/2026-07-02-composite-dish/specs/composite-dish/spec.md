## ADDED Requirements

### Requirement: Save a multi-item dish as one named Food-DB product
The system SHALL let a user save a just-logged **multi-item** dish as a **single** `food_database`
row owned by that user (invariant #8), named by the user, with basis **`portion`** representing the
whole dish as one serving. The row's macros SHALL be the dish components' kcal/protein/fat/carbs
**summed in code** (invariant #2 — never a model-emitted number), computed by **re-reading the dish's
`food_log` rows from the database** at save time (invariant #1 — the DB is the memory), not from any
chat or UI state. Saving SHALL make **zero** LLM calls. A single-item log SHALL NOT offer the save
(its own entry already is the product).

#### Scenario: A logged dish is saved as a named portion product
- **WHEN** a user saves a multi-item dish under the name "protein cocktail"
- **THEN** one tenant-scoped `food_database` row is created named "protein cocktail" with `per:
  portion` whose macros equal the sum of the dish's `food_log` rows, and no LLM call is made

#### Scenario: Numbers are summed in code from re-read rows
- **WHEN** the dish is saved
- **THEN** the stored macros come from re-reading the dish's `food_log` rows and summing them in code,
  not from a number carried in the button/chat state or written by the model

#### Scenario: A single-item log offers no dish save
- **WHEN** only one item was logged
- **THEN** no "save as dish" affordance is shown

### Requirement: Re-log a saved dish by name as a fact
The system SHALL log a saved dish when the user later names it, resolving it through the **existing**
Food Database name lookup (own + global, tenant-scoped) — a match logs **`source: fact`** with the
saved portion macros, **scaled by the stated quantity** in code (one portion by default, `2` → two
portions), with **no** estimate/LLM call. This reuse SHALL require no lookup path beyond the one text
logging already uses.

#### Scenario: Logging the dish name records the summed macros as fact
- **WHEN** the user later logs "protein cocktail"
- **THEN** one `food_log` row is written with `source: fact` and the saved portion's macros (one
  portion), with no estimate call

#### Scenario: A quantity scales the saved portion
- **WHEN** the user logs "2 protein cocktail"
- **THEN** the logged macros are the saved portion scaled by two, computed in code

### Requirement: Re-saving a dish name updates rather than duplicates
The system SHALL treat a save under a name the user already owns as an **update** of that
`food_database` row's macros (find-or-update by `(user_id, name)`, case-insensitive), not a second
row — so re-saving "protein cocktail" refreshes it. A save SHALL never modify another user's or the
global catalog's row (invariant #8); a name clashing with a global product creates the user's own row
(own-preferred on lookup).

#### Scenario: Re-saving the same name refreshes the product
- **WHEN** a user saves "protein cocktail" a second time with different components
- **THEN** their existing "protein cocktail" row's macros are updated and no duplicate row is created

#### Scenario: Save is tenant-scoped
- **WHEN** a user saves a dish whose name matches a global-catalog product
- **THEN** a new **user-owned** row is created (or the user's own row updated) and the global row is
  never modified

### Requirement: A saved dish is mirrored to Notion best-effort
The system SHALL enqueue the new/updated `food_database` row for the async Notion mirror (US-10)
after the save commits — best-effort, never blocking or failing the reply (Postgres is the source of
truth, invariant #1).

#### Scenario: Saving enqueues a mirror job without blocking
- **WHEN** a dish is saved
- **THEN** a Notion mirror job is enqueued after commit and a mirror failure never breaks the save
  confirmation
