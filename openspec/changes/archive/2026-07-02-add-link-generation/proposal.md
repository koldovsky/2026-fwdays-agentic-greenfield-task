## Why

`jar-matching` now produces `jarmatching.Matched{Name, Amount, SendID}` for
every plan entry that unambiguously resolves to a UAH jar, but nothing yet
turns that into the one artifact the user actually acts on: a clickable
`send.monobank.ua` link with the amount pre-filled. Without this step the
tool can tell the user *what* would be sent but not produce the thing they
click to send it.

## What Changes

- Add a new `link-generation` capability (`internal/linkgen`) that takes a
  `jarmatching.Matched` and builds
  `https://send.monobank.ua/jar/{sendId}?a={amount}`, with `{amount}` the
  plan amount in UAH, 1:1, no conversion (FR-LINK-01).
- The generated link contains only the jar `sendId` and the amount — never
  `MONO_TOKEN` or any other account data (NFR-SEC-04).
- Carries the **V-1** runtime verification gate: before FR-LINK-01 may be
  marked `shipped` in `product-requirements.md`, one real `?a=N` link must
  be opened and the prefilled amount confirmed to read `N ₴` (not `N`
  kopiykas). This is a manual, one-time check recorded in this change's
  `tasks.md`, not an automated test (there is no way to script "look at
  the browser").

## Capabilities

### New Capabilities
- `link-generation`: builds a `send.monobank.ua` jar top-up link from a
  matched `(name, amount, sendId)` result — pure string construction, no
  I/O, no knowledge of the token.

### Modified Capabilities
(none — `jar-matching` is consumed as-is via its existing exported
`Matched` type; no changes to its requirements.)

## Impact

- New package `internal/linkgen`, depending on `internal/jarmatching`
  (shipped) only for the `Matched` type shape — no import of `monoclient`
  or `planparsing` is needed since `Matched` already carries everything
  required.
- No changes to existing packages or the `jarsplit` binary (not yet wired
  — that's `cli-orchestration`, Phase 5).
- Unblocks Phase 4 (`output-reporting`), which will render these links
  into the stdout table.
