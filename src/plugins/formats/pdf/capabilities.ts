// The PDF format's static descriptor constants — kept dependency-light (no pdfjs import) so the
// manifest can declare them WITHOUT pulling the pdfjs engine into the shell. The handler chunk (and
// pdfjs behind it) loads only on first `open`, never when the catalog references the manifest.

import type { FormatCapabilities } from '@/core/contracts'
import { MEDIA_TYPE_PDF } from '@/core/model'

/** Stable plugin id — the design's canonical DOT form (`format.pdf`), matching the maket. */
export const PDF_FORMAT_ID = 'format.pdf'

/**
 * The PDF renderer's declared capabilities (DESIGN-CONNECTORS.md §5.2): a fixed-layout, page-located format with
 * search + a selectable text layer, and NO network permission. The Extensions/install prompt chips
 * ("Fixed layout"/"Search"/"Text selection") are derived from these (`extensionChips`).
 */
export const PDF_CAPABILITIES: FormatCapabilities = {
  mediaTypes: [MEDIA_TYPE_PDF],
  extensions: ['pdf'],
  layout: 'fixed',
  search: true,
  locatorScheme: 'page',
}
