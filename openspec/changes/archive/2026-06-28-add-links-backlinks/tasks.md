# Tasks — Add Links & Backlinks

- [x] Write failing test `lib/content/links.test.ts`
- [x] Implement `lib/content/links.ts` (`parseLink`, `linkKey`, `linkHref`, `buildBacklinkIndex`, `isBrokenLink`)
- [x] `parseLink` parses book/note links and returns null for malformed input
- [x] `linkKey` / `linkHref` produce canonical keys and route hrefs
- [x] `buildBacklinkIndex` maps target key → sources `{ fromBook, fromNote }`
- [x] `isBrokenLink` flags dangling targets against the known set
- [x] Run `npx vitest run lib/content/links.test.ts` — GREEN
