# Change: add-slug

## Why
Book folders need stable, URL-safe identifiers derived from human-entered titles,
including Ukrainian Cyrillic titles. A deterministic slug generator gives the
content store a predictable folder name and a sensible default the user can edit
before saving.

## What Changes
- Add a `slugify(title)` function that lowercases the title, transliterates
  Ukrainian Cyrillic to Latin, collapses runs of non-alphanumerics into single
  dashes, trims leading/trailing dashes, and falls back to `book` when no usable
  characters remain.

## Capabilities
- New: `slug`

## Impact
- New module: `lib/content/slug.ts`
- New test: `lib/content/slug.test.ts`
- Consumed later by the book store (slug resolution / collision handling).
