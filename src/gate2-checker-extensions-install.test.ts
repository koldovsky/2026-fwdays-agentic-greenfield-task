/**
 * Gate-2 independent verification tests for `add-extensions-and-capability-install` (ch10).
 * Written by the checker (Gate-2 verifier), NOT the implementer — independence is the value.
 * These tests assert the acceptance criteria from a fresh vantage, using minimal helpers.
 */

import { describe, expect, it, vi } from 'vitest'
import { isReactive, markRaw, reactive } from 'vue'
import type { FormatHandler, PluginManifest } from '@/core/contracts'
import { CAPABILITY_MISSING_EVENT, type EddaEvents, SimpleEventBus } from '@/core/event-bus'
import { CapabilityDispatcher, type FormatResolver } from '@/core/dispatch'
import { InMemoryEnabledSetStore, PluginNotDisableableError, PluginRegistry } from '@/core/registry'
import { MEDIA_TYPE_EPUB, MEDIA_TYPE_PDF } from '@/core/model'
import { EPUB_MANIFEST } from '@/plugins/formats/epub/manifest'
import { buildPdf, legacyPdfLoader, recordingSource } from '@/plugins/formats/pdf/test-fixtures'
import { PdfFormatHandler } from '@/plugins/formats/pdf/index'

// ─── (a) Bundled non-disableable ───────────────────────────────────────────

describe('[Gate-2] Registry — bundled plugin cannot be disabled', () => {
  function buildRegistry() {
    const registry = new PluginRegistry({ enabledStore: new InMemoryEnabledSetStore() })
    // Register EPUB as it is in the real app: bundled=true
    const epubHandler: FormatHandler = {
      id: EPUB_MANIFEST.id,
      mediaTypes: [MEDIA_TYPE_EPUB],
      capabilities: { mediaTypes: [MEDIA_TYPE_EPUB] },
      sniff: () => 1,
      async open() {
        return { metadata: { title: 't' }, readingOrder: [] }
      },
    }
    registry.registerFormat({
      manifest: EPUB_MANIFEST,
      loader: async () => epubHandler,
    })
    registry.enable(EPUB_MANIFEST.id) // EPUB starts installed
    return registry
  }

  it('disable() throws PluginNotDisableableError for a bundled plugin', async () => {
    const registry = buildRegistry()
    expect(() => registry.disable('format.epub')).toThrow(PluginNotDisableableError)
    expect(() => registry.disable('format.epub')).toThrow(/bundled and always-on/)
  })

  it('after the failed disable attempt, resolveFormat(EPUB) is still ready', async () => {
    const registry = buildRegistry()
    try {
      registry.disable('format.epub')
    } catch {
      // expected — the reader must not be stranded
    }
    const resolution = await registry.resolveFormat(MEDIA_TYPE_EPUB)
    expect(resolution.status).toBe('ready')
  })

  it('a non-bundled plugin CAN be disabled and resolveFormat flips to installable', async () => {
    const registry = buildRegistry()
    const pdfManifest: PluginManifest = {
      id: 'format.pdf',
      name: 'PDF',
      version: '1.0.3',
      kind: 'format',
      hostApi: '^1.0.0',
      bundled: false, // ← non-bundled
      capabilities: { mediaTypes: [MEDIA_TYPE_PDF] },
    }
    registry.registerFormat({
      manifest: pdfManifest,
      loader: async () => ({}) as FormatHandler,
    })
    registry.enable('format.pdf')
    expect((await registry.resolveFormat(MEDIA_TYPE_PDF)).status).toBe('ready')

    registry.disable('format.pdf') // should not throw

    expect((await registry.resolveFormat(MEDIA_TYPE_PDF)).status).toBe('installable')
  })
})

// ─── (b) Install = lazy import, NOT a network code-fetch ───────────────────

describe('[Gate-2] Registry.install — code loaded via module loader, not fetch', () => {
  it('calling install() never triggers globalThis.fetch (code is a bundled chunk)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch must NOT be called during plugin install — ADR-010')
    })
    try {
      const pdfManifest: PluginManifest = {
        id: 'format.pdf',
        name: 'PDF',
        version: '1.0.3',
        kind: 'format',
        hostApi: '^1.0.0',
        bundled: false,
        capabilities: { mediaTypes: [MEDIA_TYPE_PDF] },
      }
      const mockHandler: FormatHandler = {
        id: 'format.pdf',
        mediaTypes: [MEDIA_TYPE_PDF],
        capabilities: { mediaTypes: [MEDIA_TYPE_PDF] },
        sniff: () => 1,
        async open() {
          return { metadata: { title: 't' }, readingOrder: [] }
        },
      }
      // The loader is a bundled dynamic import stub — no fetch involved
      const registry = new PluginRegistry({ enabledStore: new InMemoryEnabledSetStore() })
      registry.registerFormat({
        manifest: pdfManifest,
        loader: async () => mockHandler, // simulates import('./pdf-handler-chunk')
      })
      await registry.install('format.pdf')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(registry.isEnabled('format.pdf')).toBe(true)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

// ─── (c) PDF ADR-005 — ranged reads via PublicationSource.read, zero fetch ─

describe('[Gate-2] PDF handler — ADR-005 ranged reads', () => {
  it('a large PDF is read by multiple partial ranges (offset > 0), never via fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    try {
      // 1500 page PDF → well above 64 KB (the pdfjs range-chunk threshold)
      const bytes = buildPdf(1500, { title: 'Ulysses', author: 'James Joyce' })
      expect(bytes.length).toBeGreaterThan(64 * 1024)

      const { source, reads } = recordingSource(bytes)
      const handler = new PdfFormatHandler(legacyPdfLoader)
      const publication = await handler.open(source)

      expect(publication.readingOrder).toHaveLength(1500)
      // pdfjs works from the xref at the end of the file first — offset > 0 is guaranteed
      expect(reads.some((r) => r.offset > 0)).toBe(true)
      // No single read covers the full file (ranged, not slurp)
      expect(reads.some((r) => r.length < bytes.length)).toBe(true)
      // Multiple reads, not one bulk load
      expect(reads.length).toBeGreaterThan(1)
      // Never went through the network
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

// ─── (d) PDF markRaw — PDFDocumentProxy stays non-reactive ─────────────────

describe('[Gate-2] PDF navigator — markRaw on PDFDocumentProxy (ADR-001)', () => {
  it('a PDFDocumentProxy wrapped with markRaw() is never made reactive by Vue', async () => {
    const bytes = buildPdf(2)
    const { source } = recordingSource(bytes)
    const handle = await legacyPdfLoader(source)
    try {
      // This is the exact pattern pdf-navigator.ts uses: markRaw(handle.doc)
      const rawDoc = markRaw(handle.doc)
      // Wrapping in reactive must NOT make it reactive — markRaw prevents proxying
      expect(isReactive(reactive({ doc: rawDoc }).doc)).toBe(false)
      expect(isReactive(rawDoc)).toBe(false)
    } finally {
      await handle.destroy()
    }
  })
})

// ─── (e) CapabilityDispatcher — event contract ─────────────────────────────

describe('[Gate-2] CapabilityDispatcher — capability-missing event contract', () => {
  const PDF_MANIFEST_STUB: PluginManifest = {
    id: 'format.pdf',
    name: 'PDF support',
    version: '1.0.3',
    kind: 'format',
    hostApi: '^1.0.0',
    bundled: false,
    capabilities: { mediaTypes: [MEDIA_TYPE_PDF] },
  }

  function makeResolver(): FormatResolver {
    return {
      resolveFormat: vi.fn(async (mediaType) => {
        if (mediaType === MEDIA_TYPE_EPUB) {
          return { status: 'ready' as const, instance: {} as FormatHandler }
        }
        if (mediaType === MEDIA_TYPE_PDF) {
          return { status: 'installable' as const, suggestion: PDF_MANIFEST_STUB }
        }
        return { status: 'unsupported' as const }
      }),
    }
  }

  it('an installable format emits CapabilityMissing with the book ref and suggestion', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const dispatcher = new CapabilityDispatcher(makeResolver(), bus)
    const captured: unknown[] = []
    bus.on(CAPABILITY_MISSING_EVENT, (payload) => captured.push(payload))

    const result = await dispatcher.openBook({
      sourceId: 'connector.komga',
      bookId: 'book-42',
      mediaType: MEDIA_TYPE_PDF,
      title: 'The Trial',
    })

    expect(result.status).toBe('installable')
    expect(captured).toHaveLength(1)
    const payload = captured[0] as { bookRef: unknown; suggestion: PluginManifest }
    expect(payload.suggestion.id).toBe('format.pdf')
    expect((payload.bookRef as { bookId: string }).bookId).toBe('book-42')
  })

  it('an already-installed (ready) format does NOT emit CapabilityMissing', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const dispatcher = new CapabilityDispatcher(makeResolver(), bus)
    const seen = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, seen)

    const result = await dispatcher.openBook({
      sourceId: 'connector.komga',
      bookId: 'book-epub',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Moby Dick',
    })

    expect(result.status).toBe('ready')
    expect(seen).not.toHaveBeenCalled()
  })

  it('an unsupported format (no catalog entry) does NOT emit CapabilityMissing', async () => {
    const bus = new SimpleEventBus<EddaEvents>()
    const dispatcher = new CapabilityDispatcher(makeResolver(), bus)
    const seen = vi.fn()
    bus.on(CAPABILITY_MISSING_EVENT, seen)

    const result = await dispatcher.openBook({
      sourceId: 'connector.komga',
      bookId: 'book-cbz',
      mediaType: 'application/vnd.comicbook+zip',
      title: 'Batman',
    })

    expect(result.status).toBe('unsupported')
    expect(seen).not.toHaveBeenCalled()
  })
})

// ─── (f) OPDS H1 origin gate — verifier-angle independent check ────────────
// The maker added a bypass-matrix in opds.test.ts. This is the CHECKER's independent
// assertion from a different angle: `downloadDescriptor` must pin `allowedOrigins` to the
// base origin so the streaming download path cannot leak credentials cross-origin.

import type { HostBridge, KeyValueStore, Logger } from '@/core/contracts'
import { createOpdsConnector } from '@/plugins/connectors/opds'

const _stubStorage: KeyValueStore = {
  get: async () => undefined,
  set: async () => {},
  delete: async () => {},
}
const _stubLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

function makeOpdsHost(feedBody: string, contentType = 'application/atom+xml'): HostBridge {
  return {
    http: {
      async send() {
        return {
          status: 200,
          headers: { 'Content-Type': contentType },
          async bytes() {
            return new Uint8Array()
          },
          async text() {
            return feedBody
          },
        }
      },
    },
    storage: _stubStorage,
    logger: _stubLogger,
  }
}

describe('[Gate-2] OPDS H1 origin-gate — downloadDescriptor pins allowedOrigins to base (verifier)', () => {
  const BASE = 'https://komga.internal/opds/v1.2/catalog'

  const feedWithCrossOriginLink = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Stolen Book</title>
    <id>urn:book:x</id>
    <link rel="http://opds-spec.org/acquisition" href="https://attacker.evil/steal.epub" type="application/epub+zip"/>
  </entry>
</feed>`

  const feedWithSameOriginLink = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Legit Book</title>
    <id>urn:book:y</id>
    <link rel="http://opds-spec.org/acquisition" href="/files/legit.epub" type="application/epub+zip"/>
  </entry>
</feed>`

  const bookRefCross = {
    sourceId: 's',
    bookId: 'urn:book:x',
    mediaType: 'application/epub+zip' as const,
    title: 'Stolen Book',
  }

  const bookRefLegit = {
    sourceId: 's',
    bookId: 'urn:book:y',
    mediaType: 'application/epub+zip' as const,
    title: 'Legit Book',
  }

  it('allowedOrigins in downloadDescriptor is pinned to the base origin (not wildcard)', async () => {
    const connector = createOpdsConnector(
      { baseUrl: BASE, sourceId: 's', username: 'u', password: 'p' },
      makeOpdsHost(feedWithSameOriginLink),
    )
    const descriptor = await connector.downloadDescriptor(bookRefLegit)
    // Must NEVER be wildcard — must be exactly the base origin
    expect(descriptor.allowedOrigins).not.toContain('*')
    expect(descriptor.allowedOrigins).toEqual(['https://komga.internal'])
  })

  it('content() with cross-origin acquisition link THROWS before any credentialed send', async () => {
    const sentUrls: string[] = []
    const bridge: HostBridge = {
      http: {
        async send(req) {
          sentUrls.push(req.url)
          return {
            status: 200,
            headers: { 'Content-Type': 'application/atom+xml' },
            async bytes() {
              return new Uint8Array()
            },
            async text() {
              return feedWithCrossOriginLink
            },
          }
        },
      },
      storage: _stubStorage,
      logger: _stubLogger,
    }
    const connector = createOpdsConnector(
      { baseUrl: BASE, sourceId: 's', username: 'u', password: 'p' },
      bridge,
    )
    await expect(connector.content(bookRefCross)).rejects.toThrow(/allowed origins/i)
    // Attacker URL was NEVER requested — credentials stayed inside the source origin
    expect(sentUrls.some((u) => u.includes('attacker.evil'))).toBe(false)
  })

  it('an unparseable base URL yields empty allowedOrigins (fail-closed)', async () => {
    const connector = createOpdsConnector(
      { baseUrl: 'not-a-url', sourceId: 's', username: 'u', password: 'p' },
      makeOpdsHost(feedWithSameOriginLink),
    )
    const descriptor = await connector.downloadDescriptor(bookRefLegit)
    // fail-closed: empty list means the streaming download path denies everything
    expect(descriptor.allowedOrigins).toHaveLength(0)
  })
})
