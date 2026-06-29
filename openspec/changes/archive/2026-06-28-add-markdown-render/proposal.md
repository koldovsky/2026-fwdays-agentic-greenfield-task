# Proposal: add-markdown-render

## Why
Summaries and note reflections are authored in Markdown and contain `[[…]]`
wiki-links to books and notes. The app needs to render that Markdown to HTML and
turn in-text references into real navigation links so readers can move between
related content.

## What Changes
- Add `lib/markdown.ts` exporting `renderMarkdown(md: string): Promise<string>`.
- Expand `[[book:<slug>]]` and `[[note:<slug>/<id>]]` wiki-links into Markdown
  links (using the C6 `linkHref`) **before** rendering.
- Render standard Markdown (headings, emphasis, etc.) to HTML via remark +
  remark-html.
- Leave malformed `[[…]]` tokens as literal text.

## Capabilities
- New: `markdown-render`

## Impact
- New module `lib/markdown.ts` and test `lib/markdown.test.ts`.
- Consumes existing `lib/content/links.ts` (`parseLink`, `linkHref`).
- Depends on already-installed `remark` and `remark-html`.
- No changes to other capabilities or build configuration.
