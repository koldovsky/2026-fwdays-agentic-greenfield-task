// The PDF format's plugin descriptor + lazy loader (DESIGN-CONNECTORS.md §6.1/§6.4). Unlike EPUB, PDF is NOT
// bundled: it ships as an install-on-demand chunk, so the manifest is the AVAILABLE catalog row the
// Extensions screen + the capability-missing prompt render, and the loader is the Factory the registry
// awaits on `install` — a dynamic `import()` of the bundled chunk, never remote code (ADR-010).

import type { FormatHandler, PluginLoader, PluginManifest } from '@/core/contracts'
import { PDF_CAPABILITIES, PDF_FORMAT_ID } from './capabilities'

/**
 * Install-on-demand, first-party PDF format manifest. Values match the maket exactly: `format.pdf ·
 * v1.0.3 · 1.2 MB` (`approxSizeKB` 1229 ⇒ "1.2 MB"), fixed layout, `%PDF`/`.pdf`/`application/pdf`, and
 * NO network permission (PDF reads bytes locally; it never reaches the network).
 */
export const PDF_MANIFEST: PluginManifest = {
  id: PDF_FORMAT_ID,
  name: 'PDF support',
  version: '1.0.3',
  kind: 'format',
  hostApi: '^1.0.0',
  bundled: false,
  capabilities: PDF_CAPABILITIES,
  approxSizeKB: 1229,
}

/** Lazy loader: dynamic-imports the handler chunk on first use and constructs the FormatHandler. */
export const loadPdfFormat: PluginLoader<FormatHandler> = async () => {
  const { PdfFormatHandler } = await import('./index')
  return new PdfFormatHandler()
}
