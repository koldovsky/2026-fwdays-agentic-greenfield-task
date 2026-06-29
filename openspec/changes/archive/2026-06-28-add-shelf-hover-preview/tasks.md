## 1. Implementation

- [x] 1.1 Add `spineWidth(slug)` to `components/cover.ts` (deterministic thickness)
- [x] 1.2 Rebuild `components/BookSpine.tsx`: book-like spine (binding highlight, head/tail bands, page-edge shadow) + a hover preview card (cover, title, author, summary)
- [x] 1.3 Add spine + preview styles to `app/globals.css` (`.bs-spine` bevel/bands, `.bs-preview` shown on `.bs-spine-wrap:hover`)

## 2. Verify

- [x] 2.1 `npm test` green (spine/shelf tests updated for the duplicated title/author + preview summary)
- [x] 2.2 `npx tsc --noEmit` clean; `npm run build` green
- [x] 2.3 Playwright live check: spines render, preview hidden by default and visible on hover (no scrim), click opens the full popup, no console errors
