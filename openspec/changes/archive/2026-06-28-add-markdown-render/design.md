# Design: add-markdown-render

## Context
Summaries and note reflections are Markdown with `[[…]]` wiki-links. The renderer
must produce HTML and convert valid wiki-links into navigation anchors. Link
parsing/href construction already exists in C6 (`lib/content/links.ts`).

## Goals / Non-Goals
- Goal: Render standard Markdown to HTML.
- Goal: Expand `[[book:<slug>]]` / `[[note:<slug>/<id>]]` into real links.
- Goal: Preserve malformed `[[…]]` tokens as literal text.
- Non-Goal: Sanitization beyond remark-html defaults.
- Non-Goal: Custom Markdown extensions (tables, footnotes, etc.).

## Decisions
- Expand wiki-links as a pre-pass string transform (`expandWikiLinks`) into
  Markdown link syntax, then render once with remark + remark-html. This keeps
  the renderer simple and reuses C6's `parseLink`/`linkHref` as the single
  source of truth for hrefs.
- Label = the link target's slug (book) or `slug/id` (note), matching the
  in-text reference the author wrote.
- `renderMarkdown` is async because `remark().process()` returns a Promise.

## Risks
- A `[[…]]` token spanning a `]` would not match the `[^\]]+` pattern; acceptable
  given wiki-link content never contains `]`.
- Relies on remark-html escaping behavior for safety; inputs are author-trusted.
