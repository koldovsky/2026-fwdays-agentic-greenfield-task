## 1. Core model & contracts (neutral foundation)

- [x] 1.1 Add `ReadingPreferences` to `src/core/model/index.ts` (`theme` ∈ {light,sepia,dark,parchment}, `fontFamily`, `fontSize`, `lineHeight`, `scroll`, `rtl` — all optional) and export it; no DOM/network types.
- [x] 1.2 Add `PublicationSource` (`size(): Promise<number>`, `read(offset, length): Promise<Uint8Array>`), `SniffInput`, `Unsubscribe`, and `NavigatorOptions` (`{ source: PublicationSource; preferences?: ReadingPreferences }`) to `src/core/contracts/index.ts`.
- [x] 1.3 Enrich the neutral `Navigator`: add `next`/`prev`/`seek(fraction)`/`applyPreferences`/`destroy` and typed `on` overloads (`'locatorChanged' → Locator`, `'error' → unknown`); rename `currentLocation()` → `currentLocator()`.
- [x] 1.4 Reshape the neutral `FormatHandler`: add `capabilities`/`sniff(input)`/`open(source: PublicationSource)`; **remove** `parse(bytes: Uint8Array)`.
- [x] 1.5 Add a neutral `publicationSourceFromBytes(bytes: Uint8Array): PublicationSource` helper (no web types) for full-buffer callers and tests.

## 2. Platform/web extension

- [x] 2.1 In `src/platform/web/web-format-handler.ts`: add `WebNavigator extends Navigator { pageCount(): number | undefined }`; make `WebFormatHandler.createNavigator(...)` return `Promise<WebNavigator>`; keep the structural `isWebFormatHandler` guard.
- [x] 2.2 Add web source builders `publicationSourceFromFile(file: File)` and `publicationSourceFromStream(stream, size?)` (drain → in-memory source) in `platform/web`; export them from `src/platform/web/index.ts`.

## 3. EPUB plugin (the adapter + rewrites)

- [x] 3.1 Add `PublicationSourceReader` (a zip.js `Reader`: set `size` from `await source.size()` in `init()`, delegate `readUint8Array(index, length)` to `source.read`); extend the `foliate-js/vendor/zip.js` ambient declaration in `foliate-js.d.ts` with the `Reader` base class.
- [x] 3.2 Change `openFoliateBook` to take a `PublicationSource` and build `new ZipReader(new PublicationSourceReader(source))`; verify the ADR-012 `loadText`/CSP injection and ADR-005 ranged reads are unchanged (they read through the zip reader).
- [x] 3.3 `EpubFormatHandler implements WebFormatHandler`: `open(source: PublicationSource)`, `createNavigator` returns `WebNavigator`; remove the old `parse(bytes)` method.
- [x] 3.4 `navigator.ts`: accept `NavigatorOptions.source: PublicationSource`; rename `currentLocation`→`currentLocator`; delete the `loaded` event + sticky one-shot replay (initial render = factory promise resolution); keep `pageCount()` on the returned `WebNavigator`; import `ReadingPreferences` from `core/model` (keep `THEME_COLORS`/`buildReadingCss` local to the plugin).
- [x] 3.5 Retire `EpubBytesSource`/`sourceToFile` from `bytes-source.ts` now the plugin consumes a `PublicationSource`; relocate any still-needed web builders to `platform/web` (task 2.2).

## 4. App reader retype (removes app→plugin coupling)

- [x] 4.1 `src/app/composables/useNavigator.ts`: import `WebNavigator` from `@/platform/web`, drop the `@/plugins/formats/epub/navigator` import, and retype `navigator`/`getNavigator`.
- [x] 4.2 `useNavigator.ts`: build a `PublicationSource` (`publicationSourceFromFile`/`...FromBytes`) and call `handler.open(source)` instead of `handler.parse(bytes)`.
- [x] 4.3 `useNavigator.ts`: rename the `currentLocation()` call to `currentLocator()`; confirm the `pageCount` ref and `locatorChanged` → sync wiring are intact.

## 5. Tests & conformance

- [x] 5.1 Conformance test: the neutral `core/contracts.Navigator`/`FormatHandler` and `PublicationSource` carry no DOM/web type, and `HTMLElement` appears only on `platform/web`'s `WebFormatHandler.createNavigator`.
- [x] 5.2 Plugin tests: open both fixtures (large light-novel + Pensées) via a `PublicationSource`; assert the 14 MB EPUB is read by range (a `read`-spy proves no full materialisation); drop `loaded`-event assertions; cover the `currentLocator` rename.
- [x] 5.3 `useNavigator.test.ts`: update the mock to the neutral/`WebNavigator` surface, `open(source)`, and `currentLocator`; keep the `markRaw` non-reactivity, `destroy`-once/unsubscribe, and `locatorChanged → syncEngine` (never `setProgress`) assertions.
- [x] 5.4 `ReadingPreferences` model test: plain/serializable round-trip, `theme` closed set, partial update valid.
- [x] 5.5 Static suite green: `pnpm` type-check + ESLint + Vitest.

## 6. Docs

- [x] 6.1 Rewrite `DESIGN.md` §5.2: neutral interface + `platform/web` factory split; remove `HTMLElement` from the neutral interface; add `next`/`prev`/`seek`; define `PublicationSource`; mark `pageCount` web-only; state the principle "the only platform-specific members are the navigator factory and its mount type".
- [x] 6.2 Update `architecture.md` §13 (`epub/` directory note) to mention the `platform/web` `WebFormatHandler`/`WebNavigator` extension.
- [x] 6.3 Update the plugin `README.md` to describe `open(source)` / `PublicationSource` (no `parse(bytes)`).

## 7. Verification (maker≠checker)

- [x] 7.1 e2e (`e2e/reader.spec.ts`): the reader still opens a real EPUB and pages via chevrons + keyboard — no behavior regression from the contract reshape.
- [ ] 7.2 Independent review pass (`/code-review` or a separate agent) on the diff; address findings — the maker must not be the checker.
- [x] 7.3 `openspec validate harden-format-navigator-contract --strict` passes and the change is ready to archive.
