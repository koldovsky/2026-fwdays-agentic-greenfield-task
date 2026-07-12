# Design: add-nace-catalog

## Context

`nace-catalog` is a pure S1 domain capability: typed seed data + a keyword
matcher, no React, no storage (TC-STACK-04). Consumers arrive later —
`document-render` (S3) prints the bilingual line text; `form-input` (S4) shows
the service picker and asks the clarifying question when the matcher is
ambiguous.

Facts settled by wayfinder ticket 03 (`.scratch/mvp-spec-coherence/assets/03-nace.md`):

- NACE 2.1-UA (order No. 191, 28 Oct 2025) is in force from **2027-01-01**;
  through 2026 the ЄДР still carries legacy КВЕД ДК 009:2010 codes.
- A NACE class is a broad grouping — one class (74.12) legitimately carries
  many invoice-line texts, so the class code is **not a unique key**.
- FR-NACE-06 (print the code on the invoice) is dropped — no legal requisite,
  frozen template has no placeholder. Display questions belong to ticket 09.

The four seed rows (codes, official UA names, bilingual line texts) were
verified against `docs/191_2025.pdf` in ticket 03. The seed table itself was
dropped from `docs/requirements.md` during the capability restructure (it
survives at `8d45456:docs/requirements.md`); the delta spec of this change
becomes its authoritative home.

## Goals / Non-Goals

**Goals:**

- Typed, framework-free catalog module in `src/lib/nace/` with four seed
  entries and a deterministic keyword matcher.
- A match result contract the S4 UI can build the clarifying question on
  without re-deriving candidates.
- Vitest coverage locking every seed entry, the ambiguous path, and the
  no-match path (TC-STACK-06).

**Non-Goals:**

- No UI, no storage, no full 651-class taxonomy, no LLM/fuzzy matching.
- No decision on displaying the NACE code or varying the document subtitle —
  that is wayfinder ticket 09 (`document-render`).

## Decisions

### D1 — Entry identity: own slug, class code as attribute

`NaceEntry` gets a stable kebab-case `id` (`graphic-design`,
`visualization-3d-360`, `specialized-design-3d`, `video-post-production`);
`naceClass` (`'74.12' | '74.14' | '59.12'`) is a plain attribute two entries
may share. *Why:* ticket 03(d) — keying by class code cannot represent two
74.12 entries. *Alternative rejected:* composite key `code + variant` — leaks
the broken assumption into every consumer.

### D2 — Legacy КВЕД carried data-only

Each entry carries `legacyKvedClass` (e.g. `'74.10'`, `'59.12'`) per
Держстат's correspondence tables. It is never exported in UI-facing strings;
BC-NACE-01 keeps КВЕД out of UI and docs. *Why:* through 2026 the ФОП's
registration runs on КВЕД (ticket 03(b)); when ticket 09 decides whether any
registration-matching hint is shown, the data is already in place. *Alternative
rejected:* omit the field — adding it later touches every consumer of the
catalog type.

### D3 — Matcher: deterministic keyword scoring with an explicit tie result

Each entry carries curated lowercase keyword sets (UA + EN). Matching
normalizes input (trim, lowercase, strip punctuation) and scores entries by
matched keywords. Result is a discriminated union:

```ts
type MatchResult =
  | { kind: "matched"; entry: NaceEntry }
  | { kind: "ambiguous"; candidates: NaceEntry[] } // top score tied
  | { kind: "none" };
```

A tie on the top score returns `ambiguous` — never a silent first-wins pick
(FR-NACE-05). *Why:* deterministic, trivially testable, no dependencies.
*Alternatives rejected:* Levenshtein/fuzzy (tuning burden, opaque failures for
a 4-entry catalog); LLM matching (chat input is settled Future in
`openspec/config.yaml`).

### D4 — Module layout, no barrel

`src/lib/nace/types.ts` (types), `catalog.ts` (seed data), `match.ts`
(matcher), `*.test.ts` beside sources. No `index.ts` — Ultracite discourages
barrel files; consumers import from specific files, matching `src/lib/`
conventions.

### D5 — Vitest coordination with `add-invoice-calc`

Both S1 changes introduce Vitest (TC-STACK-06). At apply time, check
`package.json`: if `vitest` and the `test` script already landed with
`add-invoice-calc`, reuse them; otherwise add `vitest` (dev) and
`"test": "vitest run"` here. Never double-add.

## Risks / Trade-offs

- [Keyword matching is brittle on free text] → keywords are curated per seed
  entry and locked by tests; ambiguity surfaces candidates instead of guessing;
  the S4 picker always allows manual selection.
- [The two 74.12 entries overlap semantically ("графічний дизайн" vs "3D")] →
  3D/visualization keywords live only on the 3D entry; a deliberate test pins
  «3D дизайн»-style input to the ambiguous path.
- [Legacy КВЕД field tempts UI display before ticket 09 decides] → BC-NACE-01
  scenario asserts UI-facing exports contain no КВЕД strings; a test greps the
  bilingual line texts for `КВЕД`/`ДК 009`.
- [Concurrent sessions may both touch package.json] → D5 check happens at
  apply time, not proposal time; re-read before editing.

## Open Questions

- Wayfinder ticket 09 — whether the document subtitle becomes a function of
  the NACE class, and whether any code/registration hint is ever displayed.
  Does not block this module; it only consumes `NaceEntry` fields.
