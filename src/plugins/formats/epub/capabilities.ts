// The EPUB format's static descriptor constants — kept in a dependency-light module so the manifest
// can declare them WITHOUT statically importing the handler (index.ts). That keeps the manifest's
// `loader` genuinely lazy: the handler chunk (and, behind it, the foliate engine) loads only on first
// use, not whenever the catalog references the manifest.

import type { FormatCapabilities } from '@/core/contracts'
import { MEDIA_TYPE_EPUB } from '@/core/model'

/** Stable plugin id — the design's canonical DOT form (`format.epub`), matching the connector ids
 *  (`connector.opds`/`connector.komga`), the maket's Extensions rows, and the registry/persistence set. */
export const EPUB_FORMAT_ID = 'format.epub'

/** The EPUB renderer's declared capabilities (DESIGN-CONNECTORS.md §5.2). */
export const EPUB_CAPABILITIES: FormatCapabilities = {
  mediaTypes: [MEDIA_TYPE_EPUB],
  extensions: ['epub'],
  layout: 'reflowable',
  search: true,
  tts: true,
  locatorScheme: 'cfi',
}
