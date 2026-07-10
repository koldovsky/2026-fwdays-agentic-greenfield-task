// Generic OPDS fallback connector — the always-available bundled claimant for any OPDS feed no
// specialized connector recognizes. This change (add-source-flow) adds only the DETECTION surface it
// needs to be the prober's fallback: a lightweight `opdsProbe`, an honest capability declaration, and
// a config-bearing instance so a bare OPDS feed can be connected. Real acquisition-feed browsing
// (parsing entries into LibraryBrowseEntry[]) is owned by add-extensions-and-capability-install
// (change 10); progressSync=false → a local-only / no-op strategy, so the app still works offline.

import type {
  Connector,
  ConnectorCapabilities,
  HostBridge,
  ProgressSyncStrategy,
} from '@/core/contracts'
import type { ConnectorProbeResult } from '@/core/dispatch'
import type { BookMeta, BookRef, ByteRange, LibraryBrowseEntry, Locator } from '@/core/model'
import { type OpdsShelf, type ParsedOpdsFeed, parseOpdsFeed } from '@/plugins/connectors/_opds-core'
import { originAllowed } from '@/platform/web/origin-allowlist'

export const OPDS_CONNECTOR_ID = 'connector.opds'
const OPDS_KIND = 'opds'

/** Least-specialized claimant: any OPDS feed has it as a fallback, so it must rank BELOW a specialized
 *  connector (Komga) that also speaks OPDS when both claim a URL. */
export const OPDS_PROBE_SPECIFICITY = 1

/** What a generic OPDS feed advertises — honestly fewer than a Komga server (no page streaming; no
 *  progress sync unless OPDS v2 progression is present, which the generic fallback does not assume). */
export const OPDS_CAPABILITIES: ConnectorCapabilities = {
  protocols: ['opds1', 'opds2'],
  auth: ['none', 'basic'],
  progressSync: false,
  search: true,
  download: true,
  pagedStreaming: false,
  thumbnails: true,
}

/** Content-type fragments that mark an OPDS catalog/feed response (OPDS 1.x Atom + OPDS 2.0 JSON). */
const OPDS_CONTENT_HINTS = ['atom+xml', 'opds+json', 'opds-catalog', 'opds-publication']

function headerValue(headers: Record<string, string>, name: string): string {
  return (headers[name] ?? headers[name.toLowerCase()] ?? '').toLowerCase()
}

/**
 * Identify an OPDS feed at an arbitrary url by its advertised content type. Lets a transport failure
 * REJECT (so the prober tells unreachable from unsupported) and returns `null` when the server
 * responded but does not serve OPDS. All I/O goes through the HostBridge — no direct fetch/DOM.
 */
export async function opdsProbe(
  url: string,
  host: HostBridge,
): Promise<ConnectorProbeResult | null> {
  const response = await host.http.send({
    url,
    method: 'GET',
    headers: { Accept: 'application/opds+json, application/atom+xml' },
  })
  if (response.status >= 400) return null
  const contentType = headerValue(response.headers, 'Content-Type')
  if (!OPDS_CONTENT_HINTS.some((hint) => contentType.includes(hint))) return null
  return {
    connectorId: OPDS_CONNECTOR_ID,
    kind: OPDS_KIND,
    confidence: 0.6,
    specificity: OPDS_PROBE_SPECIFICITY,
    capabilities: OPDS_CAPABILITIES,
  }
}

/** Connection settings for a per-source OPDS feed. */
export interface OpdsConfig {
  baseUrl: string
  /** Source id stamped onto browse entries / book refs; defaults to the connector id. */
  sourceId?: string
  /**
   * Whether the connected server advertises OPDS v2 reading progression. Set by the connect flow from
   * the probed feed; gates `progressSync` honestly (DESIGN §10). Defaults to `false` (local-only).
   */
  progression?: boolean
  /** Basic-auth username for a protected feed (e.g. Komga's OPDS, which requires authentication). */
  username?: string
  /** Basic-auth password paired with {@link OpdsConfig.username}. */
  password?: string
}

const localOnlyStrategy: ProgressSyncStrategy = {
  async getProgress(): Promise<Locator | undefined> {
    return undefined
  },
  async setProgress(): Promise<void> {},
}

export class OpdsConnector implements Connector {
  readonly id = OPDS_CONNECTOR_ID
  readonly progressSync: boolean
  readonly capabilities: ConnectorCapabilities

  readonly #base: string
  readonly #sourceId: string
  readonly #progression: boolean
  readonly #authHeader: string | undefined

  constructor(
    config: OpdsConfig = { baseUrl: '' },
    private readonly bridge?: HostBridge,
  ) {
    this.#base = config.baseUrl.replace(/\/+$/, '')
    this.#sourceId = config.sourceId ?? OPDS_CONNECTOR_ID
    this.#progression = config.progression ?? false
    this.#authHeader = config.username
      ? `Basic ${btoa(`${config.username}:${config.password ?? ''}`)}`
      : undefined
    // Declare progress honestly per server: a Calibre-style feed with no progression stays local-only.
    this.progressSync = this.#progression
    this.capabilities = { ...OPDS_CAPABILITIES, progressSync: this.#progression }
  }

  /** Headers every feed/byte request carries — basic auth when the source supplied credentials. */
  #requestHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return this.#authHeader ? { ...extra, Authorization: this.#authHeader } : extra
  }

  /** Detect whether this connector's configured base is an OPDS feed — WITH the source's credentials
   *  (unlike the credential-free detection-layer {@link opdsProbe}, a protected feed needs auth). */
  async probe(): Promise<boolean> {
    if (!this.bridge || this.#base === '') return false
    try {
      const response = await this.bridge.http.send({
        url: this.#base,
        method: 'GET',
        headers: this.#requestHeaders({ Accept: 'application/opds+json, application/atom+xml' }),
      })
      if (response.status >= 400) return false
      const contentType = headerValue(response.headers, 'Content-Type')
      return OPDS_CONTENT_HINTS.some((hint) => contentType.includes(hint))
    } catch {
      return false
    }
  }

  /** Browse the configured feed: map its acquisition entries to library cards (media type from each
   *  entry's acquisition `<link type>`), parsed through the shared `_opds-core`. */
  async browse(): Promise<LibraryBrowseEntry[]> {
    const feed = await this.#fetchFeed(this.#base)
    if (!feed) return []
    return feed.books.map((entry) => ({
      ...entry.ref,
      sourceLabel: 'opds',
      ...(entry.author ? { author: entry.author } : {}),
    }))
  }

  /** Map the configured feed's navigation entries to shelves the user can browse into. */
  async listShelves(): Promise<OpdsShelf[]> {
    const feed = await this.#fetchFeed(this.#base)
    return feed?.shelves ?? []
  }

  async getBook(ref: BookRef): Promise<BookMeta> {
    // Return the minimal BookMeta every connector can honestly provide — OPDS feeds carry only catalog
    // metadata, never an opened-book parse (mirrors the fixture's unknown-book fallback).
    return { title: ref.title, authors: [] }
  }

  /** Resolve a book's acquisition link and return its bytes for the offline-storage layer (OPFS).
   *  Goes through the HostBridge (never `fetch`/the SW) — book bytes bypass Workbox (ADR-005). */
  async content(ref: BookRef, range?: ByteRange): Promise<Uint8Array> {
    if (!this.bridge) return new Uint8Array()
    const href = await this.#resolveDownloadHref(ref)
    if (!href) throw new Error(`No acquisition link found for "${ref.bookId}".`)
    const url = this.#absolute(href)
    // Credential-isolation gate: the acquisition `href` is server-supplied (untrusted), so refuse to send
    // the source's `Authorization` header to any origin outside the configured base BEFORE the request.
    this.#assertAllowedOrigin(url, ref)
    const headers = this.#requestHeaders(
      range ? { Range: `bytes=${range.start}-${range.end ?? ''}` } : {},
    )
    const response = await this.bridge.http.send({
      url,
      method: 'GET',
      headers,
    })
    if (response.status >= 400) {
      throw new Error(`OPDS download failed (${response.status}) for "${ref.bookId}".`)
    }
    return response.bytes()
  }

  /**
   * A neutral, authenticated descriptor for STREAMING the book file to OPFS — parity with Komga, so the
   * `platform/web` download path streams large books with flat memory. The `url` is the server-supplied
   * acquisition href (untrusted), so `allowedOrigins` pins it to the connector's base origin: the streamed
   * `fetch` (which runs OUTSIDE the HostBridge) re-enforces the SAME origin gate and refuses to send the
   * source's credentials anywhere else. Book bytes bypass the Service Worker regardless (ADR-005).
   */
  async downloadDescriptor(
    ref: BookRef,
  ): Promise<{ url: string; headers: Record<string, string>; allowedOrigins: readonly string[] }> {
    const href = await this.#resolveDownloadHref(ref)
    if (!href) throw new Error(`No acquisition link found for "${ref.bookId}".`)
    return {
      url: this.#absolute(href),
      headers: this.#requestHeaders(),
      allowedOrigins: this.#allowedOrigins(),
    }
  }

  progressStrategy(): ProgressSyncStrategy {
    // OPDS v2 progression read/write is the sync engine's scheduled concern (add-offline-and-sync); this
    // connector's load-bearing job is the HONEST `progressSync` declaration above. A server without
    // progression stays strictly local-only.
    return localOnlyStrategy
  }

  async #fetchFeed(url: string): Promise<ParsedOpdsFeed | null> {
    if (!this.bridge || url === '') return null
    const response = await this.bridge.http.send({
      url,
      method: 'GET',
      headers: this.#requestHeaders({ Accept: 'application/opds+json, application/atom+xml' }),
    })
    if (response.status >= 400) return null
    const contentType = headerValue(response.headers, 'Content-Type')
    const body = await response.text()
    const isJson = contentType.includes('json')
    return parseOpdsFeed(body, isJson, this.#sourceId)
  }

  async #resolveDownloadHref(ref: BookRef): Promise<string | undefined> {
    const feed = await this.#fetchFeed(this.#base)
    return feed?.books.find((entry) => entry.ref.bookId === ref.bookId)?.downloadHref
  }

  #absolute(href: string): string {
    if (/^https?:\/\//i.test(href)) return href
    try {
      return new URL(href, `${this.#base}/`).toString()
    } catch {
      return href
    }
  }

  /** The single origin a credentialed OPDS request may target: the connector's configured base origin.
   *  Fail closed — an empty/unparseable base yields an EMPTY allowlist, which denies every origin. */
  #allowedOrigins(): readonly string[] {
    try {
      return [new URL(this.#base).origin]
    } catch {
      return []
    }
  }

  /** Refuse to send the source's credentials to any origin outside its base. `#absolute` passes absolute
   *  and protocol-relative (`//host`) hrefs through verbatim, so a malicious / MITM'd / multi-tenant feed
   *  could otherwise point an acquisition link at `attacker.tld` and harvest the catalog's `Authorization`
   *  header (the ch7/ch9 credential-isolation class, here in OPDS). Reuses the shared `originAllowed`. */
  #assertAllowedOrigin(url: string, ref: BookRef): void {
    if (!originAllowed(url, this.#allowedOrigins())) {
      throw new Error(
        `Refusing to download "${ref.title || ref.bookId}": "${url}" is outside the OPDS source's ` +
          `allowed origins — a credentialed download must not cross to a foreign origin.`,
      )
    }
  }
}

/** Factory the add-source connect flow uses to build a configured OPDS connector over a bridge. */
export function createOpdsConnector(config: OpdsConfig, bridge: HostBridge): OpdsConnector {
  return new OpdsConnector(config, bridge)
}

export default OpdsConnector
