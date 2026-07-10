## Why

The reader (change 7) is blocked on a HIGH security finding: foliate renders untrusted EPUB HTML/JS in an
`allow-same-origin allow-scripts` iframe on the **app origin**, where `edda.creds.<id>` lives in
`localStorage`, so a crafted EPUB can read a user's server credentials. Four in-app sanitization attempts
(ADR-012, `content-security.ts`) each failed Gate-2 security with a fresh HIGH — SVG-root, MIME-essence vs
strict-string, manifest-mirror drift, the `loadBlob` seam bypass. The structural defect is that an in-app
sanitizer must perfectly mirror foliate's resource routing **and** the browser's MIME handling, and a
single miss leaks credentials. The robust fix removes the credentials from foliate's reach entirely:
render book content on a **separate origin** that physically cannot read the app's `localStorage`. This
supersedes ADR-012's in-app CSP/sanitizer.

A browser spike (two http origins, Playwright) settled the mechanism empirically. An *opaque*
`sandbox="allow-scripts"` frame on the app origin isolates credentials but **breaks foliate**: its nested
`allow-same-origin` spine iframes inherit the parent's sandbox and become a *fresh* opaque origin, so the
engine's synchronous `contentDocument` access returns `null` and pagination dies. A **genuinely separate
served origin** isolates credentials (parent `localStorage` access throws `SecurityError`) *and* keeps
foliate's spine `contentDocument` reachable *and* gives the postMessage bridge a real `event.origin` to
validate. A separate origin is therefore required — the no-infrastructure opaque-sandbox option is invalid.

## What Changes

- **Render book content on a separate origin.** A dedicated reader-frame document hosting the foliate
  engine is served from a configurable separate origin (dev/e2e: a second port; prod: a configurable
  origin/subdomain, documented for self-hosters). The app embeds it as a cross-origin `<iframe>`.
- **An app↔frame postMessage bridge** over a `MessageChannel`: commands `open` / `goTo(locator|cfi)` /
  `next` / `prev` / `seek(fraction)` / `applyPreferences` / `destroy`; events `ready` /
  `locatorChanged(Locator)` / `error` / `pageCount`. The app validates each message's `event.origin`
  against the configured reader origin and communicates only over the handed `MessagePort` (capability).
- **Book bytes cross as a Transferable `ArrayBuffer`.** The app (which holds credentials) fetches
  `connector.content()` and transfers the book buffer into the frame; the frame builds the foliate book
  in-frame. Credentials never cross the bridge. **ADR-005 preserved**: bytes never traverse the Service
  Worker; ranged zip slicing happens in-frame. The frame performs **no network I/O**.
- **The app-side navigator becomes a proxy** implementing the existing neutral `Navigator` interface,
  forwarding calls over the bridge and re-emitting `locatorChanged`. `markRaw()`'d (ADR-001) since it
  holds the iframe + ports; teardown destroys the frame and revokes ports/blob URLs.
- **Remove the in-app sanitizer.** Delete `src/plugins/formats/epub/content-security.ts` and
  `book-loader.ts`'s CSP threading; per-document media-type sanitization (ADR-012) is no longer the
  security boundary. Add **ADR-013 (reader origin isolation)** and mark **ADR-012 superseded**.
- **Supersede the ch7 in-app content-isolation requirement.** The blocked `add-reader-navigation`
  change's "neutralise active content / parse-and-strip" requirement (its tasks S.1–S.3 and the matching
  delta requirement) is replaced by the separate-origin guarantee owned by the new `reader-isolation`
  capability; this change revises that delta so the two reconcile when change 7 archives.
- **Reuse unchanged**: the reader chrome (6 reader Vue components + `ReaderView` wiring), the
  `isWebFormatHandler` guard, `readerPreferencesStore`, the `locatorChanged` → sync-engine hand-off,
  `bytes-source`, EPUB parse/sniff/capabilities, the `toLocator` translation, and the prefs→readium-css
  mapping (now applied in-frame).

## Capabilities

### New Capabilities

- `reader-isolation`: untrusted EPUB content renders on a separate origin behind an app↔frame postMessage
  bridge so it physically cannot reach the app origin's credentials. Covers the origin/serving model, the
  bridge command/event protocol and its origin validation, the Transferable byte transfer (no in-frame
  network, ADR-005-preserving), and the navigator-proxy lifecycle (`markRaw`, teardown).

### Modified Capabilities

- (none as a main-spec delta) — `reader-navigation` is not yet a main spec, so this change cannot emit a
  delta against it; it instead **revises that change's in-flight delta** (an implementation task) to point
  at origin isolation. `format-epub`'s observable `Navigator` contract is unchanged — only *where* it
  renders moves — so it needs no requirement delta.

## Impact

- **New code (`platform/web`):** a reader-frame entry + in-frame foliate harness served on the separate
  origin; an app-side bridge client + navigator proxy. A second Vite entry/origin for the frame; dev and
  Playwright run it on a second port.
- **Changed:** `src/app/composables/useNavigator.ts`, `src/plugins/formats/epub/navigator.ts`,
  `src/plugins/formats/epub/index.ts` (mount → cross-origin frame + bridge proxy; teardown → frame
  destroy).
- **Removed:** `src/plugins/formats/epub/content-security.ts` (whole module) and `book-loader.ts`'s CSP
  injection (the ADR-012 mechanism).
- **Docs:** `doc/plans/stack.md` — add ADR-013, mark ADR-012 superseded; `DESIGN.md` §5.2/§11
  (render-isolation) and `architecture.md` directory note; README / self-hosting doc for the reader origin.
- **Deployment (self-hosters):** the reader now needs a second origin (port or subdomain); documented,
  and provided automatically in dev/e2e.
- **Sequencing:** unblocks change 7 (the reuse-as-is reader becomes shippable once content is isolated);
  the already-proposed `harden-format-navigator-contract` contract cleanup lands afterward, on top.
