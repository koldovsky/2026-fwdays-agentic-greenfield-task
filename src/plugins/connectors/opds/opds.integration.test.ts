// @vitest-environment jsdom
//
// Integration suite for connector-opds against the throwaway Docker Komga's OPDS v1.2 endpoint
// (`pnpm komga:up`). Komga also speaks OPDS, so it is a real generic-OPDS server to exercise the
// connector's browse/download + honest progress declaration against. GATED on reachability: when Komga
// is down the suite is SKIPPED (yellow), never silently passing. Credentials are the documented
// throwaway reader defaults (no secrets committed). The jsdom environment supplies the `DOMParser`
// `_opds-core` uses for OPDS 1.x Atom; `fetch` is Node's (no browser CORS enforcement to a real server).

import { describe, expect, it } from 'vitest'
import { createWebPluginBridge } from '@/platform/web'
import { OPDS_MANIFEST } from '@/app/plugins-catalog'
import { createOpdsConnector } from '.'

const KOMGA_URL = process.env.KOMGA_URL ?? 'http://localhost:25600'
const username = process.env.KOMGA_USER_EMAIL ?? 'reader@edda.test'
const password = process.env.KOMGA_USER_PASSWORD ?? 'edda-reader-pw'

async function komgaReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${KOMGA_URL}/api/v1/claim`)
    return response.ok
  } catch {
    return false
  }
}

const komgaAlive = await komgaReachable()

// The bridge is the host's job; the test plays the host (any-origin network for the user's server).
const bridge = createWebPluginBridge(OPDS_MANIFEST.id, { permissions: { network: ['*'] } })

function connectorAt(path: string) {
  return createOpdsConnector(
    { baseUrl: `${KOMGA_URL}${path}`, sourceId: 'opds-komga', username, password },
    bridge,
  )
}

describe.skipIf(!komgaAlive)('connector-opds vs live Docker Komga OPDS', () => {
  it('probes Komga’s OPDS root positive (with credentials)', async () => {
    expect(await connectorAt('/opds/v1.2/catalog').probe()).toBe(true)
  })

  it('browses the OPDS catalog root as shelves (a navigation feed)', async () => {
    const shelves = await connectorAt('/opds/v1.2/catalog').listShelves()
    expect(shelves.length).toBeGreaterThan(0)
    expect(shelves.map((shelf) => shelf.title)).toContain('All series')
  })

  it('browses a series acquisition feed into typed BookRefs and downloads a book’s bytes', async () => {
    // catalog → "All series" → a series → its acquisition feed of books.
    const allSeriesShelf = (await connectorAt('/opds/v1.2/catalog').listShelves()).find(
      (shelf) => shelf.title === 'All series',
    )
    expect(allSeriesShelf).toBeDefined()

    const seriesShelves = await connectorAt('/opds/v1.2/series').listShelves()
    expect(seriesShelves.length).toBeGreaterThan(0)
    const seriesPath = new URL(seriesShelves[0]!.href).pathname

    const seriesConnector = connectorAt(seriesPath)
    const books = await seriesConnector.browse()
    expect(books.length).toBeGreaterThan(0)
    const book = books[0]!
    expect(book.sourceId).toBe('opds-komga')
    expect(book.mediaType).toMatch(/epub|pdf|cbz|comicbook/i) // media type from the acquisition link
    expect(book.sourceLabel).toBe('opds')

    // Download the first book's bytes through the connector (bypassing the SW, ADR-005).
    const bytes = await seriesConnector.content(book)
    expect(bytes.byteLength).toBeGreaterThan(0)
  })

  it('declares progress local-only for Komga’s OPDS (no OPDS v2 progression advertised)', () => {
    const connector = connectorAt('/opds/v1.2/catalog')
    expect(connector.progressSync).toBe(false) // honest: Komga progression is REST, not OPDS v2
  })
})
