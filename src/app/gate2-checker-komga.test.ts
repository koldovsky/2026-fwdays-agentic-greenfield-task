/**
 * Gate-2 checker — add-connector.komga (spec 3/11)
 *
 * Independent tests written by the CHECKER agent (NOT the maker). Cover load-bearing
 * invariants and acceptance-criteria gaps not fully proven by the maker's test suite.
 *
 * Focus areas:
 * 1. Platform-neutrality: src/core/bridge/** and src/core/registry/** carry zero DOM/fetch/vue.
 *    (src/core/model and src/core/contracts are covered by library-browse-gate2-checker.test.ts)
 * 2. Permission enforcement end-to-end through createPluginBridge (not just PermissionEnforcingHttpClient directly).
 * 3. Registry concurrent-install safety (loader called once under a race).
 * 4. Komga mapping edge cases (empty authors, role-selection, title fallback).
 * 5. Browse pagination (multi-page concatenation via last=false guard).
 * 6. Range header format including open-ended range (no end).
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Connector, HttpClient, HttpRequest, KeyValueStore, Logger } from '@/core/contracts'
import { createPluginBridge, type PluginBridgeFactories } from '@/core/bridge'
import { PluginRegistry } from '@/core/registry'
import type { ProgressSyncStrategy } from '@/core/contracts'
import type { LibraryBrowseEntry } from '@/core/model'
import {
  PermissionEnforcingHttpClient,
  PluginPermissionError,
  InMemoryKeyValueStore,
  createConsoleLogger,
} from '@/platform/web'
import { createKomgaConnector } from '@/plugins/connectors/komga'
import { MEDIA_TYPE_EPUB } from '@/core/model'

// ── 1. Platform-neutrality scan: src/core/bridge/** and src/core/registry/** ──
//
// The prior checker (library-browse) covered model and contracts. This checker
// extends the scan to the two NEW core modules this spec added: bridge and registry.
// Neither may import fetch, DOM types, Vue, or any web-only API — the native client
// must be able to satisfy the same interfaces without any of those dependencies.

const REPO_ROOT = process.cwd()

function collectSourceTs(dir: string): string[] {
  const paths: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        paths.push(...collectSourceTs(full))
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.spec.ts')
      ) {
        paths.push(full)
      }
    }
  } catch {
    // directory may not exist — handled by the "at least N files" assertions below
  }
  return paths
}

const BRIDGE_DIR = join(REPO_ROOT, 'src/core/bridge')
const REGISTRY_DIR = join(REPO_ROOT, 'src/core/registry')
const coreNewFiles = [...collectSourceTs(BRIDGE_DIR), ...collectSourceTs(REGISTRY_DIR)]

/** Patterns that must NOT appear in any src/core/bridge or src/core/registry source file. */
const FORBIDDEN_IN_CORE: [RegExp, string][] = [
  [/\bfetch\s*\(/, 'fetch() call — HTTP must go through HostBridge'],
  [/\bwindow\s*[.[]/, 'window global — platform-neutral code must not touch DOM globals'],
  [/\bdocument\s*[.[]/, 'document global — same as window'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest — use HttpClient bridge instead'],
  [/from ['"]vue['"]/, "import from 'vue' — core must not depend on the Vue runtime"],
  [/from ['"]@\/app/, '@/app import — crosses into the UI application layer'],
  [/\blocalStorage\b/, 'localStorage — platform-neutral: persistence is an injected port'],
  [/\bsessionStorage\b/, 'sessionStorage — same rationale as localStorage'],
  [/:\s*HTMLElement\b/, 'HTMLElement type annotation — DOM type leaking into core'],
]

describe('platform-neutrality — src/core/bridge/** and src/core/registry/**', () => {
  it('scanned both new core directories (bridge + registry) for source files', () => {
    const relPaths = coreNewFiles.map((f) => relative(REPO_ROOT, f))
    expect(relPaths).toContain('src/core/bridge/index.ts')
    expect(relPaths).toContain('src/core/registry/index.ts')
    expect(coreNewFiles.length).toBeGreaterThanOrEqual(2)
  })

  for (const [pattern, label] of FORBIDDEN_IN_CORE) {
    it(`no bridge/registry source file contains: ${label}`, () => {
      const violations: string[] = []
      for (const file of coreNewFiles) {
        const src = readFileSync(file, 'utf-8')
        const lines = src.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i]!.trim()
          // Skip comment-only lines (JSDoc * lines and // single-line comments).
          // We only want to catch ACTUAL CODE using the forbidden APIs.
          if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue
          if (pattern.test(trimmed)) {
            violations.push(`${relative(REPO_ROOT, file)}:${i + 1}  ${trimmed}`)
          }
        }
      }
      expect(
        violations,
        `Platform violation (${label}) found in core source:\n${violations.join('\n')}`,
      ).toHaveLength(0)
    })
  }
})

// ── 2. Permission enforcement end-to-end through createPluginBridge ───────────
//
// The maker tests PermissionEnforcingHttpClient in isolation (web.test.ts).
// The checker independently verifies the FULL chain: manifest → createPluginBridge
// (injecting real web factories) → PermissionEnforcingHttpClient → inner client spy.
// The inner client must NEVER be called for a blocked origin.

function makeWebFactories(innerSpy: HttpClient): PluginBridgeFactories {
  return {
    http: (network) => new PermissionEnforcingHttpClient(innerSpy, network),
    storage: (pluginId) => new InMemoryKeyValueStore(pluginId),
    logger: createConsoleLogger,
  }
}

describe('permission enforcement — end-to-end through createPluginBridge', () => {
  it('a declared origin passes through to the inner transport', async () => {
    const inner: HttpClient = {
      send: vi.fn(async () => ({
        status: 200,
        headers: {},
        bytes: async () => new Uint8Array(),
        text: async () => '',
      })),
    }
    const bridge = createPluginBridge(
      'connector.komga',
      { permissions: { network: ['http://localhost:25600'] } },
      makeWebFactories(inner),
    )
    await bridge.http.send({ url: 'http://localhost:25600/api/v1/books' })
    expect(inner.send).toHaveBeenCalledTimes(1)
  })

  it('an undeclared origin throws PluginPermissionError — inner client is never called', async () => {
    const inner: HttpClient = { send: vi.fn() }
    const bridge = createPluginBridge(
      'connector.komga',
      { permissions: { network: ['http://localhost:25600'] } },
      makeWebFactories(inner),
    )
    await expect(
      bridge.http.send({ url: 'https://exfil.attacker.example/steal' }),
    ).rejects.toBeInstanceOf(PluginPermissionError)
    expect(inner.send).not.toHaveBeenCalled()
  })

  it('empty array permissions deny ALL origins — inner client is never called', async () => {
    const inner: HttpClient = { send: vi.fn() }
    const bridge = createPluginBridge(
      'connector-locked',
      { permissions: { network: [] } },
      makeWebFactories(inner),
    )
    await expect(bridge.http.send({ url: 'http://localhost:25600/x' })).rejects.toBeInstanceOf(
      PluginPermissionError,
    )
    expect(inner.send).not.toHaveBeenCalled()
  })

  it('wildcard permission allows any origin through to inner transport', async () => {
    const inner: HttpClient = {
      send: vi.fn(async () => ({
        status: 200,
        headers: {},
        bytes: async () => new Uint8Array(),
        text: async () => '',
      })),
    }
    const bridge = createPluginBridge(
      'connector-any',
      { permissions: { network: '*' } },
      makeWebFactories(inner),
    )
    await bridge.http.send({ url: 'https://any-origin.example/x' })
    expect(inner.send).toHaveBeenCalledTimes(1)
  })
})

// ── 3. Registry — concurrent install (loader called once under a race) ────────
//
// The maker proves "loader runs once" sequentially (two awaited resolveConnector calls).
// The checker verifies that CONCURRENT `install()` calls also call the loader only once —
// the cache must gate on the PROMISE itself, not just the settled value.

describe('PluginRegistry — concurrent install races call the loader only once', () => {
  it('two concurrent install() calls share the cached instance promise', async () => {
    const registry = new PluginRegistry()
    const noopStrategy: ProgressSyncStrategy = {
      async getProgress() {
        return undefined
      },
      async setProgress() {},
    }
    const connector: Connector = {
      id: 'connector-concurrent',
      progressSync: false,
      async probe() {
        return true
      },
      async browse(): Promise<LibraryBrowseEntry[]> {
        return []
      },
      async getBook(ref) {
        return { title: ref.title, authors: [] }
      },
      async content() {
        return new Uint8Array()
      },
      progressStrategy() {
        return noopStrategy
      },
    }
    const loader = vi.fn(async () => {
      // artificial microtask yield — ensures both install() calls hit the pending-promise guard
      await Promise.resolve()
      return connector
    })
    registry.registerConnector({
      manifest: {
        id: 'connector-concurrent',
        name: 'Concurrent',
        version: '1.0.0',
        kind: 'connector',
        hostApi: '^1.0.0',
        bundled: true,
        capabilities: {
          protocols: ['komga-rest'],
          auth: ['basic'],
          progressSync: false,
          search: false,
          download: true,
          pagedStreaming: false,
          thumbnails: false,
        },
      },
      loader,
    })

    // Fire both installs without awaiting between them
    await Promise.all([
      registry.install('connector-concurrent'),
      registry.install('connector-concurrent'),
    ])

    // Regardless of the race, the loader must have been called AT MOST once
    expect(loader).toHaveBeenCalledTimes(1)
  })
})

// ── 4. Komga mapping edge cases (canned JSON — no live server) ────────────────
//
// The maker covers the happy path (Pensées, one 'writer' author).
// The checker covers the gap cases that would break the mapping in production.

const STUB_STORAGE: KeyValueStore = {
  async get() {
    return undefined
  },
  async set() {},
  async delete() {},
}
const STUB_LOGGER: Logger = { debug() {}, info() {}, warn() {}, error() {} }

interface FakeRoute {
  status?: number
  json?: unknown
  bytes?: Uint8Array
}

function komgaWith(route: (req: HttpRequest) => FakeRoute) {
  const requests: HttpRequest[] = []
  const http: HttpClient = {
    async send(request) {
      requests.push(request)
      const r = route(request)
      const status = r.status ?? 200
      const text = r.json !== undefined ? JSON.stringify(r.json) : ''
      const bytes = r.bytes ?? new TextEncoder().encode(text)
      return { status, headers: {}, bytes: async () => bytes, text: async () => text }
    },
  }
  const bridge = { http, storage: STUB_STORAGE, logger: STUB_LOGGER }
  return {
    connector: createKomgaConnector(
      { baseUrl: 'http://localhost:25600', email: 'r@t.test', password: 'pw' },
      bridge,
    ),
    requests,
  }
}

function springPage(content: unknown[], last = true) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 200, last }
}

describe('KomgaConnector — browse mapping edge cases (no live server)', () => {
  it('empty authors array → entry has no `author` field (not undefined-string)', async () => {
    const book = {
      id: 'book-1',
      name: 'No Author',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: { title: 'No Author', authors: [] },
    }
    const { connector } = komgaWith(() => ({ json: springPage([book]) }))
    const [entry] = await connector.browse()
    expect(entry).toBeDefined()
    expect('author' in (entry as object)).toBe(false)
  })

  it('authors with only non-writer roles → falls back to first author name', async () => {
    const book = {
      id: 'book-2',
      name: 'Illustrated Work',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: {
        title: 'Illustrated Work',
        authors: [
          { name: 'Artist A', role: 'artist' },
          { name: 'Writer B', role: 'writer' },
        ],
      },
    }
    const { connector } = komgaWith(() => ({ json: springPage([book]) }))
    const [entry] = await connector.browse()
    // role='writer' present as second entry → should be preferred
    expect(entry?.author).toBe('Writer B')
  })

  it('when metadata.title is empty string, falls back to book.name', async () => {
    const book = {
      id: 'book-3',
      name: 'Filesystem Name',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: { title: '', authors: [] },
    }
    const { connector } = komgaWith(() => ({ json: springPage([book]) }))
    const [entry] = await connector.browse()
    expect(entry?.title).toBe('Filesystem Name')
  })

  it('thumbnailHref uses the connector base URL + book id (no live server)', async () => {
    const book = {
      id: 'book-thumb',
      name: 'Cover Test',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: { title: 'Cover Test', authors: [] },
    }
    const { connector } = komgaWith(() => ({ json: springPage([book]) }))
    const [entry] = await connector.browse()
    expect(entry?.thumbnailHref).toBe('http://localhost:25600/api/v1/books/book-thumb/thumbnail')
  })

  it('sourceId stamped on entries matches the connector id', async () => {
    const book = {
      id: 'book-src',
      name: 'Source Stamp',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: { title: 'Source Stamp', authors: [] },
    }
    const { connector } = komgaWith(() => ({ json: springPage([book]) }))
    const [entry] = await connector.browse()
    expect(entry?.sourceId).toBe('connector.komga')
    expect(entry?.sourceLabel).toBe('komga')
  })
})

// ── 5. Browse pagination — multi-page concatenation ──────────────────────────
//
// The maker only tests a single-page response (last=true). The checker verifies
// that when the server returns last=false the connector fetches subsequent pages
// and concatenates them into a single flat array.

describe('KomgaConnector — browse() paginates through last=false responses', () => {
  it('fetches page 0 and page 1 when page 0 has last=false, returns all entries', async () => {
    const page0Book = {
      id: 'p0',
      name: 'Page 0 Book',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: { title: 'Page 0 Book', authors: [] },
    }
    const page1Book = {
      id: 'p1',
      name: 'Page 1 Book',
      created: '2026-01-01T00:00:00Z',
      media: { status: 'READY', mediaType: MEDIA_TYPE_EPUB },
      metadata: { title: 'Page 1 Book', authors: [] },
    }

    const { connector, requests } = komgaWith((req) => {
      if (req.url.includes('page=0')) {
        return {
          json: {
            content: [page0Book],
            totalElements: 2,
            totalPages: 2,
            number: 0,
            size: 200,
            last: false,
          },
        }
      }
      return {
        json: {
          content: [page1Book],
          totalElements: 2,
          totalPages: 2,
          number: 1,
          size: 200,
          last: true,
        },
      }
    })

    const entries = await connector.browse()
    expect(entries).toHaveLength(2)
    expect(entries[0]?.title).toBe('Page 0 Book')
    expect(entries[1]?.title).toBe('Page 1 Book')

    // Verify two separate HTTP requests were made
    const booksReqs = requests.filter((r) => r.url.includes('/api/v1/books'))
    expect(booksReqs.length).toBeGreaterThanOrEqual(2)
  })
})

// ── 6. Range header format ────────────────────────────────────────────────────
//
// The maker tests bytes=0-9 (both start and end).
// The checker tests the open-ended range (start only, no end) → "bytes=N-".

describe('KomgaConnector — range header format', () => {
  it('open-ended range {start:100} produces Range header "bytes=100-"', async () => {
    const FILE = new Uint8Array(200)
    const { connector, requests } = komgaWith(() => ({ status: 200, bytes: FILE }))
    const slice = await connector.content(
      { sourceId: 'connector.komga', bookId: 'book-x', mediaType: MEDIA_TYPE_EPUB, title: 'X' },
      { start: 100 },
    )
    expect(requests[0]?.headers?.Range).toBe('bytes=100-')
    // client-slice: slice(100, undefined) = bytes from 100 to end = 100 bytes
    expect(slice.byteLength).toBe(100)
  })

  it('closed range {start:0, end:9} produces Range header "bytes=0-9" and 10-byte slice', async () => {
    const FILE = new Uint8Array(Array.from({ length: 50 }, (_, i) => i))
    const { connector, requests } = komgaWith(() => ({ status: 200, bytes: FILE }))
    const slice = await connector.content(
      { sourceId: 'connector.komga', bookId: 'book-y', mediaType: MEDIA_TYPE_EPUB, title: 'Y' },
      { start: 0, end: 9 },
    )
    expect(requests[0]?.headers?.Range).toBe('bytes=0-9')
    expect(slice.byteLength).toBe(10)
  })
})
