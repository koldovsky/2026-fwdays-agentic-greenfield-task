// Media-type sniffer (DESIGN-CONNECTORS.md §7). Priority order: connector metadata → HTTP Content-Type →
// file extension → magic bytes. Connector metadata and Content-Type both arrive as the SniffInput's
// `mediaType` (the connector/transport already resolved the type), which is therefore the highest-
// confidence signal; the extension and the leading bytes are lower-confidence fallbacks for resources
// that arrive without a declared type. Platform-neutral: no DOM, no `fetch`, no `window` — the
// dispatcher (and the future native client) run this verbatim.

import type { SniffInput } from '@/core/contracts'
import { MEDIA_TYPE_CBZ, MEDIA_TYPE_EPUB, MEDIA_TYPE_PDF, type MediaType } from '@/core/model'

const MAGIC: ReadonlyArray<{ readonly bytes: readonly number[]; readonly mediaType: MediaType }> = [
  { bytes: [0x50, 0x4b, 0x03, 0x04], mediaType: MEDIA_TYPE_EPUB }, // ZIP container (EPUB / CBZ)
  { bytes: [0x25, 0x50, 0x44, 0x46], mediaType: MEDIA_TYPE_PDF }, // "%PDF"
]

/** Known file extensions Edda can map to a media type (used when no declared type is present). */
const EXTENSION_TO_MEDIA_TYPE: Readonly<Record<string, MediaType>> = {
  epub: MEDIA_TYPE_EPUB,
  pdf: MEDIA_TYPE_PDF,
  cbz: MEDIA_TYPE_CBZ,
}

/** Identify a media type from the leading bytes of a resource, if recognised. */
export function sniffMagic(head: Uint8Array): MediaType | undefined {
  for (const signature of MAGIC) {
    if (signature.bytes.every((byte, index) => head[index] === byte)) {
      return signature.mediaType
    }
  }
  return undefined
}

/** Normalise a file extension to its bare, lower-case form (`.PDF` / `pdf` → `pdf`). */
function normaliseExtension(extension: string): string {
  return extension.toLowerCase().replace(/^\./, '')
}

/**
 * The detected media type plus a 0..1 confidence reflecting WHICH source identified it. A higher
 * confidence wins when multiple signals disagree, so the dispatcher trusts a declared type over a
 * (possibly misleading) extension or a byte signature shared between formats (ZIP ⇒ EPUB or CBZ).
 */
export interface SniffResult {
  mediaType: MediaType | undefined
  confidence: number
}

/** No signal identified the resource. */
const UNKNOWN: SniffResult = { mediaType: undefined, confidence: 0 }

/**
 * Detect a resource's media type from the highest-confidence available signal (DESIGN-CONNECTORS.md §7):
 *   1. a declared `mediaType` (connector metadata / HTTP `Content-Type`) — confidence 1.0
 *   2. a file `extension` — confidence 0.7
 *   3. leading `headBytes` (`%PDF`, ZIP) — confidence 0.5
 * Returns the first match in that order, so reliable metadata always outranks a misleading extension.
 */
export function sniff(input: SniffInput): SniffResult {
  if (input.mediaType && input.mediaType.trim() !== '') {
    return { mediaType: input.mediaType.toLowerCase(), confidence: 1 }
  }
  if (input.extension) {
    const mediaType = EXTENSION_TO_MEDIA_TYPE[normaliseExtension(input.extension)]
    if (mediaType) return { mediaType, confidence: 0.7 }
  }
  if (input.headBytes) {
    const mediaType = sniffMagic(input.headBytes)
    if (mediaType) return { mediaType, confidence: 0.5 }
  }
  return UNKNOWN
}
