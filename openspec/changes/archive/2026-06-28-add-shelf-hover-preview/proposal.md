## Why

Spines should look like real books, and hovering one should give a quick preview
without the heavy modal — the full popup stays for a deliberate click.

## What Changes

- Spines get a book-like appearance: binding highlight, head/tail bands, page-edge
  shadow, and deterministic thickness (in addition to height).
- **Hover** now shows a lightweight preview card (cover, title, author, summary) with
  no modal scrim. The full popup still opens on **click**.

## Capabilities

### Modified Capabilities
- `shelf-index`: spine appearance refined; hover adds a scrim-less preview card.

## Impact

- Modified: `components/BookSpine.tsx`, `components/cover.ts`, `app/globals.css`.
- No data or routing changes. Click-to-popup behavior unchanged.
