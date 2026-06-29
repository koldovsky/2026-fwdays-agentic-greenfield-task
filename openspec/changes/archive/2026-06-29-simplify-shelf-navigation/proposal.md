## Why

The click-to-open summary modal depended on client-side hydration: in browsers where the
shelf's JS didn't hydrate, clicking a book did nothing (only the CSS hover preview showed,
which had no way forward). Users got stuck with no path to the book page. Navigation must
not depend on JS.

## What Changes

- The book **spine is now a real link** (`<a href="/book/<slug>">`) — clicking a book
  navigates to its page in every browser, with or without JS. **BREAKING**: clicking no
  longer opens a modal.
- The **hover preview** now contains real "Open book" and "Add note" links.
- The **click-to-open summary popup (modal) is removed** (the `BookPopup` component).

## Capabilities

### Modified Capabilities
- `shelf-index`: spine becomes a navigating link; hover preview gains action links; the
  modal popup is removed.

## Impact

- Modified: `components/BookSpine.tsx` (now a `Link`), `components/ShelfClient.tsx` (no
  longer a client component / no modal state), `app/globals.css`.
- Removed: `components/BookPopup.tsx`.
- Verified click-navigation in both Chromium and WebKit (Safari engine).
