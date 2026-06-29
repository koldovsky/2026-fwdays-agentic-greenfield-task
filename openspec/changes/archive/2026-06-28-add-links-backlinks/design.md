# Design — Links & Backlinks

## Context
Books and notes cross-reference each other through link strings stored on `Note.links`
(`book:<slug>` / `note:<slug>/<id>`). The UI needs canonical keys, route hrefs, a
backlink index, and broken-link detection. All logic is pure and deterministic.

## Goals
- Parse and validate link strings into a typed `ParsedLink`.
- Derive canonical keys and route hrefs.
- Build a backlink index: target key → sources `{ fromBook, fromNote }`.
- Detect broken links against a known set of book slugs / note keys.

## Non-Goals
- Markdown rendering / wiki-link expansion (separate capability).
- Filesystem reads or content loading.

## Decisions
- `ParsedLink` is a discriminated union on `type` (`'book' | 'note'`).
- Regexes reject slugs/ids containing `/` or whitespace, so malformed strings → null.
- `buildBacklinkIndex` iterates books then their notes, parsing each raw link and
  indexing only valid ones; result is a `Map<string, Backlink[]>`.
- `isBrokenLink` checks `bookSlugs` for book links and `noteKeys` (canonical keys) for
  note links.

## Risks
- Slug/id character set is constrained by the regex; unusual characters would parse as
  null. Acceptable given current slug rules.
