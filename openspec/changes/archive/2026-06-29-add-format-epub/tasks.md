## 1. Vendor foliate-js & dependencies

- [x] 1.1 Add `vendor/foliate-js` as a **pinned-SHA git submodule** (MIT) with the commit recorded in
      `.gitmodules` (ADR-002); document the update path in the plugin folder
- [x] 1.2 Add `@readium/shared` to `package.json` (ADR-003) for the CFI↔Locator adapter
- [x] 1.3 Confirm Vite **code-splits** the foliate engine: it is reached only via dynamic `import()`,
      not a static import (engine excluded from the initial bundle)

## 2. EPUB FormatHandler: capabilities, sniff, parse

- [x] 2.1 Implement the handler in `src/plugins/formats/epub/index.ts` declaring `FormatCapabilities`
      (`mediaTypes: ["application/epub+zip"]`, `extensions: ["epub"]`, `layout: 'reflowable'`,
      `search: true`, `tts: true`, `locatorScheme: 'cfi'`) and a stable id
- [x] 2.2 Implement `sniff` over media type, extension, and EPUB ZIP head bytes; reject non-EPUB input
- [x] 2.3 Implement client-side `open`/parse → Readium-aligned `Publication` (metadata, spine
      `readingOrder`, TOC from nav doc or NCX), lazy-loading the vendored engine via dynamic `import()`
- [x] 2.4 Add `src/plugins/formats/epub/manifest.ts` (`PluginManifest` + lazy `loader: () => import('./')`)
- [x] 2.5 Vitest: parse **both** `test-epubs/` fixtures and assert metadata + non-empty reading order +
      non-empty TOC (title `The Eminence in Shadow, Vol. 1` / `Daisuke Aizawa and Touzai`;
      title `Pensées` / `Blaise Pascal`)

## 3. Bytes source (OPFS vs stream)

- [x] 3.1 Accept a bytes source that is either an OPFS-backed file (range reads via `File.slice`,
      bypassing the SW — ADR-005) or a sequential stream; parse identically from both, no network I/O
- [x] 3.2 Vitest: open the same EPUB from an OPFS-style file source and a stream source; assert
      equivalent `Publication`; assert the large EPUB is read by range (not fully buffered)

## 4. CFI ↔ Locator adapter

- [x] 4.1 Implement `src/plugins/formats/epub/cfi-locator.ts`: map foliate CFI / DOM `Range` ⇄ neutral
      `core/model` `Locator` (CFI in `locations`), using `@readium/shared` internally
- [x] 4.2 Ensure the adapter emits **plain serializable** `core/model` Locators (no `@readium/shared`
      class instances leak into `core/model`); keep the adapter pure
- [x] 4.3 Vitest: CFI round-trips stably for **both** fixtures (`cfi → Locator → cfi` is identity); a
      DOM `Range → Locator → Range` resolves to the same selection; emitted Locator survives
      `structuredClone`/JSON

## 5. EPUB Navigator over a mounted element

- [x] 5.1 Implement `src/plugins/formats/epub/navigator.ts`: `createNavigator(pub, mount: HTMLElement, opts)`
      returning a `Navigator` with `goTo`/`currentLocation`, `applyPreferences`, `on('loaded' |
      'locatorChanged' | 'error')` + unsubscribe, and `destroy()`
- [x] 5.2 `currentLocation()` reflects the position set by the most recent `goTo`; navigation emits
      `locatorChanged`; keep the neutral `Navigator` contract DOM-free (the `HTMLElement` is web-only)
- [x] 5.3 Browser-environment test (Vitest browser mode or Playwright, since foliate renders into an
      `<iframe>`): for **both** fixtures, `goTo(target)` → `currentLocation()` resolves to `target`;
      `applyPreferences` re-flows; `loaded`/`error` fire; `destroy()` tears down

## 6. markRaw() boundary

- [x] 6.1 Return plain imperative `Publication`/`Navigator`; import no Vue in the package; document on
      the contract that consumers must `markRaw()` them before storing in reactive state (ADR-001)
- [x] 6.2 Test: returned objects are non-reactive (`isReactive` false); assert the package has no
      UI-framework import

## 7. Verification (maker ≠ checker)

- [x] 7.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 7.2 Real-input gate (this change is **headless** — the Playwright-vs-`doc/web/*.png`
      design-fidelity check does not apply; there is no screen): both `test-epubs/` fixtures parse to a
      valid `Publication`, the CFI↔Locator adapter round-trips for both, and the browser-environment
      Navigator test passes
- [ ] 7.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings —
      focus on the neutrality boundary (no web types in `core/model`) and the lazy-import boundary
- [x] 7.4 `openspec validate add-format-epub --strict` passes
