# Design: add-slug

## Context
Book titles are free-form and may be Ukrainian. The content store needs a stable,
URL-safe folder name. Slug is a foundation capability with no dependencies.

## Goals / Non-Goals
- Goals: deterministic, URL-safe slugs; Ukrainian Cyrillic transliteration; safe
  fallback for empty/symbol-only input.
- Non-Goals: collision/uniqueness resolution (handled by the book store);
  general-purpose multi-language transliteration beyond Ukrainian.

## Decisions
- Use an explicit Ukrainian Cyrillic to Latin character map applied after
  lowercasing; unmapped characters pass through and are then normalized.
- Normalize by replacing `[^a-z0-9]+` with `-` and trimming leading/trailing dashes.
- Drop apostrophes (`'` and `’`) so they do not introduce dashes.
- Return `book` when the normalized result is empty.

## Risks
- Transliteration is a simplified scheme; some edge characters may not match an
  official standard exactly. Acceptable because the user can edit the slug before saving.
