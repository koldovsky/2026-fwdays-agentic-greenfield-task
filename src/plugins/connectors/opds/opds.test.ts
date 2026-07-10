import { describe, expect, it, vi } from 'vitest'
import type { HostBridge, KeyValueStore, Logger } from '@/core/contracts'
import { connectorDownloadStream } from '@/platform/web/connector-download'
import { OPDS_CAPABILITIES, OpdsConnector, createOpdsConnector, opdsProbe } from '.'

const stubStorage: KeyValueStore = {
  async get() {
    return undefined
  },
  async set() {},
  async delete() {},
}
const stubLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} }

function host(
  reply: { status?: number; headers?: Record<string, string> } | { throws: true },
): HostBridge {
  return {
    http: {
      async send() {
        if ('throws' in reply) throw new Error('ECONNREFUSED')
        return {
          status: reply.status ?? 200,
          headers: reply.headers ?? {},
          async bytes() {
            return new Uint8Array()
          },
          async text() {
            return ''
          },
        }
      },
    },
    storage: stubStorage,
    logger: stubLogger,
  }
}

describe('opdsProbe', () => {
  it('claims a feed advertising an OPDS 2.0 (JSON) content type', async () => {
    const result = await opdsProbe(
      'https://feed.example/opds',
      host({ headers: { 'content-type': 'application/opds+json' } }),
    )
    expect(result).toEqual({
      connectorId: 'connector.opds',
      kind: 'opds',
      confidence: 0.6,
      specificity: 1,
      capabilities: OPDS_CAPABILITIES,
    })
  })

  it('claims a feed advertising the OPDS 1.x Atom catalog content type', async () => {
    const result = await opdsProbe(
      'https://feed.example/opds',
      host({
        headers: { 'Content-Type': 'application/atom+xml;profile=opds-catalog;kind=acquisition' },
      }),
    )
    expect(result?.kind).toBe('opds')
  })

  it('returns null when the server responded but is not OPDS (reached, not mine)', async () => {
    expect(
      await opdsProbe('https://site.example', host({ headers: { 'content-type': 'text/html' } })),
    ).toBeNull()
    expect(await opdsProbe('https://site.example', host({ status: 404 }))).toBeNull()
  })

  it('lets a transport failure REJECT (so the prober can distinguish unreachable)', async () => {
    await expect(opdsProbe('https://down.example', host({ throws: true }))).rejects.toThrow()
  })
})

describe('createOpdsConnector', () => {
  it('builds a no-progress-sync OPDS connector advertising the generic OPDS capabilities', () => {
    const connector = createOpdsConnector(
      { baseUrl: 'https://feed.example/opds', sourceId: 'src-1' },
      host({ headers: {} }),
    )
    expect(connector).toBeInstanceOf(OpdsConnector)
    expect(connector.id).toBe('connector.opds')
    expect(connector.progressSync).toBe(false)
    expect(connector.capabilities).toEqual(OPDS_CAPABILITIES)
  })
})

/** A bridge that serves a feed at the base URL and arbitrary bytes at any other (acquisition) URL. */
function feedHost(
  feed: { body: string; contentType: string },
  files: Record<string, Uint8Array> = {},
): { bridge: HostBridge; requests: string[] } {
  const requests: string[] = []
  const bridge: HostBridge = {
    http: {
      async send(request) {
        requests.push(request.url)
        const fileBytes = files[request.url]
        if (fileBytes) {
          return {
            status: 200,
            headers: { 'Content-Type': 'application/octet-stream' },
            async bytes() {
              return fileBytes
            },
            async text() {
              return ''
            },
          }
        }
        return {
          status: 200,
          headers: { 'Content-Type': feed.contentType },
          async bytes() {
            return new Uint8Array()
          },
          async text() {
            return feed.body
          },
        }
      },
    },
    storage: stubStorage,
    logger: stubLogger,
  }
  return { bridge, requests }
}

const ATOM_ACQUISITION = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Pride and Prejudice</title>
    <id>urn:book:pride</id>
    <author><name>Jane Austen</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/download/pride.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>A Scanned Comic</title>
    <id>urn:book:comic</id>
    <link rel="http://opds-spec.org/acquisition/open-access" href="/download/comic.pdf" type="application/pdf"/>
  </entry>
</feed>`

const ATOM_NAVIGATION = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Fiction</title>
    <id>urn:nav:fiction</id>
    <link rel="subsection" href="/opds/fiction" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  </entry>
</feed>`

const OPDS2_JSON = JSON.stringify({
  metadata: { title: 'Catalog' },
  publications: [
    {
      metadata: {
        title: 'The Picture of Dorian Gray',
        identifier: 'urn:book:dorian',
        author: 'Oscar Wilde',
      },
      links: [
        { rel: 'http://opds-spec.org/acquisition', href: '/d/dorian.pdf', type: 'application/pdf' },
      ],
    },
  ],
  navigation: [{ title: 'Recent', href: '/opds/recent', rel: 'subsection' }],
})

describe('OpdsConnector.browse — typed BookRefs from acquisition feeds (via _opds-core)', () => {
  it('maps an OPDS 1.x Atom acquisition feed to LibraryBrowseEntry[] with media types from the links', async () => {
    const { bridge } = feedHost({ body: ATOM_ACQUISITION, contentType: 'application/atom+xml' })
    const connector = createOpdsConnector(
      { baseUrl: 'https://feed.example/opds', sourceId: 's' },
      bridge,
    )
    const entries = await connector.browse()

    expect(entries).toEqual([
      {
        sourceId: 's',
        bookId: 'urn:book:pride',
        mediaType: 'application/epub+zip',
        title: 'Pride and Prejudice',
        sourceLabel: 'opds',
        author: 'Jane Austen',
      },
      {
        sourceId: 's',
        bookId: 'urn:book:comic',
        mediaType: 'application/pdf',
        title: 'A Scanned Comic',
        sourceLabel: 'opds',
      },
    ])
  })

  it('maps an OPDS 2.0 JSON acquisition feed to typed BookRefs', async () => {
    const { bridge } = feedHost({ body: OPDS2_JSON, contentType: 'application/opds+json' })
    const connector = createOpdsConnector(
      { baseUrl: 'https://feed.example/opds', sourceId: 's' },
      bridge,
    )
    const entries = await connector.browse()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      bookId: 'urn:book:dorian',
      mediaType: 'application/pdf',
      title: 'The Picture of Dorian Gray',
      author: 'Oscar Wilde',
    })
  })

  it('maps a navigation feed to shelves', async () => {
    const { bridge } = feedHost({ body: ATOM_NAVIGATION, contentType: 'application/atom+xml' })
    const connector = createOpdsConnector({ baseUrl: 'https://feed.example/opds' }, bridge)
    expect(await connector.browse()).toEqual([]) // no acquisition entries
    const shelves = await connector.listShelves()
    expect(shelves).toEqual([{ id: 'urn:nav:fiction', title: 'Fiction', href: '/opds/fiction' }])
  })
})

describe('OpdsConnector.content — download for offline (bypasses the SW)', () => {
  it('resolves a book’s acquisition link and returns its bytes', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
    const { bridge, requests } = feedHost(
      { body: OPDS2_JSON, contentType: 'application/opds+json' },
      { 'https://feed.example/d/dorian.pdf': bytes },
    )
    const connector = createOpdsConnector(
      { baseUrl: 'https://feed.example/opds', sourceId: 's' },
      bridge,
    )

    const downloaded = await connector.content({
      sourceId: 's',
      bookId: 'urn:book:dorian',
      mediaType: 'application/pdf',
      title: 'The Picture of Dorian Gray',
    })

    expect([...downloaded]).toEqual([0x25, 0x50, 0x44, 0x46])
    expect(requests).toContain('https://feed.example/d/dorian.pdf')
  })
})

// --- Credential-isolation origin gate (the ch9-H1 class, now in OPDS) -------------------------------
//
// `content()` attaches the source's Basic-auth header and sends to the acquisition href resolved from the
// feed — which is SERVER-supplied. A malicious / MITM'd / multi-tenant feed must not be able to point an
// acquisition link at `attacker.tld` and harvest the catalog credentials. The gate refuses any href whose
// origin is outside the connector's base, on BOTH sinks: the reader/`content()` path AND the modal
// "Not now — download" path (which streams via `connectorDownloadStream` over `downloadDescriptor`).

const OPDS_BASE = 'https://feed.example/opds'
const SECRET_REF = {
  sourceId: 's',
  bookId: 'urn:book:secret',
  mediaType: 'application/epub+zip' as const,
  title: 'Secret',
}
const EXPECTED_AUTH = `Basic ${btoa('reader:pw')}`

/** A bridge serving a one-entry acquisition feed whose book's download link is `href`, recording sends. */
function acquisitionFeedHost(href: string): {
  bridge: HostBridge
  sent: { url: string; headers: Record<string, string> }[]
} {
  const sent: { url: string; headers: Record<string, string> }[] = []
  const body = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Secret</title>
    <id>urn:book:secret</id>
    <link rel="http://opds-spec.org/acquisition" href="${href}" type="application/epub+zip"/>
  </entry>
</feed>`
  const bridge: HostBridge = {
    http: {
      async send(request) {
        sent.push({ url: request.url, headers: request.headers ?? {} })
        const isFeed = request.url === OPDS_BASE
        return {
          status: 200,
          headers: { 'Content-Type': isFeed ? 'application/atom+xml' : 'application/octet-stream' },
          async bytes() {
            return new Uint8Array([1, 2, 3])
          },
          async text() {
            return isFeed ? body : ''
          },
        }
      },
    },
    storage: stubStorage,
    logger: stubLogger,
  }
  return { bridge, sent }
}

/** An OPDS connector over `bridge` carrying Basic-auth credentials scoped to {@link OPDS_BASE}. */
function authedConnector(bridge: HostBridge): OpdsConnector {
  return createOpdsConnector(
    { baseUrl: OPDS_BASE, sourceId: 's', username: 'reader', password: 'pw' },
    bridge,
  )
}

describe('OpdsConnector.content — origin gate (credential isolation)', () => {
  it('same-origin acquisition href → fetched WITH the source credentials', async () => {
    const { bridge, sent } = acquisitionFeedHost('/d/secret.epub')

    const bytes = await authedConnector(bridge).content(SECRET_REF)

    expect([...bytes]).toEqual([1, 2, 3])
    const download = sent.find((s) => s.url === 'https://feed.example/d/secret.epub')
    expect(download).toBeDefined()
    expect(download?.headers.Authorization).toBe(EXPECTED_AUTH)
  })

  it.each([
    ['cross-origin absolute', 'https://attacker.tld/steal.epub'],
    ['protocol-relative', '//attacker.tld/steal.epub'],
  ])('%s acquisition href → REFUSED; credentials never sent', async (_label, href) => {
    const { bridge, sent } = acquisitionFeedHost(href)

    await expect(authedConnector(bridge).content(SECRET_REF)).rejects.toThrow(/allowed origins/i)

    // The attacker URL was NEVER requested (so the Authorization header never reached a foreign origin).
    expect(sent.some((s) => s.url.includes('attacker.tld'))).toBe(false)
  })
})

describe('OPDS modal-download path (connectorDownloadStream) — same origin gate', () => {
  it('same-origin book → streamed fetch carries the source credentials (redirect:"error")', async () => {
    const { bridge } = acquisitionFeedHost('/d/secret.epub')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([9, 9]))
          controller.close()
        },
      }),
    } as unknown as Response)

    const stream = await connectorDownloadStream(authedConnector(bridge), SECRET_REF)

    expect(stream).toBeInstanceOf(ReadableStream)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://feed.example/d/secret.epub',
      expect.objectContaining({
        redirect: 'error',
        headers: expect.objectContaining({ Authorization: EXPECTED_AUTH }),
      }),
    )
    fetchSpy.mockRestore()
  })

  it.each([
    ['cross-origin absolute', 'https://attacker.tld/steal.epub'],
    ['protocol-relative', '//attacker.tld/steal.epub'],
  ])('refuses a %s download BEFORE any fetch (no credential leak)', async (_label, href) => {
    const { bridge } = acquisitionFeedHost(href)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(connectorDownloadStream(authedConnector(bridge), SECRET_REF)).rejects.toThrow(
      /allowed origins/i,
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('OpdsConnector — honest per-server progress capability', () => {
  it('a server WITHOUT progression stays local-only (progressSync false)', () => {
    const connector = createOpdsConnector({ baseUrl: 'https://calibre.example/opds' }, host({}))
    expect(connector.progressSync).toBe(false)
    expect(connector.capabilities.progressSync).toBe(false)
  })

  it('a server advertising OPDS v2 progression reports progressSync true', () => {
    const connector = createOpdsConnector(
      { baseUrl: 'https://feed.example/opds', progression: true },
      host({}),
    )
    expect(connector.progressSync).toBe(true)
    expect(connector.capabilities.progressSync).toBe(true)
  })
})
