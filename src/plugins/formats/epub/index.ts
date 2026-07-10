// EPUB FormatHandler over the vendored foliate-js engine (ADR-002). Parses a neutral, random-access
// `PublicationSource` CLIENT-SIDE (no network I/O) into a Readium-aligned `Publication`, declares EPUB
// capabilities, sniffs input, and creates a web `Navigator` over a mounted element. foliate-js,
// @readium/shared, the `<iframe>` and all DOM live in this plugin folder; it emits plain `core/model`
// shapes back across the boundary so `core/*` stays platform-neutral.
//
// The foliate engine is reached ONLY via dynamic `import()` (ADR-009) so it is a code-split chunk
// loaded on first `open`, never at module-evaluation time — the plugin is async from day one. The
// vendored copy under `vendor/foliate-js` is referenced through the `foliate-js` Vite alias; nothing
// is fetched from the network to "install" the format.

import type {
  FormatCapabilities,
  NavigatorOptions,
  PublicationSource,
  SniffInput,
} from '@/core/contracts'
import { MEDIA_TYPE_EPUB, type Publication } from '@/core/model'
import { sniffMagic } from '@/core/sniff'
import type { WebFormatHandler, WebNavigator } from '@/platform/web'
import { EPUB_CAPABILITIES, EPUB_FORMAT_ID } from './capabilities'
import { openFoliateBook } from './book-loader'
import { toPublication } from './to-publication'

// Re-exported as part of the handler's public surface (tests + the manifest read these).
export { EPUB_CAPABILITIES, EPUB_FORMAT_ID }

/**
 * The EPUB `WebFormatHandler` (`platform/web`'s web extension of the neutral `core/contracts.FormatHandler`).
 * The neutral surface (`id` / `mediaTypes` / `capabilities` / `sniff` / `open`) is the native client's
 * conformance target; `createNavigator` (with its `HTMLElement` mount) is the one web-only member.
 */
export class EpubFormatHandler implements WebFormatHandler {
  readonly id = EPUB_FORMAT_ID
  readonly mediaTypes = [MEDIA_TYPE_EPUB] as const
  readonly capabilities: FormatCapabilities = EPUB_CAPABILITIES

  /** Claim EPUB input by media type, extension, or ZIP head bytes; reject everything else. */
  sniff(input: SniffInput): number {
    if (input.mediaType && input.mediaType.toLowerCase() === MEDIA_TYPE_EPUB) return 1
    if (input.extension && input.extension.toLowerCase().replace(/^\./, '') === 'epub') return 0.9
    // The ZIP signature is shared with CBZ, so head bytes alone are a moderate (not certain) claim.
    if (input.headBytes && sniffMagic(input.headBytes) === MEDIA_TYPE_EPUB) return 0.6
    return 0
  }

  /**
   * Open a random-access `PublicationSource` (OPFS file / drained stream / in-memory buffer) into a
   * neutral `Publication`. Ranged reads survive (ADR-005) — the source is read through the same zip
   * reader the renderer uses; the headless book is destroyed once its metadata/TOC are mapped.
   */
  async open(source: PublicationSource): Promise<Publication> {
    const book = await openFoliateBook(source)
    try {
      return toPublication(book)
    } finally {
      book.destroy()
    }
  }

  /**
   * Create the web Navigator over a mounted element. As of ADR-013 the renderer runs on a SEPARATE
   * origin: this builds the cross-origin reader frame + bridge proxy (lazy-imported so the bridge code
   * stays out of the initial bundle) instead of mounting foliate on the app origin. The returned proxy
   * implements the neutral {@link WebNavigator} the reader chrome already drives.
   */
  async createNavigator(
    publication: Publication,
    mount: HTMLElement,
    options: NavigatorOptions,
  ): Promise<WebNavigator> {
    const { createEpubNavigatorProxy } = await import('./navigator-proxy')
    return createEpubNavigatorProxy(publication, mount, options)
  }
}

export default EpubFormatHandler
