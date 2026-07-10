// The EPUB format's plugin descriptor + lazy loader (DESIGN-CONNECTORS.md §6.1/§6.4). The manifest is the static,
// serializable row the registry/catalog resolves a sniff against and shows in any install prompt; the
// loader is the Factory — a dynamic `import()` of the bundled chunk on first use ("install" = import a
// first-party chunk, never remote code — ADR-009/ADR-010). The foliate engine itself stays a further
// code-split chunk reached only from inside the handler, so registering this manifest never pulls the
// engine into the shell.

import type { FormatHandler, PluginLoader, PluginManifest } from '@/core/contracts'
import { EPUB_CAPABILITIES, EPUB_FORMAT_ID } from './capabilities'

/** Bundled, first-party EPUB format manifest (host API `^1.0.0`). Version matches the maket's
 *  Extensions row (`format.epub · v3.0.1`, doc/web/06). */
export const EPUB_MANIFEST: PluginManifest = {
  id: EPUB_FORMAT_ID,
  name: 'EPUB',
  version: '3.0.1',
  kind: 'format',
  hostApi: '^1.0.0',
  bundled: true,
  capabilities: EPUB_CAPABILITIES,
  // Rough installed size shown in the catalog (foliate engine + adapter chunk).
  approxSizeKB: 180,
}

/** Lazy loader: dynamic-imports the handler chunk on first use and constructs the FormatHandler. */
export const loadEpubFormat: PluginLoader<FormatHandler> = async () => {
  const { EpubFormatHandler } = await import('./index')
  return new EpubFormatHandler()
}
