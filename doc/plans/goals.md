# Edda — Goals

> Generic project artifact. Describes **what** Edda is and **what's in/out of scope** — not how to build it (see [`architecture.md`](./architecture.md)) or what it's built with (see [`stack.md`](./stack.md)).
> Companion deep design: [`../../DESIGN-CONNECTORS.md`](../../DESIGN-CONNECTORS.md) (Connectors & Formats subsystem).

## Product

**Edda** is a **self-hosted-library e-reader**. A user points it at their own content server (Komga first), browses their library, downloads books for **offline** reading, reads them in a clean reader, and has their **reading progress synced back** to that same server so it follows them across devices.

- **Audience:** people who self-host their book/comic library (Komga / Kavita / Calibre owners) and want a fast, offline-capable reader they control.
- **Today:** a **web-first Progressive Web App (PWA)**, evolving the existing Vue 3 + Vite prototype.
- **Later:** a **true native client** (Android-first, Kotlin/Compose) — not a WebView wrapper. The reuse strategy that makes this affordable is the shared specification layer (see [`architecture.md` → Cross-platform reuse contract](./architecture.md#cross-platform-reuse-contract)).

## Goals (v1)

- **Fully support the Komga server via its native REST API** — browse libraries / series / collections, search, page/stream content (PSE), and read/write progress — rather than the OPDS lowest-common-denominator.
- Open and read **EPUB** in a reflowable reader with adjustable typography (font, size, theme, columns).
- **Download for offline** and read with no network.
- **Sync read progress** back to Komga using its native progress API (furthest-progression-wins), surviving offline periods via a durable outbox — driven by a connector-scoped sync strategy (see [`architecture.md` → Progress sync](./architecture.md#progress-sync-strategy-connector-scoped)).
- A **pluggable** architecture (Connectors + Formats) so new servers/formats are added without touching the core.

## Non-goals (for now)

- **Hosting library content ourselves.** Edda adapts to the user's server; it is not a content store.
- **Third-party plugins of any kind.** All connectors (servers) and formats are **first-party only** — authored, shipped, and maintained by us. There is **no** third-party plugin authoring, SDK, marketplace, remote plugin distribution, or loading/execution of external plugin code in scope. (The Host Bridge contract is deliberately shaped so this *could* open up safely later — see `DESIGN-CONNECTORS.md` §11 — but it is out of scope now.)
- **Cross-source unified progress**, and **progress for servers without a progress API** (Calibre, bare OPDS). Such sources report `progressSync: false` and stay local-only for now.
- **A Capacitor / WebView mobile app.** Explicitly rejected — the mobile target is a true native client, not "web on phone" (see [`stack.md` → Decisions, ADR-006](./stack.md#decisions-adr-lite)).

## Scope tiers

Descriptive, not a sequenced plan — priorities, not steps.

**In scope (v1):** Komga connector (full native REST: browse, search, streaming, progress) · EPUB format · offline download + read · progress sync (core engine + Komga strategy) · the pluggable core (registry, dispatch, host bridge) · a minimal browse/read PWA shell.

**Anticipated later (not committed):** generic OPDS fallback connector · on-demand "suggest install" capability flow · PDF format, then CBZ/FB2 · in-book search & TTS · the native client built against the same specs.

## What "good" looks like

- The whole v1 experience — open a downloaded book, move through it, reconnect — **works end-to-end with the network cut**, and progress reconciles furthest-wins on reconnect.
- A new connector or format can be added as a **self-contained plugin** without editing the core.
- The domain model and protocols are specified platform-neutrally, so the future native client can be built to the **same specs** without reverse-engineering the web app.

## Open questions

- Progress for no-progress-API sources (Calibre, bare OPDS, sideloaded files): local-only per device, or an optional relay?
- Conversion pipeline (MOBI/AZW3→EPUB, CBR→CBZ): a separate "format importer" concept, or folded into format plugins?
- Native HTTP parity for range/streaming vs web `fetch` — to confirm before the native client relies on it.
