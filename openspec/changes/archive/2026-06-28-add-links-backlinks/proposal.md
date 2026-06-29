# Add Links & Backlinks

## Why
Notes and books reference each other via `book:<slug>` and `note:<slug>/<id>` link
strings. We need pure logic to parse these links, derive canonical keys and route
hrefs, build a backlink index (who links to each target), and detect broken links.

## What Changes
- Add `lib/content/links.ts` with:
  - `parseLink` — parse `book:<slug>` / `note:<slug>/<id>`, return null when malformed.
  - `linkKey` — canonical key (`book:slug` / `note:slug/id`).
  - `linkHref` — route href (`/book/slug` / `/book/slug#id`).
  - `buildBacklinkIndex` — map target key → list of `{ fromBook, fromNote }` sources.
  - `isBrokenLink` — flag a link whose target is not in the known set.
- Add `lib/content/links.test.ts` covering all of the above.

## Capabilities
- New: `links-backlinks`

## Impact
- New module `lib/content/links.ts` (pure, no I/O).
- Depends on `lib/content/types.ts` (`Book`, `Note`) from C2.
- Consumed later by markdown rendering and query/index code.
