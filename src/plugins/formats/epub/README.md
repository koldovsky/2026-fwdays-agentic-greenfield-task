# `format-epub` — the EPUB renderer plugin

An EPUB `WebFormatHandler` over the **vendored foliate-js** engine (ADR-002). Opens a neutral
`PublicationSource` client-side into a Readium-aligned `Publication`, owns a tested CFI↔Locator adapter
(ADR-003), and creates a `WebNavigator` over a mounted `HTMLElement`. No reader UI and no progress
persistence live here (changes 7 and 9). `core/model` + `core/contracts` stay platform-neutral —
foliate-js, `@readium/shared`, the `<iframe>` and all DOM live entirely in this folder; it emits plain
serializable `core/model` shapes.

`EpubFormatHandler implements WebFormatHandler` (`platform/web`'s extension of the neutral
`core/contracts.FormatHandler`). The single entry point for reading a publication is
`open(source: PublicationSource)` — there is no `parse(bytes: Uint8Array)` method. A caller holding a
complete byte array wraps it in an in-memory source first:

```ts
import { publicationSourceFromBytes } from '@/core/contracts'
const pub = await handler.open(publicationSourceFromBytes(bytes))
```

Three `PublicationSource` builders are available; their locations follow the DOM boundary rule:

| Builder | Lives in | When to use |
|---|---|---|
| `publicationSourceFromBytes(bytes)` | `core/contracts` (neutral) | in-memory byte arrays; tests |
| `publicationSourceFromFile(file)` | `platform/web` | OPFS `File` / `Blob` (range reads via `File.slice`) |
| `publicationSourceFromStream(stream)` | `platform/web` | sequential `ReadableStream`; drained into a buffer |

`platform/web` builders carry web types (`File`, `ReadableStream`) and therefore cannot live in
`core/contracts`. The neutral `publicationSourceFromBytes` carries no web type and is the helper
conformance tests use.

## Files

- `index.ts` — `EpubFormatHandler`: `capabilities`, `sniff`, `open(source: PublicationSource)`,
  `createNavigator(publication, mount, options)`.
- `capabilities.ts` — the static id + `FormatCapabilities` (kept dependency-light so the manifest's
  loader stays truly lazy).
- `manifest.ts` — `PluginManifest` + the lazy `loader` (dynamic-imports the handler chunk on first use).
- `book-loader.ts` — bridges a `PublicationSource` to the foliate zip reader via `PublicationSourceReader`
  (a zip.js `Reader` that delegates ranged reads to `source.read(offset, length)` — ADR-005).
- `to-publication.ts` — pure foliate→`Publication` mapping + metadata normalizers.
- `cfi-locator.ts` — the CFI↔`Locator` adapter (pure string round-trip; DOM-Range helpers lazy-import
  foliate's CFI engine).
- `navigator-proxy.ts` — the app-side `WebNavigator` proxy created by `createNavigator`: embeds the
  cross-origin reader `<iframe>` (ADR-013) and forwards calls over a `MessageChannel` bridge.
- `foliate-js.d.ts` — ambient types for the vendored engine reached via the `foliate-js` Vite alias.

## Vendored foliate-js (pinned submodule) — update path

foliate-js has no npm release, so it is vendored as a **pinned-SHA git submodule** at `vendor/foliate-js`
and reached only via dynamic `import()` through the `foliate-js` alias (see `vite.config.ts`), so the
engine is a code-split chunk excluded from the initial bundle.

- **Pinned commit:** `78914aef4466eb960965702401634c2cb348e9b1`. The pin is the submodule **gitlink**
  recorded in the superproject (mode `160000`); `.gitmodules` records the path + url. Verify with
  `git submodule status vendor/foliate-js`.
- **To update the engine:**
  1. `git -C vendor/foliate-js fetch origin`
  2. `git -C vendor/foliate-js checkout <new-sha>`
  3. `git add vendor/foliate-js` (records the new gitlink) and commit — this is a deliberate, reviewed bump.
  4. **Regression gate:** re-run `pnpm test` (the both-fixture parse + CFI round-trip suites) and the
     `e2e/epub-navigator.spec.ts` Navigator test. These exercise the real `test-epubs/` fixtures and are
     the guard against an upstream change breaking parsing or CFI stability.
- The engine ships its own nested `vendor/zip.js` + `vendor/fflate.js` (committed build artifacts), so no
  extra install step is needed; only `node_modules/` is gitignored upstream.
