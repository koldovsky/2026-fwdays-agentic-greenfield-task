## Why

`DESIGN.md` §5.2 — cited by three files as the authority for the Format/Navigator contract —
contradicts the shipped `core/contracts`. §5.2 puts `HTMLElement` in the *neutral* interface (violating
the load-bearing "core/contracts carries no DOM" rule), while the contract that actually shipped is too
thin: it drops the DOM-free reader verbs (`next`/`prev`/`seek`/`applyPreferences`/`on`/`destroy`) onto
the concrete web `EpubNavigator`, and it forces full buffering via `parse(bytes: Uint8Array)` — the exact
anti-pattern ADR-005's ranged zip reads exist to avoid. Two consequences: the future native (Kotlin)
client has **no conformance target** for paging, preferences, the locator stream, or lifecycle; and the
app already couples to the EPUB plugin's concrete type (`useNavigator.ts` imports
`@/plugins/formats/epub/navigator`). This is the **last cheap moment** to fix it — changes 8
(`reading-preferences` → `applyPreferences`) and 9 (`offline-and-sync` → `on('locatorChanged')`) have not
landed, `on('loaded')` and `on('error')` have zero subscribers, and `ReadingPreferences` has no
references outside the plugin.

The governing principle: **everything on the navigator except the *factory* and its *mount type* is
neutral.** The `HTMLElement` mount (web) / native view (later) and the byte source's web types are the
only platform-specific atoms; draw the line there and every other member becomes shared, conformance-
tested contract.

## What Changes

- **Enrich the neutral `core/contracts.Navigator`** with the DOM-free reader verbs the native client
  also needs: `next`, `prev`, `seek`, `applyPreferences`, `on`, `destroy`. **BREAKING**: rename
  `currentLocation()` → `currentLocator()` (matches `DESIGN.md` §5.2, the `locatorChanged` event, and the
  `Locator` return type).
- **Replace `FormatHandler.parse(bytes: Uint8Array)` with `open(source: PublicationSource)`**, a neutral
  random-access byte source (`size()` / `read(offset, length)`) that preserves ADR-005 ranged reads;
  full-buffer callers wrap bytes in a trivial in-memory source — one path, no footgun. **BREAKING**:
  removes `parse`.
- **Add `capabilities` and `sniff` to the neutral `FormatHandler`** — they already exist on the concrete
  handler; the contract simply failed to declare them.
- **Isolate the one genuinely web-bound member** — the navigator factory and its `HTMLElement` mount —
  in `platform/web` as `WebFormatHandler.createNavigator(...) → WebNavigator`. `pageCount()` (a
  viewport-dependent estimate that cannot be conformance-matched across platforms) lives on
  `WebNavigator`, not the neutral contract.
- **Drop the `'loaded'` event** — "loaded" is the `open`/`createNavigator` promise resolving (zero
  subscribers); this deletes the sticky one-shot replay hack in `navigator.ts`. Keep typed
  `'locatorChanged'` and `'error'` (post-load faults can't reject a settled promise).
- **Move `ReadingPreferences` to `core/model`** as shared, serializable vocabulary (zero external refs
  today, so the move is free).
- **Retype the in-progress reader's `useNavigator`** to the neutral `Navigator` / `WebNavigator`
  (removing the `app → @/plugins/formats/epub` coupling) and switch its open path to `open(source)`.
- **Rewrite `DESIGN.md` §5.2** to show the neutral interface + the platform factory split, define
  `PublicationSource` neutrally, add next/prev/seek (§5.2 omitted them), and state the principle above.
  Touch `architecture.md` §13's directory-layout note.

## Capabilities

### New Capabilities

- (none — this change hardens existing contracts; it introduces no new capability)

### Modified Capabilities

- `format-epub`: the Format/Navigator **contract shape**. `open(source)` replaces `parse(bytes)` over a
  neutral `PublicationSource`; the neutral `Navigator` gains the DOM-free reader verbs and the
  `currentLocator()` name; `capabilities` and `sniff` join the neutral `FormatHandler`; the navigator
  factory, `HTMLElement` mount, and `pageCount()` are isolated as the `platform/web`
  `WebFormatHandler` / `WebNavigator` extension; the `'loaded'` event is removed.
- `core-domain-model`: add `ReadingPreferences` as shared, serializable reading-preference vocabulary
  (theme / typeface / text size / line height / paged-vs-scroll / RTL) that the native client
  re-expresses and the serialization conformance tests guard.

## Impact

- **Contracts:** `src/core/contracts/index.ts` — enrich `Navigator`, rename, add `capabilities`/`sniff`/
  `open` to `FormatHandler`, add `PublicationSource`/`SniffInput`/`Unsubscribe`/`NavigatorOptions`, drop
  `parse`. `src/core/model/index.ts` — add `ReadingPreferences`.
- **Platform:** `src/platform/web/web-format-handler.ts` — `WebNavigator` (holds `pageCount`);
  `createNavigator` returns it; structural `isWebFormatHandler` guard unchanged.
- **Plugin:** `src/plugins/formats/epub/{index,navigator,bytes-source}.ts` — implement
  `WebFormatHandler`; `open(source)` over a `PublicationSource → zip.js Reader` adapter (the one real
  implementation risk, replacing `BlobReader(file)`); import `ReadingPreferences` from `core/model`;
  rename; delete the `loaded` emit + sticky replay.
- **App (reader — in-progress change 7):** `src/app/composables/useNavigator.ts` — import `WebNavigator`
  (not `EpubNavigator`), build a `PublicationSource`, call `open(source)`, rename
  `currentLocation` → `currentLocator`.
- **Docs:** rewrite `DESIGN.md` §5.2; update `architecture.md` §13 directory-layout note.
- **Tests:** conformance tests target the enriched neutral `Navigator`/`FormatHandler`; update the plugin
  and `useNavigator` tests for the renames and `open(source)`.
- **Downstream-enabling:** changes 8 (`reading-preferences`) and 9 (`offline-and-sync`) are then born
  against the neutral contract instead of the plugin's concrete navigator type.
