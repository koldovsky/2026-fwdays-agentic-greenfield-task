/**
 * e2e — add-extensions-and-capability-install (ch10): the Extensions registry screen (doc/web/06) and
 * the capability-missing install flow (doc/web/07), driven in real Chromium on the in-memory fixture
 * connector (which serves the seeded "Dorian Gray" PDF). Captures design-fidelity screenshots.
 *
 *  - Extensions: INSTALLED·3 (OPDS/Komga/EPUB, all BUNDLED with LOCKED toggles) + AVAILABLE
 *    (PDF "NEXT UP" / Kavita / Calibre "no progress API" / CBZ); installing PDF moves it to INSTALLED;
 *    the EPUB bundled toggle does not respond (load-bearing: the registry refuses to disable it).
 *  - Capability flow: opening the PDF (format not installed) shows "Install PDF support?"; "Not now"
 *    declines; "Install & open" installs the first-party chunk and the reader opens the PDF (a canvas);
 *    a subsequent open of the same PDF shows no prompt.
 */
import { expect, test } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-extensions-and-capability-install/attempt-1/gate1/playwright'

/** A minimal but valid multi-page PDF with a title, built with correct xref offsets (jsdom-free). */
function buildPdf(numPages = 6, title = 'The Picture of Dorian Gray'): Buffer {
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({ length: numPages }, (_, i) => `${i + 3} 0 R`).join(' ')}] /Count ${numPages} >>`,
    ...Array.from(
      { length: numPages },
      () => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    ),
    `<< /Title (${title}) /Author (Oscar Wilde) >>`,
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefStart = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(body + xref + trailer, 'latin1')
}

async function routePdf(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/fixtures/the-picture-of-dorian-gray.pdf', (route) =>
    route.fulfill({ status: 200, contentType: 'application/pdf', body: buildPdf() }),
  )
}

/** Library → "Dorian Gray" detail → Read, landing on the PDF reader route. */
async function openDorianPdf(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/library')
  await page
    .getByRole('link', { name: /Dorian Gray/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/book\/study-calibre\/the-picture-of-dorian-gray/)
  await page.getByRole('button', { name: /read/i }).first().click()
  await expect(page).toHaveURL(/\/reader\/study-calibre\/the-picture-of-dorian-gray/)
}

test.describe('Extensions screen (doc/web/06)', () => {
  test('renders INSTALLED·3 bundled + AVAILABLE catalog; bundled toggles are locked; install PDF', async ({
    page,
  }) => {
    await page.goto('/settings/extensions')

    await expect(page.getByRole('heading', { name: 'Extensions', level: 1 })).toBeVisible()
    await expect(page.getByTestId('host-api-pill')).toHaveText('Host API v1.2')
    await expect(page.getByTestId('installed-heading')).toContainText('Installed · 3')

    // Bundled installed identities + BUNDLED tags.
    await expect(page.getByTestId('ext-row-connector.opds')).toContainText(
      'connector.opds · v1.4.0',
    )
    await expect(page.getByTestId('ext-row-connector.komga')).toContainText(
      'connector.komga · v2.1.0',
    )
    await expect(page.getByTestId('ext-row-format.epub')).toContainText('format.epub · v3.0.1')

    // AVAILABLE catalog with sizes + the Calibre "no progress API" note.
    await expect(page.getByTestId('avail-format.pdf')).toContainText('format.pdf · 1.2 MB')
    await expect(page.getByTestId('next-up-tag')).toBeVisible()
    await expect(page.getByTestId('avail-connector.kavita')).toContainText(
      'connector.kavita · 0.9 MB',
    )
    await expect(page.getByTestId('avail-connector.calibre')).toContainText('no progress API')
    await expect(page.getByTestId('avail-format.cbz')).toContainText('format.cbz · 0.4 MB')

    await page.screenshot({ path: `${SHOTS}/06-extensions.png`, fullPage: true })

    // Load-bearing: the EPUB bundled toggle is non-interactive; clicking it does nothing.
    const epubToggle = page.getByTestId('toggle-format.epub')
    await expect(epubToggle).toBeDisabled()
    await expect(epubToggle).toHaveAttribute('aria-checked', 'true')
    await epubToggle.click({ force: true })
    await expect(epubToggle).toHaveAttribute('aria-checked', 'true') // still on

    // Install PDF → it moves from AVAILABLE to INSTALLED (now a real, toggleable extension).
    await page.getByTestId('install-format.pdf').click()
    await expect(page.getByTestId('ext-row-format.pdf')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('avail-format.pdf')).toHaveCount(0)
    await expect(page.getByTestId('toggle-format.pdf')).toBeEnabled()
    await expect(page.getByTestId('installed-heading')).toContainText('Installed · 4')
  })
})

test.describe('Capability-missing install flow (doc/web/07)', () => {
  test('open PDF → prompt → decline downloads; reopen → install & open renders the PDF', async ({
    page,
  }) => {
    await routePdf(page)

    // 1. Open the PDF while format.pdf is NOT installed → the capability-missing prompt appears.
    await openDorianPdf(page)
    const modal = page.getByTestId('capability-missing-modal')
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(modal).toContainText('format.pdf · v1.0.3 · 1.2 MB')
    await expect(modal).toContainText('Fixed layout')
    await expect(modal).toContainText('No network access')
    await page.screenshot({ path: `${SHOTS}/07-capability-missing.png` })

    // 2. "Not now — download the file instead" — declines without installing.
    await page.getByTestId('capability-decline').click()
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeHidden()

    // 3. Reopen → prompt again (still not installed) → "Install & open" installs + opens the PDF.
    await openDorianPdf(page)
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId('capability-install').click()

    // The reader opens the PDF in-app on a canvas (pdfjs renders to it; no cross-origin frame for PDF).
    await expect(page.locator('[data-testid="reader-mount"] canvas')).toBeVisible({
      timeout: 30_000,
    })
    await page.screenshot({ path: `${SHOTS}/07-pdf-open.png` })

    // A subsequent open of the now-installed format shows NO prompt — straight to the reader.
    await openDorianPdf(page)
    await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toHaveCount(0)
    await expect(page.locator('[data-testid="reader-mount"] canvas')).toBeVisible({
      timeout: 30_000,
    })
  })
})
