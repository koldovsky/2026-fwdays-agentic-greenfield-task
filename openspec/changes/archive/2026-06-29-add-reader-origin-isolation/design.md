## Context

The reader (change 7, `add-reader-navigation`) is functionally complete and reused as-is, but **blocked**
on a HIGH security finding. foliate renders each spine document in an `<iframe sandbox="allow-same-origin
allow-scripts">` on the **app origin**, where `edda.creds.<id>` lives in `localStorage`. A crafted EPUB's
`<script>` can therefore reach `window.parent.localStorage` and exfiltrate a user's server credentials.
Four in-app sanitization attempts (ADR-012, `content-security.ts`) each failed an independent Gate-2
security review with a fresh HIGH — SVG-root passthrough, MIME-essence vs strict-string, manifest-mirror
drift (wildcard/any-ns/first-wins vs foliate's direct-child `NS.OPF` by-id), and the `loadBlob` seam that
never reaches the sanitizer. The structural defect: an in-app sanitizer must perfectly mirror foliate's
resource routing **and** the browser's MIME handling, and one miss leaks credentials.

The user chose **Option B: origin isolation** — remove the credentials from foliate's reach instead of
out-sanitizing it. Research mapped the engine's drive surface (foliate runs as a custom-element `View`
whose paginator synchronously reads each spine iframe's `contentDocument`), the reader's reuse/replace
boundary (chrome + Locator pipeline reused; mount/teardown changed; `content-security.ts`/`book-loader`
CSP deleted), and the load-bearing invariants (core/contracts carry no DOM; plugins async, ADR-009;
`markRaw`, ADR-001; book bytes bypass the SW, ADR-005; per-connector sync). DESIGN.md §11 already names the
target: *"a sandboxed iframe (`postMessage` bridge) for anything that must render."*

## Goals / Non-Goals

**Goals:**
- Book content (untrusted EPUB HTML/JS) physically cannot read the app origin's credentials — regardless
  of foliate's internal routing or the browser's MIME handling (the failure modes that sank the in-app
  approach become irrelevant).
- foliate keeps working unchanged (no vendored-engine patch): it paginates via same-origin
  `contentDocument` access to its own spine iframes inside the isolated frame.
- The reader chrome, the `locatorChanged`→sync hand-off, and the neutral `Navigator` contract are
  preserved; only the renderer's mount/transport changes.
- ADR-005 (book bytes bypass the SW) and ADR-001 (`markRaw`) hold.

**Non-Goals:**
- The format/navigator contract cleanup (`parse(bytes)`→`open(source)`, neutral-Navigator enrichment) —
  that is the separate `harden-format-navigator-contract` change, landed afterward on top.
- Offline rendering of the reader **origin's own assets** (the foliate bundle). Book bytes are already
  offline-capable (bridged from OPFS/connector); precaching the reader-frame assets on its origin aligns
  with change 9 (`offline-and-sync`) and is deferred (see Open Questions).
- New reader features. The reader's requirements are unchanged; only the rendering boundary moves.
- Sandboxing connectors/parsers (Workers) — only the *renderer* is isolated here.

## Decisions

### D1 — A separate served origin, NOT an opaque sandbox (proven empirically)

A browser spike (Playwright, two http origins) measured both candidates against the two things that must
both hold — credential isolation AND foliate pagination:

| Approach | Read app `edda.creds`? | Read foliate spine `contentDocument`? | Bridge `event.origin` |
| --- | --- | --- | --- |
| Today — same origin | ❌ READABLE *(the bug)* | ✅ ACCESSIBLE | — |
| Opaque `sandbox="allow-scripts"` on app origin | 🔒 BLOCKED | ❌ **NULL** (cross-origin) | only `"null"` |
| **Separate served origin** (different port) | 🔒 **BLOCKED** | ✅ **ACCESSIBLE** | ✅ real origin |

The opaque-sandbox option isolates credentials but **breaks foliate**: a nested `allow-same-origin` spine
iframe inherits the parent's sandbox and is forced to a *fresh* opaque origin, so the engine's synchronous
`this.#iframe.contentDocument` returns `null` and pagination dies. Only a genuinely separate origin
satisfies both constraints — and as a bonus the bridge gets a real `event.origin` to validate (the
opaque-origin frame would only ever present `"null"`).

*Alternatives rejected:* (a) in-app sanitization — four independent HIGHs, structurally unwinnable; (b)
patch vendored foliate to drop the spine-iframe sandbox so it inherits the opaque parent — fragile
coupling to engine internals, the exact class of drift that sank attempts 1–4; (c) a Worker — no DOM, and
reflowable HTML layout needs real DOM.

### D2 — The whole foliate engine runs in the frame; the app holds a navigator proxy

Because the paginator reads spine `contentDocument` synchronously, the engine cannot be split across the
origin boundary. The entire `View` (and the custom-element registrations, which are frame-local) runs
inside the reader frame, wrapped by a thin **in-frame harness**. The app side is a **navigator proxy**
implementing the neutral `Navigator` interface by forwarding over the bridge and re-emitting
`locatorChanged`. The proxy is `markRaw()`'d (it holds the iframe + ports); the existing `useNavigator`
lifecycle (cancel-guard, teardown-once) is preserved, swapping "mount foliate into an `HTMLElement`" for
"create the cross-origin frame, hand it a port, return the proxy".

### D3 — Bridge over a `MessageChannel`, with strict origin validation (security guide §1.5)

The app creates a `MessageChannel`, embeds the reader frame, and on the frame's load posts an init message
with `targetOrigin = READER_ORIGIN` (never `*`) transferring one `MessagePort`. The frame validates the
init message's `event.origin === APP_ORIGIN` before accepting the port; the app validates every reply's
`event.origin === READER_ORIGIN`. Thereafter both ends talk over the point-to-point `MessagePort`
(capability — only the two endpoints hold it). Commands: `open`/`goTo`/`next`/`prev`/`seek`/
`applyPreferences`/`destroy`. Events: `ready`/`locatorChanged`/`pageCount`/`error`. Every payload is
structured-cloneable neutral data.

### D4 — Bytes transfer in; metadata comes back over the bridge

The app fetches `connector.content()` (credentials live on the app origin) and posts the book
`ArrayBuffer` to the frame as a **Transferable** (zero-copy). The frame builds the foliate book in-frame
and returns the `Publication` metadata (title/authors/TOC) in its `ready` event, so the chrome's
title/TOC come from the frame — the app never runs the foliate parser on the render path and no second
copy of the bytes lives on the app origin. ADR-005 holds: bytes are bridged, never SW-intercepted; ranged
zip slicing happens in-frame. Credentials never cross.

*Alternative:* parse metadata in-app first (foliate's headless parse is script-free and safe), then
transfer the buffer for render. Equivalent for the spec; D4's parse-in-frame is chosen because it keeps
the entire book lifecycle on the isolated origin.

### D5 — Reuse the reader chrome and Locator pipeline unchanged

The 6 reader Vue components, `ReaderView` wiring, the `isWebFormatHandler` guard, `readerPreferencesStore`,
the `locatorChanged`→`syncEngine.enqueue` hand-off, `bytes-source`, EPUB `parse`/`sniff`/`capabilities`,
and the `toLocator` translation are reused. `toLocator` and the prefs→readium-css mapping move **into the
frame** (they run where the engine is); their output (a serializable `Locator`, a CSS string) crosses the
bridge.

### D6 — Delete the in-app sanitizer; supersede ADR-012 with ADR-013

`content-security.ts` and `book-loader.ts`'s CSP-injecting `loadText` seam are deleted — with the engine on
a credential-free origin there is nothing to sanitize and nothing reachable to steal, so the per-document
parse-and-strip is dead weight (and was never sufficient). The frame loads spine documents via foliate's
standard path (no CSP injection). `stack.md` gains **ADR-013 (reader origin isolation)** and marks
**ADR-012 superseded**.

### D7 — Serving the reader origin

The reader frame is a second build entry (its own HTML + foliate bundle) served from a separate origin.
Dev and Playwright e2e provide it on a **second port** (same host, different port = different origin), so
the whole pipeline is testable in CI. Production reads the reader origin from configuration
(`VITE_READER_ORIGIN` / runtime config); self-hosting docs explain provisioning it (a sibling port or a
`reader.`-style subdomain). Because the frame is a *real* origin (not opaque), its own assets load with
normal module/`customElements` semantics — none of the opaque-origin CORS pitfalls.

## Risks / Trade-offs

- **[The real foliate engine may behave differently in-frame than the spike's minimal blob iframe]** →
  Spike the real reader-frame bundle FIRST (task 1): both fixtures (Pensées + the 14 MB light-novel) must
  paginate end-to-end across the bridge before building chrome on top — mirrors how
  `harden-format-navigator-contract` spiked its zip adapter.
- **[Self-hosters now need a second origin]** → Documented; dev/e2e provide it automatically. The spec
  fails closed (never same-origin fallback) so a misconfiguration degrades safely to an error, not to the
  vulnerable path.
- **[Offline: the app SW cannot cache a cross-origin reader frame]** → Book bytes are already offline
  (bridged from OPFS/connector, ADR-005). Precaching the reader-frame *assets* on its origin is deferred to
  align with change 9; until then the frame's bundle loads online. Flagged, not silently dropped.
- **[Bridge latency / byte-copy cost]** → Bytes use a zero-copy Transferable; pagination runs entirely
  in-frame (no per-page bridge chatter); only coarse commands/events cross. Acceptable.
- **[Rollback restores a deleted, insecure mechanism]** → Rollback is a revert of this change's commit; it
  would reinstate the in-app sanitizer, which is exactly why this is a clean single change with no data
  migration.

## Migration Plan

Bottom-up so the tree stays green at each step:
1. Reader-frame build entry + in-frame harness (foliate `View` wrapper + `toLocator` + prefs mapping +
   bridge server). Spike both fixtures through it.
2. App-side bridge client + navigator proxy (neutral `Navigator`, `markRaw`-safe, teardown-once).
3. Retype/rewire `useNavigator` + the EPUB `createNavigator` to build the frame and return the proxy.
4. Delete `content-security.ts` + `book-loader` CSP; revise the ch7 `reader-navigation` delta's
   content-isolation requirement to point at origin isolation.
5. Dev + Playwright second-origin wiring; e2e (benign paginates; XSS-probe executes-but-cannot-steal).
6. Docs: ADR-013 + ADR-012 superseded; DESIGN.md §5.2/§11; architecture.md; README/self-hosting.

Rollback = revert the single change; no persisted-shape migration.

## Open Questions

- **Prod reader-origin default:** sibling port vs `reader.`-subdomain as the documented default? Both
  work; the spec only requires *a* separate, configured origin. Recommend a port for the simplest
  self-host, subdomain where TLS/SAN is easy. Resolve in the self-hosting doc, not the contract.
- **Offline reader-frame assets:** give the reader origin its own minimal precache (its own SW) when change
  9 (`offline-and-sync`) lands? Proposed: defer to change 9, which owns offline/durability.
- **Folding `harden-format-navigator-contract`'s `PublicationSource` into the byte transfer:** the bridge's
  range-read story is a natural fit for `PublicationSource`, but per the chosen sequencing isolation lands
  first on the current contract surface; the contract cleanup retypes it afterward.
