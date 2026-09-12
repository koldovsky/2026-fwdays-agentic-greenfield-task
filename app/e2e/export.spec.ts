import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { FIXTURE_TICKET_KEY, startFixtureServer } from './fixture-server'

const DIST_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

interface DistManifest {
  key?: string
  host_permissions?: string[]
}

interface DownloadRecord {
  filename: string
  state: string
  mime?: string
}

function readDistManifest(): DistManifest {
  if (!fs.existsSync(DIST_PATH)) {
    throw new Error(`Extension build not found at ${DIST_PATH}. Run "npm run build:e2e" first.`)
  }
  return JSON.parse(fs.readFileSync(path.join(DIST_PATH, 'manifest.json'), 'utf8')) as DistManifest
}

function hasE2eHostPermission(permissions: string[] | undefined): boolean {
  return (
    permissions?.some((p) => p.includes('127.0.0.1') || p.includes('localhost')) ?? false
  )
}

/** Query chrome.downloads from the extension popup. */
async function getExtensionDownloads(popup: Page): Promise<DownloadRecord[]> {
  return popup.evaluate(async () => {
    return new Promise<DownloadRecord[]>((resolve) => {
      chrome.downloads.search({ orderBy: ['-startTime'], limit: 50 }, (items) => {
        resolve(
          items.map((item) => ({
            filename: item.filename ?? '',
            state: item.state,
            mime: item.mime,
          })),
        )
      })
    })
  })
}

function isCompletedMarkdown(download: DownloadRecord): boolean {
  return download.state === 'complete' && download.mime === 'text/markdown'
}

interface Fixtures {
  context: BrowserContext
  extensionId: string
  ticketUrl: string
}

const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
  ticketUrl: async ({}, use) => {
    const server = await startFixtureServer()
    await use(server.ticketUrl)
    await server.close()
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
  context: async ({}, use, testInfo) => {
    const manifest = readDistManifest()
    if (!hasE2eHostPermission(manifest.host_permissions)) {
      throw new Error('dist/ is a production build without the E2E host permission. Run "npm run build:e2e" first.')
    }
    // `use.video` in playwright.config.ts does not apply to a manually launched
    // persistent context — record here so each run writes a .webm under test-results/.
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      recordVideo: { dir: testInfo.outputDir, size: { width: 1280, height: 720 } },
      args: [`--disable-extensions-except=${DIST_PATH}`, `--load-extension=${DIST_PATH}`],
    })
    await use(context)
    await context.close()
  },

  // eslint-disable-next-line no-empty-pattern
  extensionId: async ({}, use) => {
    const manifest = readDistManifest()
    if (!manifest.key) {
      throw new Error('Built manifest has no `key`; cannot derive a deterministic extension id.')
    }
    const digest = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)
    await use([...digest].map((hex) => String.fromCharCode(97 + parseInt(hex, 16))).join(''))
  },
})

test.describe('Ticket2MD end-to-end export', () => {
  test('popup opens, sees the ticket tab, and exports it to disk', async ({ context, extensionId, ticketUrl }) => {
    const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`
    let popup!: Awaited<ReturnType<BrowserContext['newPage']>>
    let ticketPage!: Awaited<ReturnType<BrowserContext['newPage']>>

    await test.step('1. The extension popup page opens and renders the idle UI', async () => {
      popup = await context.newPage()
      await popup.goto(popupUrl)
      await expect(popup.locator('h1')).toHaveText('Export ticket to MD')
      await expect(popup.locator('#anonymize')).toBeChecked()
      await expect(popup.locator('#export-btn')).toBeVisible()
    })

    await test.step('2. With a ticket tab open, the popup detects it and enables Export (FR-04, FR-05)', async () => {
      ticketPage = await context.newPage()
      await ticketPage.goto(ticketUrl, { waitUntil: 'domcontentloaded' })
      await ticketPage.bringToFront()
      await popup.reload()
      await expect(popup.locator('#export-btn')).toBeEnabled({ timeout: 10_000 })
    })

    await test.step('3. Export completes and produces anonymized Markdown (FR-10, FR-19)', async () => {
      // Real toolbar popups are not tabs — the Jira page stays active. Playwright
      // opens the popup as a tab, so re-activate the ticket before Export.
      await ticketPage.bringToFront()
      await popup.locator('#export-btn').click()
      await expect(popup.locator('body')).toHaveAttribute('data-state', 'success', { timeout: 60_000 })

      // Playwright intercepts on-disk saves as GUID filenames (both in the
      // filesystem and in chrome.downloads.filename), so FR-15/FR-16 folder
      // layout is covered by unit tests on buildExportPaths — here we verify
      // the export actually ran via chrome.downloads + Markdown content.
      let mdDownload: DownloadRecord | undefined
      await expect
        .poll(async () => {
          const downloads = await getExtensionDownloads(popup)
          mdDownload = downloads.find(isCompletedMarkdown)
          return mdDownload !== undefined
        }, { timeout: 30_000 })
        .toBe(true)

      expect(mdDownload!.filename, 'completed Markdown download should have an on-disk path').toBeTruthy()
      expect(fs.existsSync(mdDownload!.filename), 'Markdown file should exist on disk').toBe(true)

      const markdown = fs.readFileSync(mdDownload!.filename, 'utf8')
      expect(markdown).toContain(`# ${FIXTURE_TICKET_KEY}`)
      expect(markdown).toMatch(/User\d+/)
      expect(markdown).not.toMatch(/Federico Ciner|Seerat/)

      // FR-19: anonymized export must not leak real names via on-disk artifact paths.
      const downloads = await getExtensionDownloads(popup)
      for (const download of downloads.filter((item) => item.state === 'complete')) {
        expect(download.filename).not.toMatch(/Federico Ciner|Seerat/)
      }
    })
  })
})
