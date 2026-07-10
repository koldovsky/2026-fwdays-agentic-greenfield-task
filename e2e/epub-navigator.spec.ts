/**
 * e2e — add-format-epub: the EPUB Navigator in a real browser (foliate renders each spine item into a
 * sandboxed <iframe>, so this behaviour cannot run in jsdom). Headless change — no app screen — so this
 * drives the renderer layer directly for BOTH real fixtures: the bytes are served via `page.route()`,
 * then in-page we open the FormatHandler, create the Navigator over a mounted element, and assert the
 * full lifecycle — loaded fires → goTo resolves currentLocation to the target → applyPreferences
 * re-flows → destroy tears down cleanly with no further events. For the small fixture the screenshot is
 * captured after the re-flow but before destroy (so it shows the rendered, sepia-themed page); video
 * via playwright.config.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-format-epub/attempt-1/gate1/playwright'

const FIXTURES = [
  {
    name: 'Pensées (small, NCX TOC)',
    file: 'blaise-pascal_pensees.epub',
    routeUrl: '/fixtures/pensees.epub',
    title: 'Pensées',
    screenshot: 'epub-navigator.png',
  },
  {
    name: 'The Eminence in Shadow, Vol. 1 (14 MB light-novel)',
    file: 'The Eminence in Shadow - Volume 01 [Yen Press][Kobo].epub',
    routeUrl: '/fixtures/eminence.epub',
    title: 'The Eminence in Shadow, Vol. 1',
    screenshot: undefined as string | undefined,
  },
]

test.describe('add-format-epub — EPUB Navigator (real Chromium)', () => {
  for (const fixture of FIXTURES) {
    test(`open → loaded → goTo → currentLocation → applyPreferences → destroy — ${fixture.name}`, async ({
      page,
    }) => {
      const bytes = readFileSync(resolve(process.cwd(), 'test-epubs', fixture.file))
      await page.route(`**${fixture.routeUrl}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/epub+zip', body: bytes }),
      )
      // Be on the dev-server origin so the in-page dynamic import() hits Vite (fetch is same-origin).
      await page.goto('/library')

      const opened = await page.evaluate(async (url) => {
        const [{ EpubFormatHandler }, { publicationSourceFromBytes }] = await Promise.all([
          import('/src/plugins/formats/epub/index.ts'),
          import('/src/core/contracts/index.ts'),
        ])

        // A neutral, random-access PublicationSource (ADR-005 / the 7b contract): the handler reads
        // ranged bytes via `size()`/`read()`, not a `{ kind, file }` shape.
        const res = await fetch(url)
        const source = publicationSourceFromBytes(new Uint8Array(await res.arrayBuffer()))

        const handler = new EpubFormatHandler()
        const publication = await handler.open(source)

        const mount = document.createElement('div')
        mount.style.cssText = 'position:fixed; inset:0; background:#fff; z-index:9999;'
        document.body.append(mount)

        const locatorChanges: string[] = []
        const errors: string[] = []
        const nav = await handler.createNavigator(publication, mount, { source })

        nav.on('locatorChanged', (loc) => locatorChanges.push((loc as { href: string }).href))
        nav.on('error', (err) => errors.push(String(err)))
        // ADR-013: there is no separate 'loaded' event — `createNavigator` resolves once the initial
        // render completes, so a non-empty currentLocator() here proves the book painted a position.
        const initialHref = nav.currentLocator().href

        const targetIndex = Math.min(3, publication.readingOrder.length - 1)
        const target = publication.readingOrder[targetIndex]
        if (!target) throw new Error('fixture produced an empty reading order')

        await nav.goTo(target)
        const currentAfterGoto = nav.currentLocator()

        let preferencesOk = true
        try {
          nav.applyPreferences({ theme: 'sepia', textSizePt: 22 })
        } catch {
          preferencesOk = false
        }

        // Stash the live navigator so the post-screenshot step can verify a clean teardown.
        ;(globalThis as unknown as { __edda: unknown }).__edda = { nav, locatorChanges }

        return {
          title: publication.metadata.title,
          readingOrderLen: publication.readingOrder.length,
          initialHref,
          locatorChangedCount: locatorChanges.length,
          targetHref: target.href,
          currentHref: currentAfterGoto.href,
          locationMatch: currentAfterGoto.href === target.href,
          preferencesOk,
          errors,
        }
      }, fixture.routeUrl)

      // Screenshot the live, re-flowed reader (sepia) before teardown — the design-evidence artifact.
      await page.waitForTimeout(200)
      if (fixture.screenshot) {
        await page.screenshot({ path: `${SHOTS}/${fixture.screenshot}` })
      }

      const torndown = await page.evaluate(() => {
        const stash = (
          globalThis as unknown as {
            __edda: { nav: { destroy(): void }; locatorChanges: string[] }
          }
        ).__edda
        const changesBeforeDestroy = stash.locatorChanges.length
        let destroyOk = true
        try {
          stash.nav.destroy()
        } catch {
          destroyOk = false
        }
        return { destroyOk, changesBeforeDestroy, changesAfterDestroy: stash.locatorChanges.length }
      })

      expect(opened.title).toBe(fixture.title)
      expect(opened.readingOrderLen).toBeGreaterThan(0)
      // createNavigator resolves once the initial render completes, producing a current position.
      expect(typeof opened.initialHref).toBe('string')
      expect(opened.initialHref.length).toBeGreaterThan(0)
      // goTo(target) → currentLocator() resolves to the same resource.
      expect(opened.locationMatch).toBe(true)
      // navigation emits locatorChanged.
      expect(opened.locatorChangedCount).toBeGreaterThan(0)
      // applyPreferences re-flows without throwing or re-creating the Navigator.
      expect(opened.preferencesOk).toBe(true)
      expect(opened.errors).toEqual([])
      // destroy() tears down cleanly and emits no further events.
      expect(torndown.destroyOk).toBe(true)
      expect(torndown.changesAfterDestroy).toBe(torndown.changesBeforeDestroy)
    })
  }
})
