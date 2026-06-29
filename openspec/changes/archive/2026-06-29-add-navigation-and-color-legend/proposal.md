## Why

Two usability gaps: the highlighter swatches don't say what each color means, and inner
pages (book, forms, note editor) have no consistent way back. Add a color legend and
breadcrumb navigation.

## What Changes

- Add **breadcrumb navigation** to inner pages: book page, book new/edit, note new/edit
  (e.g. `The shelf / <Book> / Add note`), with all but the current crumb linked.
- Add a **highlighter color legend** to the note editor showing each color's meaning
  (Idea, Question, Disagree, Resonates, Theme, Fact, Term, Quote); the selected color is emphasized.

## Capabilities

### New Capabilities
- `navigation`: breadcrumb trail on inner pages.

### Modified Capabilities
- `note-editor`: the highlighter picker is accompanied by a legend of color meanings.

## Impact

- New: `components/Breadcrumbs.tsx` (+ test).
- Modified: `components/NoteForm.tsx` (legend); `app/book/[slug]/page.tsx`,
  `app/book/new`, `app/book/[slug]/edit`, `app/book/[slug]/notes/new`,
  `app/book/[slug]/notes/[noteId]/edit` (breadcrumbs).
