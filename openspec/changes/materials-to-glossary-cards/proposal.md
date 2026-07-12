## Why

A networking lesson arrives as a pile of mixed files — captions, PDF notes, PDF slides, an existing Markdown summary. Turning that into publishable material means first agreeing on the vocabulary: the technical terms a non-technical reader will not survive without. Everything downstream is prose written on top of that vocabulary, so the glossary has to be settled first — otherwise a changed definition forces edits to text that was already approved.

This change delivers the first vertical slice of the MVP pipeline: raw lesson materials in, draft glossary cards out, mechanically checked and queued for human approval. Nothing is published and nothing is approved by a machine.

## What Changes

- Add an intake step that converts the lesson's PDFs to text with `pdftotext` and passes captions and existing Markdown through untouched. A missing `pdftotext` **stops** the run with a named dependency error; it never silently skips a PDF.
- Add an author step that reads **all** lesson materials at once and decides for itself which file is the reference, which is the base, and which is a supplement. It emits draft prose plus an ordered list of technical terms.
- Add a censor step that abstracts military specifics out of the material — the source lesson is army-facing, the published book is not. It rewrites toward generic networking and Mikrotik equipment.
- Add a glossary step that turns each accepted term into one card: a plain-language explanation of one to three sentences plus at least one link, to a related card or to Ukrainian Wikipedia.
- Add card checks that run as **code**, not as an agent: metadata validity, content hash freshness, no agent-set approvals, resolvable internal links, Wikipedia links returning HTTP 200, no duplicate terms, non-empty explanation within the sentence budget.
- Add a review queue: cards land in `status: draft` with the source excerpt that motivated the term, so the human approving a definition can see how the term is actually used.

Out of scope for this change, and named so it does not creep in: article prose chunking, link insertion into the article, fact-checking against the source, assembly, and publication. The target picture in `docs/prd-final.md` — stylistic pass, FAQ cards, cross-article glossary, submodule, illustrations — is out of MVP scope entirely.

Pipeline stages touched: **intake, author, censor, glossary** (plus the card half of **checks**).

## Capabilities

### New Capabilities

- `material-intake`: discovering a lesson's source files, converting PDFs to text, failing loudly on a missing external dependency, and handing a uniform set of Markdown-and-text sources to the author.
- `term-extraction`: producing draft prose and an ordered list of technical terms from all lesson materials at once, including the rule that decides whether a word is a term at all.
- `content-censorship`: abstracting military specifics to generic networking and Mikrotik equipment before any material becomes publishable.
- `glossary-cards`: the card format — front matter, plain-language explanation, mandatory link — and the rule of one term to one card, keyed on first occurrence.
- `card-verification`: the deterministic checks a card must pass before a human is asked to look at it, and the report they produce.

### Modified Capabilities

None. This is the first change in the repository; `openspec/specs/` is empty.

## Impact

- **New code**: intake converter, card checker, card review queue. All deterministic — no agent involved.
- **New agents**: author, censor, glossary. Prompt-level, no shared context with the checker.
- **External dependency**: `pdftotext` from the `poppler` package. Documented in `README.md`; the run aborts without it.
- **Filesystem**: writes under `output/day-02/` — converted sources, draft prose, `glossary/<term>.md`, and `verification.md`. Nothing under `output/gitbook/` yet.
- **Stack**: still unchosen. This change must pick one, or it cannot be implemented.
- **Human cost**: the human reviews cards, not prose. Each card is a half-minute; the article's attention budget is a later change's problem.
