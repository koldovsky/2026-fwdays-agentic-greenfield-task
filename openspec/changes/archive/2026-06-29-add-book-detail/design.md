## Context

The book detail screen (`doc/web/02-book-detail-desktop.png`) is a **read-only presentation surface**:
it composes data that other capabilities own and adds no new domain behavior. That makes its design
almost entirely about **where each piece of data comes from** and **how the screen behaves before those
providers exist**, because in the roadmap this change (5) lands before `add-format-epub` (6) and
`add-offline-and-sync` (9). Three contracts feed it, all from `core-domain-model` (`add-library-browse`):

- `BookMeta` — returned by `Connector.getBook(session, bookId)`: title, authors, language, page count,
  subjects/genres, description, cover. The connector is fixture-backed in change 2 and Komga in change 3;
  this screen is connector-agnostic.
- `Publication.toc: TocItem[]` — the table of contents for the "CHAPTERS" section. Producing a real
  `Publication` is `format-epub`'s job (change 6); until then the TOC may be empty or partial.
- `Locator` for the current `(sourceId, bookId, mediaType)` — the unit the sync engine stores
  (`totalProgression`, `position`, `title`). The progress *display* lives here; the outbox /
  furthest-progression-wins sync that keeps it fresh is `sync-engine`/`offline-storage` (change 9).

## Goals / Non-Goals

**Goals:**

- Reproduce screen 02 to the maket: header, cover + action stack, identity/metadata, the progress and
  per-format cards, and the chapters list, all using `design-system` primitives.
- Make the per-`(sourceId, bookId, mediaType)` progress-keying invariant visible and correct: the card
  reflects the current format's locator, and the explainer states the rule.
- Degrade gracefully so the screen is shippable and testable in change 5, before the TOC and live
  progress providers land.

**Non-Goals:**

- Defining `BookMeta`, `Publication`/`TocItem`, or `Locator` — those are `core-domain-model`.
- Parsing EPUBs or building the TOC — that is `format-epub` (change 6).
- The reader itself, page rendering, or navigation mechanics — `add-reader-navigation` (change 7); this
  screen only *launches* the reader via the app-shell route.
- Owning progress sync (outbox, scheduling, reconciliation) — `sync-engine`/`offline-storage` (change 9);
  this screen reads a locator and triggers a download through their interfaces.

## Decisions

- **Consume contracts, own nothing.** The view takes `(sourceId, bookId)` from the app-shell book route,
  calls the active connector's `getBook` for `BookMeta`, asks for the `Publication.toc` and the current
  format's `Locator`, and renders. *Rationale:* keeps the screen a thin, connector- and format-agnostic
  presentation layer; the same view works once Komga (3), EPUB (6), and sync (9) are wired.
  *Alternative:* a book-detail-specific data store — rejected; it would duplicate domain types and the
  per-format keying logic that `core-domain-model` already owns.
- **Graceful degradation per missing provider.** No `Publication.toc` yet (pre–change 6) → the Chapters
  section renders an empty/placeholder state and a count derived from `BookMeta` if available, becoming
  full once `format-epub` lands. No stored locator yet (pre–change 9, or a never-opened format) → the
  progress card shows a not-started / 0% state and "Continue reading" reads as "Start reading"/opens at
  the beginning. *Rationale:* the change must be independently shippable and testable per the roadmap.
  *Alternative:* block this change on 6 and 9 — rejected; breaks the fine-grained, one-screen-per-change
  slicing and the DAG order.
- **Progress card shows the current format; the explainer states the rule.** The big `38%` is the
  `totalProgression` of the locator for the book's current `(sourceId, bookId, mediaType)`; the "SYNCED
  PER FORMAT" card carries the maket's exact sentence so the invariant is user-visible, not just internal.
  *Rationale:* directly surfaces the load-bearing per-format keying from `core-domain-model`.
  *Alternative:* aggregate all formats into one number — rejected; it would contradict the invariant.
- **"Time left" is a derived presentation value.** `about 1h 12m left` is computed from remaining
  progression and a length signal (page count / reading-order extent), not stored. *Rationale:* it is a
  view concern; persisting it would invent state no contract defines. *Alternative:* a server-provided
  ETA — rejected; not in any connector contract and not portable to the native client.
- **"Continue reading" is the reader entry point.** It navigates to the app-shell reader route
  `/reader/:sourceId/:bookId/:mediaType` for the format being continued, carrying the saved locator so the
  reader resumes in place. *Rationale:* honors per-format keying end-to-end; the reader change (7) lights
  this up without this screen changing. *Alternative:* open an embedded reader here — rejected; the reader
  route is full-bleed and owned by app-shell/reader-navigation.

## Risks / Trade-offs

- [The Chapters section ships empty until `format-epub` (change 6)] → Spec a graceful placeholder state
  and a scenario for it; the populated-TOC scenario is verified once change 6 lands, against `test-epubs/`.
- [Progress shown could drift from the true stored position before sync exists (change 9)] → Read the
  locator through the domain interface and treat "no locator" as not-started; the live-sync behavior is
  owned and tested by `add-offline-and-sync`.
- [Layout drift from the maket's specific two-column composition] → Every requirement carries a scenario
  checked against `doc/web/02-book-detail-desktop.png`; `add-visual-polish-e2e` (change 11) adds the
  pixel-regression gate.

## Open Questions

- Exact book detail route shape (`/book/:sourceId/:bookId` vs nested) is owned by `add-app-shell`'s
  router skeleton; this change consumes whatever that route provides and does not redefine it.
- Whether "Offline" reflects per-format or whole-book download state is finalized with
  `add-offline-and-sync` (change 9); here it is the action affordance from the maket.
