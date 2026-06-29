# Bookshelf — Web App UI Kit

A click-through recreation of the Bookshelf reading-notes app. Open `index.html`.

## Flow
- **Shelf (home)** — books grouped by tag/shelf, plus a "Currently reading" band. Search, sort, add-book in the header. Click any book to open it.
- **Book page** — generated cover, 1–10 rating (click to re-rate), status, tags, and three tabs: **Notes** (color-coded `NoteCard` list), **Summary** (ruled-paper serif), **Links** (cross-references).
- **Note editor** — modal sheet: pick a highlighter color (the passage preview tints live), write the passage + your note, set a page, link to other books/notes.

## Files
- `index.html` — app shell + state routing (home ↔ book, note modal, dark toggle)
- `data.js` — sample library (`window.BS_DATA`: books, notes, shelves)
- `Sidebar.jsx` — nav + shelves + theme toggle
- `HomeShelf.jsx` — grouped shelf grid
- `BookPage.jsx` — single-book detail with tabs
- `NoteEditor.jsx` — note creation/edit modal

## Built from
Design-system primitives via `window.BookshelfDesignSystem_18192e`: `BookCard`, `NoteCard`, `Rating`,
`HighlighterPicker`, `Tabs`, `Tag`, `Badge`, `Button`, `Input`, `Select`, `Textarea`, `Card`, `Avatar`.
Icons: Lucide (CDN). Dark mode via `data-theme="dark"` on `<html>`.
