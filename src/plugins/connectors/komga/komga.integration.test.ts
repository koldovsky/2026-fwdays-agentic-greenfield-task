// @vitest-environment node
//
// Integration suite for connector-komga against the throwaway Docker Komga in test/komga/
// (`pnpm komga:up` / `komga:provision`, seeded from test-epubs/). It is GATED on the server being
// reachable: when Komga is down the whole suite is SKIPPED (yellow) — never silently reported as
// passing. Credentials come from env vars with the documented throwaway reader defaults (no secrets
// committed). Node environment so `fetch` hits a real server with no jsdom/CORS interference (CORS is
// a host concern — KOMGA_CORS_ALLOWED_ORIGINS — only for the browser build, see test/komga/README.md).

import { afterEach, describe, expect, it } from 'vitest'
import { createWebPluginBridge } from '@/platform/web'
import { furthestWins } from '@/core/sync'
import type { BookRef, Locator } from '@/core/model'
import { type KomgaConfig, createKomgaConnector } from '.'

const KOMGA_URL = process.env.KOMGA_URL ?? 'http://localhost:25600'
const config: KomgaConfig = {
  baseUrl: KOMGA_URL,
  email: process.env.KOMGA_USER_EMAIL ?? 'reader@edda.test',
  password: process.env.KOMGA_USER_PASSWORD ?? 'edda-reader-pw',
}

async function komgaReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${KOMGA_URL}/api/v1/claim`)
    if (!response.ok) return false
    const body = (await response.json()) as { isClaimed?: unknown }
    return typeof body.isClaimed === 'boolean'
  } catch {
    return false
  }
}

const komgaAlive = await komgaReachable()

// The bridge is the host's job; the test plays the host (any-origin network for the user's server).
const bridge = createWebPluginBridge('connector-komga', { permissions: { network: ['*'] } })
const komga = createKomgaConnector(config, bridge)

const findPensees = <T extends { title: string }>(entries: T[]): T | undefined =>
  entries.find((entry) => /pens/i.test(entry.title))

describe.skipIf(!komgaAlive)('connector-komga vs live Docker Komga', () => {
  it('probe identifies the server without credentials', async () => {
    expect(await komga.probe()).toBe(true)
  })

  it('authenticates as the least-privilege reader (FILE_DOWNLOAD + PAGE_STREAMING)', async () => {
    const user = await komga.verifyAuth()
    expect(user.email).toBe(config.email)
    expect(user.roles).toEqual(expect.arrayContaining(['FILE_DOWNLOAD', 'PAGE_STREAMING']))
  })

  it('browses the seeded library: ≥2 entries including Pensées by Pascal', async () => {
    const entries = await komga.browse()
    expect(entries.length).toBeGreaterThanOrEqual(2)
    const pensees = findPensees(entries)
    expect(pensees).toBeDefined()
    expect(pensees?.author).toMatch(/pascal/i)
    expect(pensees?.mediaType).toBe('application/epub+zip')
    expect(pensees?.sourceLabel).toBe('komga')
    expect(pensees?.thumbnailHref).toContain('/thumbnail')
  })

  it('getBook maps the seeded Pensées REST metadata (GET /books/{id}) to BookMeta', async () => {
    const pensees = findPensees(await komga.browse())!
    const meta = await komga.getBook({
      sourceId: 'connector-komga',
      bookId: pensees.bookId,
      mediaType: pensees.mediaType,
      title: pensees.title,
    })
    expect(meta.title).toMatch(/pens/i)
    expect(meta.authors.some((author) => /pascal/i.test(author))).toBe(true)
    expect(meta.pageCount).toBeGreaterThan(0)
    expect(meta.coverHref).toContain('/thumbnail')
    // releaseDate ("YYYY-MM-DD") → numeric year; summary → description. (Komga book metadata carries
    // no language, so that pill is legitimately absent — getBook omits facts the source does not provide.)
    expect(meta.year).toBeGreaterThan(1600)
    expect(meta.description).toBeTruthy()
    expect(meta.language).toBeUndefined()
  })

  it('produces JSON-serializable entries (the Library renders them unchanged)', async () => {
    const entries = await komga.browse()
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries)
  })

  it('searches by a title term and finds the seeded book (paged)', async () => {
    const page = await komga.search('Pens')
    expect(page.totalElements).toBeGreaterThanOrEqual(1)
    expect(page.pageNumber).toBe(0)
    expect(page.items.some((book) => /pens/i.test(book.title))).toBe(true)
  })

  it('fetches a thumbnail as image bytes', async () => {
    const pensees = findPensees(await komga.browse())
    const bytes = await komga.thumbnail(pensees!.bookId)
    expect(bytes.byteLength).toBeGreaterThan(0)
    // JPEG magic — proves real image bytes (Komga returns image/jpeg thumbnails).
    expect(bytes[0]).toBe(0xff)
    expect(bytes[1]).toBe(0xd8)
  })

  it('downloads the whole EPUB and a byte-range slice', async () => {
    const pensees = findPensees(await komga.browse())!
    const full = await komga.download(pensees.bookId)
    expect(full.byteLength).toBeGreaterThan(50_000)
    // EPUB is a zip — "PK" magic.
    expect(Array.from(full.slice(0, 2))).toEqual([0x50, 0x4b])

    const slice = await komga.content(
      {
        sourceId: 'connector-komga',
        bookId: pensees.bookId,
        mediaType: pensees.mediaType,
        title: pensees.title,
      },
      { start: 0, end: 1023 },
    )
    expect(slice.byteLength).toBe(1024)
    expect(Array.from(slice.slice(0, 2))).toEqual([0x50, 0x4b])
  })
})

// Read-progress strategy vs the LIVE server (progress-sync-strategy, task 6.4). Each test sets server
// progress and DELETES it afterward so reruns are idempotent against the shared/seeded server.
const penseesRef: BookRef | null = komgaAlive
  ? await (async () => {
      const pensees = findPensees(await komga.browse())
      return pensees
        ? {
            sourceId: 'connector-komga',
            bookId: pensees.bookId,
            mediaType: pensees.mediaType,
            title: pensees.title,
          }
        : null
    })()
  : null

describe.skipIf(!komgaAlive || !penseesRef)(
  'connector-komga EPUB R2 progression strategy vs live Komga',
  () => {
    const ref = penseesRef as BookRef
    const strategy = komga.progressStrategy()

    afterEach(async () => {
      // Restore the book toward its seeded (unread) state for the next run (best-effort).
      await komga.deleteReadProgress(ref.bookId)
    })

    // THE FIX: a MID-BOOK EPUB position now round-trips to Komga (via the R2 progression endpoint +
    // positions list), where the old page-based PATCH rejected every non-`completed` EPUB write with 400 —
    // which is exactly why every EPUB reopened at page 1.
    it('round-trips a MID-BOOK position (not 0, not 1) — the fix for "reopens at page 1"', async () => {
      await strategy.setProgress(ref, {
        href: ref.bookId,
        type: ref.mediaType,
        locations: { totalProgression: 0.5 },
      })
      const readBack = await strategy.getProgress(ref)
      expect(readBack).toBeDefined()
      const tp = readBack?.locations?.totalProgression ?? 0
      expect(tp).toBeGreaterThan(0.1) // genuinely mid-book, not reset to the start
      expect(tp).toBeLessThan(0.95) // and not snapped to the end
      expect(readBack?.locations?.position ?? 0).toBeGreaterThan(1)
    })

    it('round-trips a completed position: setProgress(1) → getProgress totalProgression ~1', async () => {
      await strategy.setProgress(ref, {
        href: ref.bookId,
        type: ref.mediaType,
        locations: { totalProgression: 1 },
      })
      const readBack = await strategy.getProgress(ref)
      expect(readBack?.locations?.totalProgression ?? 0).toBeGreaterThan(0.95)
    })

    it('surfaces a further remote position so furthest-wins keeps the server (remote-further)', async () => {
      await strategy.setProgress(ref, {
        href: ref.bookId,
        type: ref.mediaType,
        locations: { totalProgression: 1 },
      })
      const remote = await strategy.getProgress(ref)
      expect(remote).toBeDefined()

      const localBehind: Locator = {
        href: ref.bookId,
        type: ref.mediaType,
        locations: { totalProgression: 0.2 },
      }
      // furthest-progression-wins keeps the further remote — the engine would NOT regress the server.
      expect(furthestWins(localBehind, remote!)).toBe(remote)
    })
  },
)
