// Streaming download source for the OPFS byte cache. The HostBridge HTTP client is buffered (it has no
// `ReadableStream`), so a connector that can stream exposes a neutral `downloadDescriptor`
// ({ url, headers, allowedOrigins }) and the actual streamed `fetch` runs HERE — `platform/web` is the only
// layer allowed to touch `fetch`. Book bytes bypass the Service Worker regardless (ADR-005): this is a
// direct cross-origin/Range fetch the SW denylists, never a shell request. A connector without a descriptor
// (the in-memory fixture) falls back to its buffered `content()` wrapped as a one-chunk stream.
//
// Credential isolation: the descriptor `url` is taken from the SERVER's manifest (untrusted), while
// `headers` may carry the user's credentials (e.g. Komga Basic auth). This `fetch` runs OUTSIDE the
// HostBridge, so it re-enforces the SAME declared-network origin allowlist `bridge.http` does — refusing to
// send credentials to an origin the connector did not vouch for (the ch7 credential-isolation precedent).

import type { Connector, PluginPermissions } from '@/core/contracts'
import type { BookRef } from '@/core/model'
import { originAllowed } from './origin-allowlist'

/** A neutral, authenticated descriptor for streaming a book file (the connector owns URL + auth). */
export interface DownloadDescriptor {
  url: string
  headers: Record<string, string>
  /**
   * The origins this credentialed download may target — the connector's configured base origin (and any
   * origin it declared in `permissions.network`). The download is REJECTED before `fetch` when the resolved
   * `url`'s origin is not allowed, so a server-supplied acquisition href cannot carry the credentials in
   * `headers` to a foreign origin.
   */
  allowedOrigins: PluginPermissions['network']
}

/** Optional connector extension: a neutral, authenticated descriptor for streaming the book file. */
export interface StreamingConnector {
  downloadDescriptor(ref: BookRef): Promise<DownloadDescriptor>
}

function canStream(connector: Connector): connector is Connector & StreamingConnector {
  return typeof (connector as Partial<StreamingConnector>).downloadDescriptor === 'function'
}

/**
 * A `ReadableStream` of the book's bytes for {@link import('./opfs-book-cache').OpfsBookCache.downloadToOpfs}.
 * Prefers a true streamed `fetch` (flat memory for large books); falls back to a buffered single chunk for
 * connectors that cannot stream.
 */
export async function connectorDownloadStream(
  connector: Connector,
  ref: BookRef,
): Promise<ReadableStream<Uint8Array>> {
  if (canStream(connector)) {
    const { url, headers, allowedOrigins } = await connector.downloadDescriptor(ref)
    // Origin gate (root-cause credential isolation): never attach the connector's credentials to an origin
    // outside its declared allowlist. The `url` is server-controlled, so a malicious/compromised manifest
    // cannot redirect the reader's `Authorization` header cross-origin — the download is refused outright.
    if (!originAllowed(url, allowedOrigins)) {
      throw new Error(
        `Refusing to download "${ref.title || ref.bookId}": "${url}" is outside the connector's ` +
          `allowed origins — a credentialed download must not cross to a foreign origin.`,
      )
    }
    // `redirect: 'error'` is defense-in-depth: a 3xx to another origin must not transparently follow and
    // re-send the credentials (the post-redirect origin was never validated by the gate above).
    const response = await fetch(url, { headers, redirect: 'error' })
    if (!response.ok || !response.body) {
      throw new Error(`Download failed for "${ref.title || ref.bookId}" (HTTP ${response.status}).`)
    }
    return response.body
  }
  // Fallback: wrap the connector's buffered bytes (the fixture demo source has no server to stream from).
  const bytes = await connector.content(ref)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}
