# Design — add-book-page

## Approach
The book page is a server component (`dynamic = 'force-dynamic'`) that reads the
book via `readBook(slug)`, its notes via `listNotes(slug)`, renders the summary
through `renderMarkdown`, and loads the cross-book backlink index via
`loadBacklinkIndex()`.

## Components
- `NoteCardView({ note })`: maps `note.links` through `parseLink`, filters out
  unparseable entries, and renders the DS `NoteCard` with the outbound link
  count. Below the card it lists each resolved link as an anchor whose `href`
  comes from `linkHref`. The wrapper `<div id={note.id}>` is the navigation
  anchor target for inbound links.
- `Backlinks({ items })`: returns `null` when `items` is empty; otherwise a
  "Linked from" section listing each source as a link to the source book or
  source note (`/book/<slug>#<noteId>`).

## Decisions
- DS `NoteCard` is consumed as-is (color spine, excerpt, reflection, page,
  links count); the resolved link list lives in the wrapper, not the DS card.
- Backlink targets are keyed `book:<slug>`; the page queries
  `index.get('book:' + slug)`.
