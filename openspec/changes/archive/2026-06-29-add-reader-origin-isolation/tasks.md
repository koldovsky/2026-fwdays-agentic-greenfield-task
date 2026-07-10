## 1. Spike: prove the real foliate engine on a separate origin (de-risk FIRST)

- [x] 1.1 Minimal reader-frame entry that imports the vendored foliate `View`, served on a second origin
      (dev port). Feed it a real EPUB's bytes (transferred `ArrayBuffer`); confirm it paginates AND that the
      frame's script cannot read `parent.localStorage` (`SecurityError`).
- [x] 1.2 Prove BOTH fixtures (Pensées + the 14 MB light-novel) render and page across the boundary; assert
      ranged zip reads happen in-frame (a `read`-spy proves the 14 MB book is not fully materialised). Save
      the spike evidence; only proceed if green.

## 2. Reader-frame document + in-frame harness (the separate-origin renderer)

- [x] 2.1 Add a second Vite build entry `reader-frame` (own HTML + foliate bundle) served from a separate
      origin; read the origin from config (`VITE_READER_ORIGIN`), with a dev/e2e default on a second port.
- [x] 2.2 In-frame harness: register foliate custom elements, build the book from the transferred bytes via
      the EPUB zip/loader path **without any CSP injection**, mount the `View`, and `open`/`init` it.
- [x] 2.3 Move `toLocator` translation and the prefs→readium-css mapping INTO the frame (they run where the
      engine is); emit a serializable `Locator`; apply preference CSS in-frame.
- [x] 2.4 In-frame bridge server: accept the handed `MessagePort`, validate the init `event.origin` equals
      the app origin, handle commands (`open`/`goTo`/`next`/`prev`/`seek`/`applyPreferences`/`destroy`), and
      emit events (`ready` with `Publication` metadata, `locatorChanged`, `pageCount`, `error`).

## 3. App-side bridge client + navigator proxy

- [x] 3.1 Bridge client: create a `MessageChannel`, embed the cross-origin reader `<iframe>`, post the init
      handshake with `targetOrigin = READER_ORIGIN` (never `*`) transferring one port; validate every
      reply's `event.origin === READER_ORIGIN` and ignore others.
- [x] 3.2 Navigator proxy implementing the neutral `Navigator` (`goTo`/`currentLocation`/`next`/`prev`/
      `seek`/`applyPreferences`/`on`/`destroy`) by forwarding over the bridge; re-emit `locatorChanged`;
      track `currentLocation`/`pageCount` from events; `markRaw`-safe (no reactive wrap of iframe/ports).
- [x] 3.3 Teardown: `destroy` command → remove the iframe, close both `MessagePort`s, revoke any object
      URLs, drop subscriptions — exactly once (idempotent), preserving `useNavigator`'s cancel-guard.

## 4. Wire the EPUB plugin + reader to the isolated path

- [x] 4.1 `EpubFormatHandler.createNavigator` / `navigator.ts`: build the cross-origin frame + bridge proxy
      instead of mounting foliate into the `HTMLElement`; transfer book bytes; return the proxy
      (`WebNavigator`-shaped).
- [x] 4.2 `useNavigator.ts`: fetch `connector.content()`, transfer the `ArrayBuffer` to the frame, await
      `ready` for the `Publication`/TOC; keep `markRaw`, the cancel-guard, `locatorChanged`→sync, and
      teardown-once.
- [x] 4.3 Confirm the reader chrome (the 6 reader components + `ReaderView`) is unchanged and drives the
      proxy — no behaviour regression in the spread/chevrons/keyboard/position bar/TOC.

## 5. Remove the in-app sanitizer + reconcile change 7

- [x] 5.1 Delete `src/plugins/formats/epub/content-security.ts` (+ its tests) and remove `book-loader.ts`'s
      CSP-injecting `loadText` seam; spine docs load via foliate's standard path.
- [x] 5.2 Revise the blocked `add-reader-navigation` delta (`specs/reader-navigation/spec.md` and tasks
      S.1–S.3) so its content-isolation requirement points at origin isolation (reader-isolation), not
      parse-and-strip — so the two reconcile when change 7 archives.

## 6. Tests & conformance

- [x] 6.1 Unit: bridge drops foreign-origin messages; the proxy forwards each command and maps each event;
      `markRaw` non-reactivity; teardown-once closes ports + revokes URLs.
- [x] 6.2 Conformance: bridge payloads carry only serializable neutral data (no DOM nodes / live handles);
      assert no `edda.creds.*` value can appear in any posted message.
- [x] 6.3 e2e (reader served on a second origin): (a) benign EPUB paginates via chevrons + keyboard through
      the isolated frame; (b) an XSS-probe EPUB whose script runs in-frame leaves the app `localStorage`
      untouched with zero egress to the app; (c) the four prior vectors (SVG-root / forged media-type /
      manifest drift / `loadBlob`) are demonstrably moot — any in-frame script simply cannot reach the app.
- [x] 6.4 Static suite green: `pnpm typecheck && lint && format:check && test && build` (including the
      second `reader-frame` entry).

## 7. Docs

- [x] 7.1 `doc/plans/stack.md`: add ADR-013 (reader origin isolation) with the spike evidence; mark ADR-012
      superseded (retain its history).
- [x] 7.2 `DESIGN.md` §5.2/§11: the render-isolation story (separate origin + postMessage bridge); update
      `architecture.md`'s directory note for the reader-frame/platform layer.
- [x] 7.3 README / self-hosting doc: configuring the reader origin (port or subdomain), the fail-closed
      behaviour, and the dev/e2e defaults.

## 8. Verification (maker ≠ checker)

- [ ] 8.1 Independent Gate-2 security review on the diff confirms NO HIGH remains — the credential-exfil
      class is closed by construction (separate origin), not by sanitization; address any findings.
- [x] 8.2 `openspec validate add-reader-origin-isolation --strict` passes and the change is ready to archive.
