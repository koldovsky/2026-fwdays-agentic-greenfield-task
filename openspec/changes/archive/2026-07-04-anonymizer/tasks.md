## 1. Setup

- [x] 1.1 Create `app/src/lib/anonymizer/` directory

## 2. Alias map

- [x] 2.1 Implement `collectNames(ticket): string[]` — assignee, reporter, comment authors in order, deduplicated by exact match
- [x] 2.2 Implement `buildAliasMap(names): Map<string, string>` — assigns `User1`, `User2`, … in collection order

## 3. Replacement

- [x] 3.1 Implement a longest-name-first, word-boundary-safe replacement helper given an alias map and a text string
- [x] 3.2 Apply replacement to `assignee` and `reporter` fields
- [x] 3.3 Apply replacement to each comment's `author` and `body`
- [x] 3.4 Apply replacement to each description block's text content (per `DescriptionBlock` kind: heading/paragraph `html`, list `items`, code `code`)
- [x] 3.5 Apply replacement to each attachment's `name`, leaving `url` untouched

## 4. Top-level API

- [x] 4.1 Implement `anonymizeTicket(ticket): { ticket: ParsedTicket; aliasMap: Map<string, string> }` returning a new ticket object, never mutating the input

## 5. Tests

- [x] 5.1 Test alias assignment order (assignee → reporter → comment authors) and reuse for repeated names
- [x] 5.2 Test replacement across assignee/reporter/comment author/comment body/description/attachment name
- [x] 5.3 Test longest-name-first replacement for overlapping names (e.g. "Ana" vs "Ana Maria")
- [x] 5.4 Test the no-known-names case returns an empty alias map and an unchanged ticket
- [x] 5.5 Test the original ticket object is not mutated after calling `anonymizeTicket`
- [x] 5.6 Test against a `ParsedTicket` built from the real ROVODEV-36 fixture (assignee "Federico Ciner", reporter "Seerat")

## 6. Verification

- [x] 6.1 `npm run typecheck && npm run lint && npm run test` all pass, combined under 60s (NFR-06)
- [x] 6.2 Confirm no Chrome API import exists anywhere under `app/src/lib/anonymizer/` (grep check — clean)
- [x] 6.3 Run `openspec validate anonymizer --strict` and confirm apply-clean
