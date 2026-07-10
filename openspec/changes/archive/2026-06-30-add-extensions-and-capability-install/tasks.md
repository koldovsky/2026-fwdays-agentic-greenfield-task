## 1. Capability dispatch & media-type sniffing

- [x] 1.1 Implement the media-type sniffer in `src/core/sniff/` (priority: connector metadata → HTTP
      `Content-Type` → extension → magic bytes), returning a `MatchConfidence` (`DESIGN.md` §7)
- [x] 1.2 Implement the Capability Dispatcher in `src/core/dispatch/`: `openBook(bookRef)` sniffs, calls
      the registry's `resolveFormat`/`resolveConnector`, and yields `ready | installable | unsupported`
      (no DOM/`fetch`/`window` — platform-neutral)
- [x] 1.3 Vitest: EPUB → `ready`; PDF with `format.pdf` absent → `installable`; unknown type →
      `unsupported`; metadata outranks a misleading extension

## 2. CapabilityMissing observer + retry/degrade flow

- [x] 2.1 Emit a `CapabilityMissing` event over the host `EventBus` on `installable`, carrying the
      suggested manifest (id, version, size, capabilities, permissions); add subscribe/unsubscribe
- [x] 2.2 Wire accept → registry `install` (dynamic import + persist enabled id) → re-issue the original
      `openBook` → assert it resolves to `ready` and the book opens (`DESIGN.md` §8.1)
- [x] 2.3 Wire `unsupported` and "Not now" to the raw-file-download path (reuse `add-offline-and-sync`);
      show a "format not supported" message for `unsupported`
- [x] 2.4 Vitest: install→retry opens the book; a second PDF opens with no prompt; decline/unsupported
      offer the raw download and do not install

## 3. Capability-missing modal (screen 07)

- [x] 3.1 Build `CapabilityMissingModal` subscribing to `CapabilityMissing`: format glyph + extension
      badge, "Install PDF support?" title, the quoted body, the `format.pdf · v1.0.3 · 1.2 MB` card,
      chips "Fixed layout"/"Search"/"Text selection", "No network access" / "Runs sandboxed" badges,
      primary "Install & open", secondary "Not now — download the file instead", and the caption —
      built to `doc/web/07-capability-missing-desktop.png`
- [x] 3.2 Component test: the modal renders every string/chip/action from `doc/web/07`

## 4. Extensions screen (screen 06)

- [x] 4.1 Build `SettingsExtensions.vue` from the registry: "Extensions" heading + subtitle,
      "Host API v1.2" pill, INSTALLED list (name, monospace `id · version`, capability chips, BUNDLED
      tag, enable toggle), AVAILABLE catalog (name, `id · size`, advisory note, Install), and the
      "First-party & sandboxed" footer — built to `doc/web/06-extensions-desktop.png`
- [x] 4.2 Wire Install (dynamic import + persist; moves AVAILABLE→INSTALLED) and the enable/disable
      toggles (disabling removes the plugin from dispatch resolution, reversibly, without data loss)
- [x] 4.3 Provide catalog manifests for the AVAILABLE entries (PDF/Kavita/Calibre/CBZ); only
      `format.pdf` installs to a working chunk in this change
- [x] 4.4 Component test: INSTALLED renders OPDS/Komga/EPUB with exact chips + BUNDLED; AVAILABLE renders
      PDF (NEXT UP)/Kavita/Calibre (no progress API)/CBZ with sizes; installing PDF moves it to INSTALLED

## 5. connector-opds (generic OPDS 1/2 fallback)

- [x] 5.1 Implement/finish the shared `_opds-core` (feed parsing, acquisition-link resolution, OPDS v2
      progression mapping) under `src/plugins/connectors/_opds-core/` (composition, not inheritance —
      `DESIGN.md` §10; reconcile with `connector.komga`'s use)
- [x] 5.2 Implement `connector.opds` (bundled, always-available): `probe` returns low-confidence
      positive for OPDS roots; `listShelves`/`listBooks`/`search` map feeds to shelves/`BookRef`s with
      media types from acquisition links; `downloadBook` returns bytes for OPFS (bypassing the SW)
- [x] 5.3 Declare `progressSync` honestly: `true` + `getProgress`/`setProgress` only when the server
      advertises OPDS v2 progression; otherwise `false` and local-only
- [x] 5.4 Tests: typed `BookRef`s from an acquisition feed; OPDS yields to Komga on probe confidence;
      progression on/off toggles `progressSync` (integration-test browse/download vs the throwaway
      Docker Komga's OPDS endpoint — `pnpm komga:up`, reader `reader@edda.test`)

## 6. format-pdf (install-on-demand)

- [x] 6.1 Add the `format.pdf` lazy chunk under `src/plugins/formats/pdf/` (pdfjs-dist) with a manifest:
      `v1.0.3`, ~1.2 MB, `application/pdf`/`.pdf`/`%PDF`, layout `fixed`, locator `page`, `search: true`,
      no network permission
- [x] 6.2 Implement `sniff` (high for PDF media type/extension/`%PDF`, ~0 otherwise) and `open` (parse to
      a `fixed` `Publication` with reading order + metadata + outline TOC; `markRaw()` the renderer)
- [x] 6.3 Implement page-based locators (1-based `position` + optional coord `fragment`); `goTo`/
      `currentLocator` round-trip; read bytes by range from the `PublicationSource` (bypassing the SW)
- [x] 6.4 Tests: `%PDF` sniff high / EPUB sniff ~0; opening a PDF yields a fixed `Publication`; locator
      round-trips to its page; a range read serves a partial without full download

## 7. Verification (maker ≠ checker)

- [x] 7.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 7.2 Design-fidelity check (Playwright): capture the Extensions screen and the capability-missing
      modal and compare composition against `doc/web/06-extensions-desktop.png` and
      `doc/web/07-capability-missing-desktop.png`
- [x] 7.3 End-to-end: opening a PDF with `format.pdf` absent shows the prompt → "Install & open"
      dynamic-imports + enables the chunk → the open is retried → the book opens (and a later PDF opens
      with no prompt)
- [ ] 7.4 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
- [x] 7.5 `openspec validate add-extensions-and-capability-install --strict` passes
