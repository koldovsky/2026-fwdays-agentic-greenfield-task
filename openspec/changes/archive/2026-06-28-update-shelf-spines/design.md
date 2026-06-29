## Context

The shelf index (C11) currently renders books as DS `BookCard` cover tiles in a grid,
each a link. We move to a bookshelf metaphor: vertical spines, hover highlight, and a
click-to-open summary popup. The design system ships neither a spine nor a modal, so
both are built from tokens.

## Goals / Non-Goals

**Goals:**
- A shelf that reads like real books standing up; quick glance at a summary without
  leaving the page; the full book page stays one click away.

**Non-Goals:**
- No new data; no change to `/book/[slug]`. No DS-library change (built app-side; could
  be synced into the design system later).

## Decisions

- **Spine = colored tile + vertical text.** Background reuses the cover gradient map
  (extracted to `components/cover.ts` so spine and popup share it). Title/author use
  `writing-mode: vertical-rl`. Height varies by a deterministic hash of the slug so the
  shelf looks organic but stays stable across renders (no `Math.random` → no hydration drift).
- **Hover via CSS class** (`bs-spine` in globals.css) not JS — cheaper and no state.
- **Popup state lives in a client wrapper** `ShelfClient` (`useState<active book>`). The
  page stays a server component (loads + groups books), passing plain data down.
- **Popup = scrim + card**, reusing the design system's modal scrim recipe
  (`#17130c66` + blur). Dismiss on scrim click, a close control, and Escape.
- **Cover in popup**: image when `cover` is set, else a generated `coverColor` block
  with the title (mirrors `BookCard`'s generated cover).

## Risks / Trade-offs

- [Vertical text legibility on small spines] → cap title length / ellipsis; author smaller.
- [Popup accessibility] → role="dialog", aria-modal, focusable close, Escape handler.
- [Spine view diverges from the design system] → acceptable now; note for a future DS sync.

## Open Questions

- None blocking.
