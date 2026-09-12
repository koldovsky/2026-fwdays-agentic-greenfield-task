## Context

`ParsedTicket` (from `jira-parser`) already carries every real name Jira's DOM exposes as a *structured* field: `assignee`, `reporter`, and each `comments[].author`. Nothing in the ticket's free text (`description`, `comments[].body`) is independently scanned for names — the parser doesn't extract names from prose, and this change doesn't add that capability either. The anonymizer's input for "which names exist" is exactly that structured set, not a generic PII/NER scan.

## Goals / Non-Goals

**Goals:**
- `anonymizeTicket(ticket: ParsedTicket): { ticket: ParsedTicket; aliasMap: Map<string, string> }` — pure function, framework-free, no Chrome APIs, no network calls (NFR-01, NFR-02, NFR-07).
- One alias map per call, built from `assignee` → `reporter` → comment authors in that order (first occurrence wins), so the same person always maps to the same `UserN` (FR-20).
- Replace name occurrences in: `assignee`, `reporter`, each comment's `author` and `body`, each description block's text content, and each attachment's `name` (FR-19, FR-21).
- Longest-name-first replacement to avoid one person's name corrupting another's when one is a substring of the other (e.g. "Ana" inside "Ana Maria").
- Returns a **new** `ParsedTicket` (no in-place mutation) — callers that need the original (e.g. for a debug/log path) still have it.

**Non-Goals:**
- Free-text name detection (NER) for names that never appear in a structured Jira field. If a commenter mentions a third party by name only in prose, this anonymizer will not catch it — documented limitation, not a silent gap, since detecting arbitrary proper nouns reliably without a network-based NLP service would contradict NFR-01/NFR-02 (no backend, no paid APIs) anyway.
- Deciding *whether* to anonymize (the popup checkbox, default-on per FR-05) — `popup-wiring`'s job; this function always anonymizes when called.
- Anonymizing attachment *URLs* — those must stay real so `popup-wiring` can still fetch the actual bytes; only the locally-planned display/file `name` is anonymized (consumed later by `markdown-serializer`'s `planAttachmentNames`, which already treats whatever name it's given as the source of truth per its own design).
- Matching name fragments joined by hyphens/underscores (e.g. `Federico-Ciner` or `Federico_Ciner`) — the replacement matches the whole "first last" phrase as it appears in the structured field (space-separated), not tokenized fragments glued together differently in a file name.

## Decisions

- **Known-names-from-structured-fields, not NER-over-free-text**: matches how `jira-parser` already works (it extracts what Jira's DOM structurally labels, not what it infers from prose). Alternative considered: scanning `description`/comment bodies for capitalized word sequences as a name heuristic — rejected as unreliable (false positives on proper nouns like product names, e.g. "Rovo Dev", "GitLab") and it would silently vary in quality per ticket, undermining the "anonymization is a hard guarantee" spirit of FR-19.
- **Alias order: assignee, then reporter, then comments in DOM order, deduplicated by exact name match**: deterministic and testable; matches the order these fields already appear in the DOM per `jira-parser`'s design (people module before activity module).
- **Whole-name, word-boundary-safe replacement, longest names first**: prevents partial-match corruption (a short name matching inside a longer one) and prevents matching a name fragment inside an unrelated word. Implemented as one alternation regex built from all known names (escaped), sorted by length descending, so the regex engine's leftmost-longest matching naturally prefers the fuller name at each position.
- **Returns a new ticket object (structural clone), not a mutation**: keeps the function pure and testable in isolation, consistent with `markdown-serializer`'s "operates on whatever ticket it's given" stance — nothing downstream needs to guess whether a ticket has already been mutated in place.
- **Attachment `url` is never touched, only `name`**: anonymization is about what a human reads/sees in the exported files, not about breaking the actual attachment fetch, which still needs the real Jira URL.

## Risks / Trade-offs

- [A name appearing only in free text (never in a structured field) is not anonymized] → Mitigation: documented as a known, deliberate scope boundary (see Non-Goals) rather than a silent gap; revisit only if a future requirement explicitly demands free-text NER, which would need its own design (likely a local dictionary/heuristic, still no backend per NFR-01).
- [Replacing inside `DescriptionBlock.html` fragments risks matching text inside link `href` attributes if a name coincidentally appears in a URL] → Mitigation: description HTML is anonymized by replacing only text-node segments (skipping tag/attribute regions), and name matching uses Unicode-aware word boundaries so Cyrillic/diacritic names are not missed.
- [Two different people sharing a display name string exactly] → Mitigation: out of scope — the alias map is keyed by exact name string, so identically-named people collapse to one alias, which matches the literal reading of FR-20 ("the same person is always the same UserN") without a way to disambiguate identical strings from parsed HTML alone.
