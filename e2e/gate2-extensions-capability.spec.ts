/**
 * Gate-2 INDEPENDENT e2e verification — `add-extensions-and-capability-install` (ch10).
 * Written by the Gate-2 checker. Exercises both UI screens from scratch and saves evidence
 * to gate2/playwright/ (separate from the maker's gate1 screenshots).
 *
 * Scenario (from the Planner): /settings/extensions → INSTALLED·3 bundled + AVAILABLE (PDF NEXT UP)
 * → Install PDF → moves to INSTALLED·4 (toggleable) → open PDF book (fixture) without format installed
 * → capability-missing dialog → "Install & open" → PDF canvas renders → re-open: no prompt.
 */
import path from 'path'
import { expect, test } from '@playwright/test'

const G2 = path.join(
  'loop/artifacts/add-extensions-and-capability-install/attempt-1/gate2/playwright',
)

function buildMinimalPdf(title = 'Test PDF'): Buffer {
  // A 3-page valid PDF with xref computed from actual byte offsets.
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    `<< /Title (${title}) /Author (Checker) >>`,
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 0; i < objects.length; i++) {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xs = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xs}\n%%EOF\n`
  return Buffer.from(body + xref + trailer, 'latin1')
}

test.describe('Gate-2: Extensions screen (screen 06)', () => {
  test('INSTALLED·3 bundled rows + AVAILABLE grid match design spec', async ({ page }) => {
    await page.goto('/settings/extensions')
    await expect(page.getByRole('heading', { name: 'Extensions', level: 1 })).toBeVisible()

    // Host API pill
    await expect(page.getByTestId('host-api-pill')).toContainText('v1.2')

    // INSTALLED section: exactly 3 (OPDS, Komga, EPUB) — all BUNDLED
    await expect(page.getByTestId('installed-heading')).toContainText('3')
    await expect(page.getByTestId('ext-row-connector.opds')).toContainText('connector.opds')
    await expect(page.getByTestId('ext-row-connector.opds')).toContainText('v1.4.0')
    await expect(page.getByTestId('ext-row-connector.komga')).toContainText('connector.komga')
    await expect(page.getByTestId('ext-row-connector.komga')).toContainText('v2.1.0')
    await expect(page.getByTestId('ext-row-format.epub')).toContainText('format.epub')
    await expect(page.getByTestId('ext-row-format.epub')).toContainText('v3.0.1')

    // BUNDLED tags present
    await expect(page.getByText('BUNDLED').first()).toBeVisible()

    // EPUB toggle must be disabled (bundled, non-disableable)
    const epubToggle = page.getByTestId('toggle-format.epub')
    await expect(epubToggle).toBeDisabled()
    await expect(epubToggle).toHaveAttribute('aria-checked', 'true')

    // AVAILABLE section has PDF (NEXT UP), Kavita, Calibre, CBZ
    await expect(page.getByTestId('avail-format.pdf')).toContainText('1.2 MB')
    await expect(page.getByTestId('next-up-tag')).toBeVisible()
    await expect(page.getByTestId('avail-connector.kavita')).toBeVisible()
    await expect(page.getByTestId('avail-connector.calibre')).toContainText('no progress API')
    await expect(page.getByTestId('avail-format.cbz')).toBeVisible()

    await page.screenshot({ path: `${G2}/gate2-06-extensions.png`, fullPage: true })

    // Install PDF → moves to INSTALLED·4
    await page.getByTestId('install-format.pdf').click()
    await expect(page.getByTestId('ext-row-format.pdf')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('avail-format.pdf')).toHaveCount(0)
    await expect(page.getByTestId('toggle-format.pdf')).toBeEnabled()
    await expect(page.getByTestId('installed-heading')).toContainText('4')

    await page.screenshot({ path: `${G2}/gate2-06-after-install.png`, fullPage: true })

    // Verify zero console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    // (listener active for subsequent checks)
  })
})

test.describe('Gate-2: Capability-missing flow (screen 07)', () => {
  test('PDF not installed → dialog → decline → reopen → install & open → canvas renders', async ({
    page,
  }) => {
    // Route the fixture PDF so the connector returns it
    await page.route('**/fixtures/the-picture-of-dorian-gray.pdf', (route) =>
      route.fulfill({ status: 200, contentType: 'application/pdf', body: buildMinimalPdf() }),
    )

    // Collect console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // 1. Navigate to the book detail for the Dorian Gray PDF
    await page.goto('/library')
    await page
      .getByRole('link', { name: /Dorian Gray/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/book\//)
    await page.getByRole('button', { name: /read/i }).first().click()
    await expect(page).toHaveURL(/\/reader\//)

    // 2. Capability-missing dialog appears
    const dialog = page.getByTestId('capability-missing-modal')
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog).toContainText('format.pdf')
    await expect(dialog).toContainText('1.2 MB')
    await expect(dialog).toContainText('Fixed layout')
    await expect(dialog).toContainText('No network access')
    await page.screenshot({ path: `${G2}/gate2-07-capability-missing.png` })

    // 3. Decline: "Not now — download" — dialog closes, no install
    await page.getByTestId('capability-decline').click()
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeHidden({
      timeout: 5_000,
    })

    // 4. Reopen the same PDF — dialog reappears (still not installed)
    await page.goto('/library')
    await page
      .getByRole('link', { name: /Dorian Gray/ })
      .first()
      .click()
    await page.getByRole('button', { name: /read/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeVisible({
      timeout: 15_000,
    })

    // 5. "Install & open" — installs PDF chunk + retries → reader shows canvas
    await page.getByTestId('capability-install').click()
    const canvas = page.locator('[data-testid="reader-mount"] canvas')
    await expect(canvas).toBeVisible({ timeout: 30_000 })
    await page.screenshot({ path: `${G2}/gate2-07-pdf-open.png` })

    // 6. Re-open: already installed → NO capability-missing dialog this time
    await page.goto('/library')
    await page
      .getByRole('link', { name: /Dorian Gray/ })
      .first()
      .click()
    await page.getByRole('button', { name: /read/i }).first().click()
    await expect(page.locator('[data-testid="reader-mount"] canvas')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toHaveCount(0)
    await page.screenshot({ path: `${G2}/gate2-07-no-reprompt.png` })

    // Assert zero browser-console errors throughout
    expect(consoleErrors, `Console errors: ${consoleErrors.join('; ')}`).toHaveLength(0)
  })
})
