## Why

Every capability above storage needs a shared, framework-free vocabulary: the `Book`
and `Note` shapes, the book status set, cover colors, and the 8 highlighter colors with
their fixed meanings. Defining it once prevents each store/UI from inventing its own
types. Second change in the sequence (see `docs/openspec/README.md`).

## What Changes

- Introduce the `domain-model` capability.
- Define TypeScript types: `BookStatus` (`reading|finished|toread`), `CoverColor`,
  `HighlighterKey` (8 colors), `BookMeta`, `Book` (adds slug, body, malformed), `Note`.
- Define the highlighter color set with English labels/meanings, the default color
  (`yellow`), and a runtime guard `isNoteColor`.

## Capabilities

### New Capabilities
- `domain-model`: shared types and the highlighter color set (with meanings + guard).

### Modified Capabilities
<!-- none -->

## Impact

- New code: `lib/content/types.ts`, `lib/content/colors.ts` (+ Vitest test for colors).
- Consumed by `book-store`, `note-store`, links/queries, and all UI capabilities.
- No new runtime dependencies. No user-facing change yet.
