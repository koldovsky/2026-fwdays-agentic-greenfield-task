# Change: add-book-page

## Why
A reader needs a single page per book that shows the book's metadata, its
Markdown summary, all of its color-coded reading notes with their outbound
links, and a "Linked from" backlinks block. This is capability C12.

## What Changes
- Add `app/book/[slug]/page.tsx` — the book detail page (server component).
- Add `components/NoteCardView.tsx` — wraps the DS `NoteCard` and renders a
  note's resolved outbound links as clickable anchors. The wrapper carries the
  note id as its DOM `id` so links can target it.
- Add `components/Backlinks.tsx` — the "Linked from" block, hidden when empty.
- Reuse the existing `lib/content/index-data.ts` (`loadBacklinkIndex`) loader.

## Impact
- Affected capability: C12 (book-page).
- Affected code: `app/book/[slug]/page.tsx`, `components/NoteCardView.tsx`,
  `components/Backlinks.tsx`.
- 404 on unknown slug; malformed books still render with a notice.
