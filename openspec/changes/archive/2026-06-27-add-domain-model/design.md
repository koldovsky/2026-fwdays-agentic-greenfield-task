## Context

Second foundation capability. Pure types + one small constants module; consumed by the
stores, link/query logic, and the UI. No I/O, no framework coupling.

## Goals / Non-Goals

**Goals:**
- One canonical definition of `Book`/`Note` and the color vocabulary.
- A runtime guard for highlighter colors (used by the note store + forms to fall back safely).

**Non-Goals:**
- Frontmatter parsing/serialization (belongs to `book-store` / `note-store`).
- Status/rating validation logic (belongs to the stores; here they are just types).

## Decisions

- **Types mirror the on-disk frontmatter** (requirements §2.2–§2.4) so parse/serialize in
  the stores is a near-direct mapping.
- **Colors as a data array `{ value, label }`**, not an enum: the UI needs the labels and
  ordering (the `HighlighterPicker` swatch row), and `isNoteColor` derives from the array —
  single source of truth, no enum/label drift.
- **Default color `yellow`** matches the design system's `NoteCard` default.

## Risks / Trade-offs

- [Types can't be unit-tested at runtime] → Correctness is enforced by `tsc --noEmit`;
  the colors module (which has runtime behavior) is unit-tested.

## Open Questions

- None.
