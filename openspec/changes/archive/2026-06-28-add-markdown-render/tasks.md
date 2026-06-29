# Tasks: add-markdown-render

- [x] Write failing test `lib/markdown.test.ts`
- [x] Implement `renderMarkdown` in `lib/markdown.ts`
- [x] Expand `[[book:<slug>]]` wiki-links to anchor links via C6 `linkHref`
- [x] Expand `[[note:<slug>/<id>]]` wiki-links to anchor links via C6 `linkHref`
- [x] Preserve malformed `[[…]]` tokens as literal text
- [x] Render standard Markdown (headings, emphasis) to HTML
- [x] Run `npx vitest run lib/markdown.test.ts` — all green
