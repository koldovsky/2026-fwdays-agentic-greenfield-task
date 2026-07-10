import { describe, expect, it } from 'vitest'
import type { HostBridge, HttpClient, HttpRequest, KeyValueStore, Logger } from '@/core/contracts'
import { MEDIA_TYPE_CBZ, MEDIA_TYPE_EPUB } from '@/core/model'
import { parseLocator, serializeLocator } from '@/core/model/serialization'
import { KomgaAuthError, KomgaConnector, createKomgaConnector } from '.'

const CONFIG = {
  baseUrl: 'http://localhost:25600',
  email: 'reader@edda.test',
  password: 'edda-reader-pw',
}

const PENSEES = {
  id: 'book-pensees',
  name: 'blaise-pascal_pensees',
  created: '2026-06-28T22:07:17Z',
  seriesId: 'series-1',
  libraryId: 'lib-1',
  media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB, pagesCount: 433 },
  metadata: { title: 'Pensées', authors: [{ name: 'Blaise Pascal', role: 'writer' }] },
}

interface Route {
  status?: number
  json?: unknown
  bytes?: Uint8Array
}

const stubStorage: KeyValueStore = {
  async get() {
    return undefined
  },
  async set() {},
  async delete() {},
}
const stubLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} }

function springPage(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 200, last: true }
}

function makeBridge(route: (req: HttpRequest) => Route): {
  bridge: HostBridge
  requests: HttpRequest[]
} {
  const requests: HttpRequest[] = []
  const http: HttpClient = {
    async send(request) {
      requests.push(request)
      const result = route(request)
      const status = result.status ?? 200
      const text = result.json !== undefined ? JSON.stringify(result.json) : ''
      const bytes = result.bytes ?? new TextEncoder().encode(text)
      return { status, headers: {}, bytes: async () => bytes, text: async () => text }
    },
  }
  return { bridge: { http, storage: stubStorage, logger: stubLogger }, requests }
}

function connectorWith(route: (req: HttpRequest) => Route): {
  connector: KomgaConnector
  requests: HttpRequest[]
} {
  const { bridge, requests } = makeBridge(route)
  return { connector: createKomgaConnector(CONFIG, bridge), requests }
}

describe('KomgaConnector — identity & capabilities', () => {
  it('is an async, identifiable Connector that declares Komga capabilities honestly', async () => {
    const { connector } = connectorWith((req) =>
      req.url.includes('/api/v1/books') ? { json: springPage([]) } : { json: {} },
    )
    expect(connector.id).toBe('connector.komga')
    expect(connector.progressSync).toBe(true)
    expect(connector.capabilities).toEqual({
      // Komga serves OPDS v2 feeds AND its native REST API — it advertises both (add-source-flow
      // derives the "OPDS v2" chip + "opds v2 + rest" summary from this; see doc/web/05).
      protocols: ['opds2', 'komga-rest'],
      auth: ['basic'],
      progressSync: true,
      search: true,
      download: true,
      pagedStreaming: true,
      thumbnails: true,
    })
    const browsing = connector.browse()
    expect(browsing).toBeInstanceOf(Promise)
    await expect(browsing).resolves.toEqual([])
  })
})

// Comics/CBZ (and any non-EPUB) use Komga's page-based read-progress, where a `{page}` write is valid.
describe('KomgaProgressStrategy — page-based read-progress (comics) ↔ Locator', () => {
  const ref = {
    sourceId: 'connector.komga',
    bookId: 'book-1',
    mediaType: MEDIA_TYPE_CBZ,
    title: 'Vol. 1',
  }

  it('getProgress maps a completed book to totalProgression 1', async () => {
    const { connector } = connectorWith(() => ({
      json: {
        media: { pagesCount: 433 },
        readProgress: { page: 433, completed: true, lastModified: '2026-06-29T10:00:00Z' },
      },
    }))
    const locator = await connector.progressStrategy().getProgress(ref)
    expect(locator?.locations?.totalProgression).toBe(1)
    expect(locator?.locations?.position).toBe(433)
    expect(locator?.lastReadAt).toBe('2026-06-29T10:00:00Z')
    expect(locator?.href).toBe('book-1')
    expect(locator?.type).toBe(MEDIA_TYPE_CBZ)
  })

  it('getProgress maps a mid-book page to a fraction of pagesCount', async () => {
    const { connector } = connectorWith(() => ({
      json: { media: { pagesCount: 200 }, readProgress: { page: 50, completed: false } },
    }))
    const locator = await connector.progressStrategy().getProgress(ref)
    expect(locator?.locations?.totalProgression).toBeCloseTo(0.25)
    expect(locator?.locations?.position).toBe(50)
  })

  it('getProgress returns undefined when the book has no read-progress (not started)', async () => {
    const { connector } = connectorWith(() => ({
      json: { media: { pagesCount: 200 }, readProgress: null },
    }))
    expect(await connector.progressStrategy().getProgress(ref)).toBeUndefined()
  })

  it('the mapped Locator round-trips losslessly through serialization (native-reuse guarantee)', async () => {
    const { connector } = connectorWith(() => ({
      json: {
        media: { pagesCount: 433 },
        readProgress: { page: 217, completed: false, lastModified: '2026-06-29T10:00:00Z' },
      },
    }))
    const locator = await connector.progressStrategy().getProgress(ref)
    expect(locator).toBeDefined()
    expect(parseLocator(serializeLocator(locator!))).toEqual(locator)
  })

  it('setProgress writes a page-based PATCH and removes nothing on success (204)', async () => {
    const { connector, requests } = connectorWith((req) =>
      req.method === 'PATCH' ? { status: 204 } : { json: {} },
    )
    await connector.progressStrategy().setProgress(ref, {
      href: 'book-1',
      type: MEDIA_TYPE_CBZ,
      locations: { position: 88, totalProgression: 0.2 },
    })
    const patch = requests.find((r) => r.method === 'PATCH')
    expect(patch?.url).toContain('/api/v1/books/book-1/read-progress')
    expect(JSON.parse(patch?.body as string)).toEqual({ page: 88, completed: false })
  })

  it('falls back to a completed-only PATCH when Komga rejects the page write with 400 (non-Divina)', async () => {
    const patchBodies: unknown[] = []
    const { connector } = connectorWith((req) => {
      if (req.method !== 'PATCH') return { json: {} }
      const body = JSON.parse(req.body as string) as { page?: number }
      patchBodies.push(body)
      // A page write rejected with 400 (Komga edge case) falls back to a completed-only retry.
      return body.page !== undefined ? { status: 400 } : { status: 204 }
    })
    await connector.progressStrategy().setProgress(ref, {
      href: 'book-1',
      type: MEDIA_TYPE_CBZ,
      locations: { position: 88, totalProgression: 1 },
    })
    expect(patchBodies).toEqual([
      { page: 88, completed: true }, // first attempt (rejected 400)
      { completed: true }, // completed-only retry (accepted)
    ])
  })

  it('throws when the completed-only retry also fails', async () => {
    const { connector } = connectorWith((req) =>
      req.method === 'PATCH' ? { status: 500 } : { json: {} },
    )
    await expect(
      connector.progressStrategy().setProgress(ref, {
        href: 'book-1',
        type: MEDIA_TYPE_CBZ,
        locations: { position: 88, totalProgression: 1 },
      }),
    ).rejects.toThrow()
  })
})

// EPUB progress uses Komga's locator-based Readium R2 progression endpoint (GET/PUT …/progression), which
// persists a mid-book CFI + total-progression — the fix for "every EPUB reopens at page 1".
describe('KomgaProgressStrategy — EPUB Readium R2 progression ↔ Locator', () => {
  const ref = {
    sourceId: 'connector.komga',
    bookId: 'book-1',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Pensées',
  }

  it('getProgress reads /progression and maps the R2 locator (CFI, total-progression, device)', async () => {
    const { connector, requests } = connectorWith(() => ({
      json: {
        device: { id: 'other-device', name: 'Phone' },
        modified: '2026-06-29T10:00:00Z',
        locator: {
          href: 'OEBPS/ch1.xhtml',
          type: MEDIA_TYPE_EPUB,
          locations: { fragments: ['epubcfi(/6/4!/4/2)'], position: 12, totalProgression: 0.42 },
        },
      },
    }))
    const locator = await connector.progressStrategy().getProgress(ref)
    expect(requests[0]?.url).toContain('/api/v1/books/book-1/progression')
    expect(requests[0]?.method).toBe('GET')
    expect(locator?.locations?.cfi).toBe('epubcfi(/6/4!/4/2)')
    expect(locator?.locations?.totalProgression).toBeCloseTo(0.42)
    expect(locator?.locations?.position).toBe(12)
    expect(locator?.lastReadAt).toBe('2026-06-29T10:00:00Z')
    expect(locator?.lastReadDevice).toBe('Phone')
  })

  it('getProgress returns undefined when the EPUB has no server progression (204)', async () => {
    const { connector } = connectorWith(() => ({ status: 204 }))
    expect(await connector.progressStrategy().getProgress(ref)).toBeUndefined()
  })

  // Komga validates a progression PUT against its precomputed positions list, so a write snaps the
  // reader's total-progression to the nearest real entry and submits THAT verbatim (an arbitrary
  // (href, progression) is rejected with 400 "Invalid progression").
  const POSITIONS = [
    {
      href: 'ch1.html',
      type: 'application/xhtml+xml',
      locations: { progression: 0, position: 1, totalProgression: 0 },
      koboSpan: 'kobo.1.1',
    },
    {
      href: 'ch5.html',
      type: 'application/xhtml+xml',
      locations: { progression: 0.1, position: 50, totalProgression: 0.5 },
      koboSpan: 'kobo.5.1',
    },
    {
      href: 'ch9.html',
      type: 'application/xhtml+xml',
      locations: { progression: 0.2, position: 99, totalProgression: 0.9 },
      koboSpan: 'kobo.9.1',
    },
  ]

  it('setProgress snaps the reader position to the nearest /positions entry and PUTs it verbatim', async () => {
    const { connector, requests } = connectorWith((req) => {
      if (req.url.includes('/positions')) return { json: { total: 99, positions: POSITIONS } }
      if (req.method === 'PUT') return { status: 204 }
      return { json: {} }
    })
    await connector.progressStrategy().setProgress(ref, {
      href: 'whatever',
      type: MEDIA_TYPE_EPUB,
      locations: { totalProgression: 0.6 }, // between the 0.5 and 0.9 entries
      lastReadAt: '2026-06-29T10:00:00Z',
    })
    const put = requests.find((r) => r.method === 'PUT')
    expect(put?.url).toContain('/api/v1/books/book-1/progression')
    const body = JSON.parse(put?.body as string)
    // 0.6 snaps DOWN to the 0.5 entry (the furthest position not beyond the reader) — verbatim, koboSpan and all.
    expect(body.locator).toEqual(POSITIONS[1])
    expect(body.modified).toBe('2026-06-29T10:00:00Z')
    expect(body.device).toEqual({ id: 'edda-web', name: 'Edda (Web)' })
  })

  it('setProgress completed snaps to the final position entry', async () => {
    const { connector, requests } = connectorWith((req) => {
      if (req.url.includes('/positions')) return { json: { total: 99, positions: POSITIONS } }
      if (req.method === 'PUT') return { status: 204 }
      return { json: {} }
    })
    await connector.progressStrategy().setProgress(ref, {
      href: 'x',
      type: MEDIA_TYPE_EPUB,
      locations: { totalProgression: 1 },
    })
    const body = JSON.parse(requests.find((r) => r.method === 'PUT')?.body as string)
    expect(body.locator).toEqual(POSITIONS[2]) // the 0.9 entry is the furthest ≤ 1
  })

  it('falls back to the page-based completed flag when the book has no positions list', async () => {
    const patched: unknown[] = []
    const { connector } = connectorWith((req) => {
      if (req.url.includes('/positions')) return { status: 404 }
      if (req.method === 'PATCH') {
        patched.push(JSON.parse(req.body as string))
        return { status: 204 }
      }
      return { json: {} }
    })
    await connector.progressStrategy().setProgress(ref, {
      href: 'x',
      type: MEDIA_TYPE_EPUB,
      locations: { totalProgression: 1 },
    })
    expect(patched).toEqual([{ completed: true }]) // page-based completed fallback
  })

  it('the R2-mapped Locator round-trips losslessly through serialization (native-reuse guarantee)', async () => {
    const { connector } = connectorWith(() => ({
      json: {
        device: { id: 'edda-web', name: 'Edda (Web)' },
        modified: '2026-06-29T10:00:00Z',
        locator: {
          href: 'OEBPS/ch1.xhtml',
          type: MEDIA_TYPE_EPUB,
          locations: { fragments: ['epubcfi(/6/4!/4/2)'], totalProgression: 0.42 },
        },
      },
    }))
    const locator = await connector.progressStrategy().getProgress(ref)
    expect(locator).toBeDefined()
    expect(parseLocator(serializeLocator(locator!))).toEqual(locator)
  })
})

describe('KomgaConnector — probe', () => {
  it('identifies a Komga server from the claim shape, unauthenticated', async () => {
    const { connector, requests } = connectorWith((req) =>
      req.url.includes('/api/v1/claim') ? { json: { isClaimed: true } } : { status: 404 },
    )
    expect(await connector.probe()).toBe(true)
    expect(requests[0]?.headers?.Authorization).toBeUndefined() // no credentials sent
  })

  it('does not identify a non-Komga response, and maps errors to false', async () => {
    expect(await connectorWith(() => ({ json: { hello: 'world' } })).connector.probe()).toBe(false)
    expect(await connectorWith(() => ({ status: 500 })).connector.probe()).toBe(false)
  })
})

describe('KomgaConnector — auth', () => {
  it('sends HTTP Basic credentials on authed requests', async () => {
    const { connector, requests } = connectorWith(() => ({
      json: { id: 'u', email: CONFIG.email, roles: [] },
    }))
    await connector.verifyAuth()
    const expected = `Basic ${btoa(`${CONFIG.email}:${CONFIG.password}`)}`
    expect(requests[0]?.headers?.Authorization).toBe(expected)
  })

  it('maps a 401 to a clear KomgaAuthError', async () => {
    const { connector } = connectorWith(() => ({ status: 401 }))
    await expect(connector.verifyAuth()).rejects.toBeInstanceOf(KomgaAuthError)
  })
})

describe('KomgaConnector — browse mapping', () => {
  it('maps Komga books to LibraryBrowseEntry with komga-shaped fields', async () => {
    const { connector } = connectorWith(() => ({ json: springPage([PENSEES]) }))
    const entries = await connector.browse()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual({
      sourceId: 'connector.komga',
      bookId: 'book-pensees',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pensées',
      author: 'Blaise Pascal',
      thumbnailHref: 'http://localhost:25600/api/v1/books/book-pensees/thumbnail',
      sourceLabel: 'komga',
      addedAt: '2026-06-28T22:07:17Z',
    })
  })

  it('produces pure, JSON-serializable entries (no functions/Dates)', async () => {
    const { connector } = connectorWith(() => ({ json: springPage([PENSEES]) }))
    const entries = await connector.browse()
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries)
  })

  it('search and listBooks return paged domain refs', async () => {
    const { connector, requests } = connectorWith(() => ({ json: springPage([PENSEES]) }))
    const page = await connector.search('Pens')
    expect(page.totalElements).toBe(1)
    expect(page.items[0]).toEqual({
      sourceId: 'connector.komga',
      bookId: 'book-pensees',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pensées',
    })
    expect(requests.at(-1)?.url).toContain('search=Pens')
  })
})

describe('KomgaConnector — content & range', () => {
  const FILE = new Uint8Array(Array.from({ length: 100 }, (_, i) => i))

  it('returns full bytes for a whole download', async () => {
    const { connector } = connectorWith(() => ({ status: 200, bytes: FILE }))
    const bytes = await connector.download('book-pensees')
    expect(bytes).toHaveLength(100)
  })

  it('honours a requested range client-side when the server returns 200 full', async () => {
    const { connector, requests } = connectorWith(() => ({ status: 200, bytes: FILE }))
    const slice = await connector.content(
      { sourceId: 's', bookId: 'book-pensees', mediaType: MEDIA_TYPE_EPUB, title: 't' },
      { start: 0, end: 9 },
    )
    expect(slice).toHaveLength(10)
    expect(slice).toEqual(FILE.slice(0, 10))
    expect(requests[0]?.headers?.Range).toBe('bytes=0-9') // still sent for 206-capable servers
  })

  it('passes a 206 partial response through unchanged', async () => {
    const { connector } = connectorWith(() => ({ status: 206, bytes: FILE.slice(0, 10) }))
    const slice = await connector.download('book-pensees', { start: 0, end: 9 })
    expect(slice).toHaveLength(10)
  })

  it('requests the PSE page endpoint for a given page number', async () => {
    const { connector, requests } = connectorWith(() => ({ bytes: new Uint8Array([1]) }))
    await connector.page('book-pensees', 7)
    expect(requests[0]?.url).toBe('http://localhost:25600/api/v1/books/book-pensees/pages/7')
  })
})

describe('KomgaConnector — coverBytes (authed cover for the host to blob-URL)', () => {
  it('fetches the /thumbnail endpoint WITH Basic auth and returns the bytes', async () => {
    const IMG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) // JPEG magic bytes
    const { connector, requests } = connectorWith(() => ({ status: 200, bytes: IMG }))

    const bytes = await connector.coverBytes({
      sourceId: 'connector.komga',
      bookId: 'book-pensees',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pensées',
    })

    expect(bytes).toEqual(IMG)
    expect(requests[0]?.url).toBe('http://localhost:25600/api/v1/books/book-pensees/thumbnail')
    // The whole point of the contract method: the connector carries auth, so the host renders a blob
    // URL instead of a bare cross-origin <img> that would 401 and pop the browser's credential dialog.
    expect(requests[0]?.headers?.Authorization).toBe(
      `Basic ${btoa(`${CONFIG.email}:${CONFIG.password}`)}`,
    )
  })
})

describe('KomgaConnector — composes _opds-core', () => {
  it('resolves a download href from the Readium manifest links via _opds-core', async () => {
    const { connector } = connectorWith((req) =>
      req.url.includes('/manifest')
        ? {
            json: {
              links: [
                { href: '/cover.jpg', rel: 'http://opds-spec.org/image', type: 'image/jpeg' },
                {
                  href: 'http://localhost:25600/api/v1/books/book-pensees/file',
                  rel: 'http://opds-spec.org/acquisition',
                  type: MEDIA_TYPE_CBZ,
                },
              ],
            },
          }
        : { status: 404 },
    )
    const href = await connector.resolveDownloadHref('book-pensees')
    expect(href).toBe('http://localhost:25600/api/v1/books/book-pensees/file')
  })

  it('falls back to the native REST file endpoint when the manifest has no acquisition link', async () => {
    const { connector } = connectorWith(() => ({ json: { links: [] } }))
    expect(await connector.resolveDownloadHref('book-pensees')).toBe(
      'http://localhost:25600/api/v1/books/book-pensees/file',
    )
  })
})
