# Edda — Web App Implementation Roadmap

> Process artifact. Sequences the OpenSpec changes that build the **web PWA** to match the
> UI maket in [`../web/`](../web/). The maket is the **visual source of truth**: every UI change
> carries scenarios that check the rendered screen against its `doc/web/*.png` capture, and the
> final change (`add-visual-polish-e2e`) gates on automated visual regression against those PNGs.
>
> Derives from [`goals.md`](./goals.md) · [`architecture.md`](./architecture.md) ·
> [`stack.md`](./stack.md) · [`../../DESIGN-CONNECTORS.md`](../../DESIGN-CONNECTORS.md). Slicing decided in
> `/opsx:explore` (2026-06-29): **fixture-connector-first**, **fine-grained (one screen / headless
> layer per change)**, **whole backlog seeded** for the `spec-loop` skill to drive.

## Principles

- **Vertical slices, design-checked.** Each change ships a styled, testable screen end-to-end (or a
  headless layer feeding one), not a horizontal layer with UI bolted on later. Styling-to-the-maket
  happens *inside every UI slice* — that is the only way "UI is source of truth" holds.
- **Fixture-connector-first.** The Library screen (change 2) renders on an in-memory fixture
  connector so it is real and unit-testable with no server. The Komga REST connector (change 3) is
  another implementation of the same `Connector` interface and is swapped in — integration-tested
  against the throwaway Docker Komga + `test-epubs/` (`test/komga/`).
- **Maker ≠ checker.** Every change's tasks end with an independent review pass (`/code-review` or a
  separate agent) and `openspec validate --strict` before it is considered done.
- **Greenfield = all `ADDED`.** Each capability is created by exactly one change; later changes
  *reference* it rather than `MODIFY` it, keeping deltas clean and archivable.
- **Honors the load-bearing invariants** (`CLAUDE.md`): `core/contracts` stays platform-neutral;
  plugins are async; `markRaw()` the renderer objects; book bytes bypass the SW; progress is keyed
  per `(sourceId, bookId, mediaType)` and synced per-connector.

## Dependency DAG

```
1 add-app-shell ─────────────────────────────────────────────► design-system, app-shell
        │
        ▼
2 add-library-browse (fixture connector) ───────────────────► core-domain-model, library-browse
        │
        ▼
3 add-connector-komga (web HostBridge + registry resolution) ► host-bridge, plugin-registry,
        │   integration-tested vs Docker Komga                  connector-komga
        ├───────────────► 4 add-source-flow ────────────────► server-prober, add-source   (screen 05)
        │
        ▼
5 add-book-detail ──────────────────────────────────────────► book-detail                 (screen 02)
        │
        ▼
6 add-format-epub (vendor foliate-js, CFI↔Locator) ─────────► format-epub                 (test EPUBs)
        │
        ▼
7 add-reader-navigation ────────────────────────────────────► reader-navigation           (screen 03)
        │
        ▼
8 add-reading-preferences (readium-css) ────────────────────► reading-preferences         (screen 04)
        │
        ▼
9 add-offline-and-sync ─────────────────────────────────────► offline-storage, sync-engine,
        │   OPFS + Dexie outbox + furthest-wins                 progress-sync-strategy
        ▼
10 add-extensions-and-capability-install ───────────────────► capability-dispatch, extensions-registry,
        │   OPDS fallback + on-demand PDF install               connector-opds, format-pdf  (screens 06/07)
        ▼
11 add-visual-polish-e2e ───────────────────────────────────► visual-fidelity             (all screens)
        capstone: pixel-check every screen vs doc/web,
        all states, a11y, Playwright visual-regression gate
```

## Changes

| # | Change | Screen(s) | Verification highlight |
|---|---|---|---|
| 1 | `add-app-shell` | chrome of 01, 06 | Vitest component render + Playwright visual smoke vs maket chrome |
| 2 | `add-library-browse` | `01-library-desktop` | Renders on fixture catalog; layout checked vs PNG |
| 3 | `add-connector-komga` | — (data layer) | Integration tests vs `pnpm komga:up` (reader account, `test-epubs/`) |
| 4 | `add-source-flow` | `05-add-source-desktop` | Probe→capabilities→connect vs Docker Komga; modal checked vs PNG |
| 5 | `add-book-detail` | `02-book-detail-desktop` | Metadata/TOC/progress card checked vs PNG |
| 6 | `add-format-epub` | — (renderer) | Parses both `test-epubs/`; CFI↔Locator round-trip tests |
| 7 | `add-reader-navigation` | `03-reader-desktop-epub-spread` | Two-page spread checked vs PNG; opens a real EPUB |
| 8 | `add-reading-preferences` | `04-reading-themes-and-preferences` | 4 themes / 3 typefaces / size / layout via readium-css |
| 9 | `add-offline-and-sync` | Downloads, "Synced", `%` | **Offline read with network cut + furthest-wins reconcile** (goals.md acceptance) |
| 10 | `add-extensions-and-capability-install` | `06`, `07` | Dynamic-import-as-install; suggest-install→retry-open |
| 11 | `add-visual-polish-e2e` | all | Playwright visual-regression gate vs every `doc/web/*.png` |

## Implementation sequencing notes (reconciled)

Surfaced while authoring the specs; resolve at implementation time, not in the specs:

- **`_opds-core` lands in two steps.** `connector-komga` (change 3) *composes* the shared OPDS
  utilities, but the generic `connector-opds` (change 10) is what formalizes them. Land a **minimal
  `_opds-core`** (feed parsing, acquisition-link resolution) with change 3 and complete it in change 10
  — keep both specs behavioral ("composes shared OPDS utilities") so neither pins the module's shape.
- **Contracts grow as `ADDED`, never edited cross-change.** The scaffold's `core/contracts` /
  `core/model` are thinner than `DESIGN-CONNECTORS.md` (e.g. `FormatHandler` needs `sniff`/`open`/`createNavigator`;
  `BookRef` needs the richer browse view-model; `ReadingPreferences` needs a concrete shape). Each
  change *additively* extends contracts as it needs them; `core-domain-model` (change 2) owns the
  platform-neutral baseline.
- **e2e backend is EPUB-only.** `test/komga/` seeds EPUBs, so the capability-missing (PDF) flow
  (change 10) and the CBZ-RTL comic reader are verified against **fixtures/mocks**, not end-to-end
  against Komga. The visual-regression gate (change 11) still covers their *screens* vs the maket.

## Running the backlog

The `spec-loop` skill drives every pending change through its three gates (implement → test/lint/
security/architecture/e2e → docs) with a maker≠checker split, looping until the backlog drains.
Komga-dependent gates (changes 3, 4, 9, 10) require `pnpm komga:provision` first.
