/**
 * Maket-fixture seeding for the visual suite (add-visual-polish-e2e ch11).
 *
 * The in-memory fixture connector wired in src/main.ts already mirrors the maket catalog — "342 titles ·
 * 3 sources", Pride and Prejudice at 38%, the six "Recently added" covers — so the Library/Book-detail
 * screens render the maket content with NO extra seeding. The two run-to-run-volatile regions the maket
 * shows populated (the "Synced 2m ago" pill and the "14 downloaded for offline" count, which the app
 * starts at "Synced just now" / "0") are masked in both tiers via capture-helper.volatileMasks(), not
 * seeded.
 *
 * The only seeding the visual suite needs is real EPUB bytes for the Reader/preferences screens: the
 * fixture's book points at /fixtures/pride-and-prejudice.epub, which we fulfill with a bundled test EPUB
 * (the same pattern as reading-preferences.spec.ts). Book bytes bypass the service worker (ADR-005), so
 * this route intercept is the deterministic source of the spread.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

const EPUB_FIXTURE = 'blaise-pascal_pensees.epub'

/** Fulfill the fixture book's EPUB URL with bundled test bytes so the reader paints deterministically. */
export async function routeEpubFixture(page: Page): Promise<void> {
  const bytes = readFileSync(resolve(process.cwd(), 'test-epubs', EPUB_FIXTURE))
  await page.route('**/fixtures/pride-and-prejudice.epub', (route) =>
    route.fulfill({ status: 200, contentType: 'application/epub+zip', body: bytes }),
  )
}
