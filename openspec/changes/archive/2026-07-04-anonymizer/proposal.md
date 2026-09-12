## Why

Anonymization is a non-negotiable default (FR-19), but nothing in `lib/` implements it yet. `jira-parser` already extracts every real name Jira exposes as structured data (assignee, reporter, comment authors) — the anonymizer's job is to turn that into a consistent `NameX` alias map and apply it everywhere a person's name can appear in the exported ticket.

## What Changes

- Add a framework-free anonymizer in `app/src/lib/anonymizer/` that takes a `ParsedTicket` and returns an anonymized `ParsedTicket` plus the alias map used, so callers (`popup-wiring`) can inspect/log/test it if needed.
- Known names come from the ticket's own structured fields — `assignee`, `reporter`, and each comment's `author` — not from free-text name detection (NER) across the description or comment bodies. This is a deliberate scope decision (see design.md): Jira already tells the parser exactly who the people involved are; guessing additional names out of prose text would be unreliable and out of scope for this MVP.
- Every occurrence of a known name is replaced with the same alias (`User1`, `User2`, …) everywhere it can appear: `assignee`/`reporter` fields, comment `author` fields, comment `body` text, description block text, and attachment file names (FR-19, FR-21).
- The alias mapping is built once per ticket and reused across every field, so the same person is always the same `UserN` within one export (FR-20).
- Unit tests (Vitest) covering: alias assignment order/consistency, replacement across all field types, name collision (one name being a substring of another), and a no-names case (nothing to anonymize).

Out of scope for this change: the anonymization on/off checkbox and deciding *when* to call the anonymizer (that's `popup-wiring`, which will call this function conditionally based on the popup's checkbox state — FR-09); detecting names that appear only as free text and were never captured in a structured Jira field (documented limitation, not a regression, since no prior capability did this either).

## Capabilities

### New Capabilities
- `anonymizer`: replaces known real names (from a ticket's structured people fields) with consistent `UserN` aliases across all textual and file-name surfaces of a `ParsedTicket`.

### Modified Capabilities
(none — `jira-parser`, `markdown-serializer`, and `popup-shell` are unaffected; the anonymizer consumes/returns the same `ParsedTicket` shape)

## Impact

- New directory `app/src/lib/anonymizer/` (alias-map builder + replacement logic + tests).
- No changes to `docs/requirements.md` — implements existing FR-19 (`accepted`), FR-20 (`proposed`, not resolved by this change), and FR-21 (`accepted`).
