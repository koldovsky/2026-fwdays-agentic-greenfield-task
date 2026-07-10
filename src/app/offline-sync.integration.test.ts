// @vitest-environment node
//
// The headline acceptance (add-offline-and-sync, task 7.1): the durable sync engine reconciles progress
// against the LIVE Docker Komga through the Komga read-progress strategy — furthest-progression-wins, both
// directions. Gated on the server being reachable (`describe.skipIf` — never a silent pass when Komga is
// down, the ch3/ch4 pattern). The engine runs on `fake-indexeddb` (node has no IndexedDB); the strategy
// hits the real server over `fetch`. Uses a DIFFERENT seeded book than komga.integration.test.ts so the
// two integration files (run in parallel workers) never race on shared server progress, and DELETES the
// book's read-progress before AND after each test so reruns stay idempotent.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory, IDBKeyRange as FDBKeyRange } from 'fake-indexeddb'
import { DexieSyncEngine, EddaDb, createWebPluginBridge } from '@/platform/web'
import type { BookRef, Locator } from '@/core/model'
import { createKomgaConnector, type KomgaConfig } from '@/plugins/connectors/komga'

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
const bridge = createWebPluginBridge('connector-komga', { permissions: { network: ['*'] } })
const komga = createKomgaConnector(config, bridge)

// The Eminence light-novel EPUB — disjoint from the Pensées book the strategy suite mutates.
const ref: BookRef | null = komgaAlive
  ? await (async () => {
      const entries = await komga.browse()
      const book = entries.find((e) => /eminence/i.test(e.title)) ?? entries[1] ?? entries[0]
      return book
        ? {
            sourceId: 'connector-komga',
            bookId: book.bookId,
            mediaType: book.mediaType,
            title: book.title,
          }
        : null
    })()
  : null

function completed(): Locator {
  return { href: ref!.bookId, type: ref!.mediaType, locations: { totalProgression: 1 } }
}
function behind(): Locator {
  return { href: ref!.bookId, type: ref!.mediaType, locations: { totalProgression: 0.3 } }
}

describe.skipIf(!komgaAlive || !ref)(
  'offline → reconnect → reconcile (engine + live Komga)',
  () => {
    const bookRef = ref as BookRef
    let db: EddaDb
    let engine: DexieSyncEngine

    beforeEach(async () => {
      db = new EddaDb({
        name: `edda-e2e-${Math.random().toString(36).slice(2)}`,
        indexedDB: new IDBFactory(),
        IDBKeyRange: FDBKeyRange,
      })
      engine = new DexieSyncEngine(db, { isOnline: () => true })
      await komga.deleteReadProgress(bookRef.bookId) // start from unread
    })
    afterEach(async () => {
      db.close()
      await komga.deleteReadProgress(bookRef.bookId) // leave the shared server unread
    })

    it('drains offline-queued progress to the server on reconnect (local further than remote)', async () => {
      // Progress accrued "offline" sits durably in the outbox…
      engine.enqueue({ ref: bookRef, locator: completed(), queuedAt: Date.now() })
      await engine.idle()
      expect(await engine.pendingCount()).toBe(1)

      // …then a reconnect drain writes it through the Komga strategy.
      await engine.drain(komga.progressStrategy())

      const remote = await komga.progressStrategy().getProgress(bookRef)
      expect(remote?.locations?.totalProgression).toBe(1) // server now reflects the queued progress
      expect(await engine.pendingCount()).toBe(0) // entry removed after a confirmed write
      expect(engine.lastSyncedAt).not.toBeNull() // clean drain recorded
    })

    it('does NOT regress a further server position (furthest-progression-wins keeps remote)', async () => {
      // The server already holds a further position than the pending local one.
      await komga.progressStrategy().setProgress(bookRef, completed())
      engine.enqueue({ ref: bookRef, locator: behind(), queuedAt: Date.now() })
      await engine.idle()

      await engine.drain(komga.progressStrategy())

      const remote = await komga.progressStrategy().getProgress(bookRef)
      expect(remote?.locations?.totalProgression).toBe(1) // server kept its further position (not regressed)
      expect(await engine.pendingCount()).toBe(0) // reconciled → entry dropped
    })
  },
)
