// Presentation helpers for the Extensions screen (doc/web/06) and the capability-missing prompt
// (doc/web/07): derive each plugin's capability chips, its display size, and its version label from the
// manifest's HONEST capability declaration (behaviour stays driven by the real capabilities; these are a
// curated DISPLAY of identity, matching the maket). Kept out of the .vue files so they are pure + unit-
// testable. App layer — never imported by core/plugins.

import type { ConnectorCapabilities, FormatCapabilities, PluginManifest } from '@/core/contracts'

function isFormatCapabilities(
  capabilities: PluginManifest['capabilities'],
): capabilities is FormatCapabilities {
  return Array.isArray((capabilities as FormatCapabilities).mediaTypes)
}

/** Format-renderer chips: EPUB → Reflowable/Search/TTS/CFI locators; PDF → Fixed layout/Search/Text selection. */
function formatChips(capabilities: FormatCapabilities): string[] {
  const chips: string[] = []
  if (capabilities.layout === 'reflowable') chips.push('Reflowable')
  else if (capabilities.layout === 'fixed') chips.push('Fixed layout')
  else if (capabilities.layout === 'image-sequence') chips.push('Comics')
  if (capabilities.search) chips.push('Search')
  if (capabilities.tts) chips.push('TTS')
  // The page-located, text-layer formats (PDF) surface "Text selection"; CFI formats (EPUB) their scheme.
  if (capabilities.locatorScheme === 'cfi') chips.push('CFI locators')
  else if (capabilities.locatorScheme === 'page') chips.push('Text selection')
  return chips
}

/**
 * Connector chips. The generic OPDS fallback (no native REST protocol) is curated to its protocol +
 * role chips ("OPDS 1/2" / "Always-on fallback") per the maket; a specialised connector (Komga) shows
 * its feature chips (Search / Progress sync / Page streaming / Thumbnails).
 */
function connectorChips(capabilities: ConnectorCapabilities): string[] {
  const hasOpds1 = capabilities.protocols.includes('opds1')
  const hasOpds2 = capabilities.protocols.includes('opds2')
  const hasNativeRest = capabilities.protocols.some((protocol) => protocol.endsWith('-rest'))
  if (!hasNativeRest) {
    const protocol = hasOpds1 && hasOpds2 ? 'OPDS 1/2' : hasOpds2 ? 'OPDS v2' : 'OPDS v1'
    return [protocol, 'Always-on fallback']
  }
  const chips: string[] = []
  if (capabilities.search) chips.push('Search')
  if (capabilities.progressSync) chips.push('Progress sync')
  if (capabilities.pagedStreaming) chips.push('Page streaming')
  if (capabilities.thumbnails) chips.push('Thumbnails')
  return chips
}

/** The capability chips a plugin renders in the Extensions list / install prompt. */
export function extensionChips(manifest: PluginManifest): string[] {
  const capabilities = manifest.capabilities
  return isFormatCapabilities(capabilities)
    ? formatChips(capabilities)
    : connectorChips(capabilities)
}

/** Render an approximate KB size as the maket's "1.2 MB" form (empty when unknown). */
export function formatPluginSize(approxSizeKB: number | undefined): string {
  if (approxSizeKB === undefined) return ''
  return `${(approxSizeKB / 1024).toFixed(1)} MB`
}

/** Normalise a manifest version to the maket's `v…` label (`3.0.1` → `v3.0.1`). */
export function displayVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

/** An AVAILABLE card's advisory note — a connector with no server-side progress shows "no progress API". */
export function advisoryNote(manifest: PluginManifest): string | undefined {
  const capabilities = manifest.capabilities
  if (!isFormatCapabilities(capabilities) && !capabilities.progressSync) return 'no progress API'
  return undefined
}
