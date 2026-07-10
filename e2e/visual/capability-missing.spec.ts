/**
 * Visual — Capability-missing sheet vs doc/web/07-capability-missing-desktop.png.
 *
 * Opening the seeded "Dorian Gray" PDF (format.pdf not installed) raises the install-on-demand sheet via
 * the dispatch CapabilityMissing event. The sheet is a native <dialog> (top-layer, focus-trapped); it is
 * pure chrome, so it is deterministic. Tier-2 golden of the modal; Tier-1 compares the modal against the
 * sheet region of the maket. The PDF bytes are routed locally (built in-spec).
 */
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  DESKTOP_VIEWPORT,
  compareToMaket,
  goldenLocator,
  prepareCapture,
  settle,
} from './capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from './tolerances'

const web = (f: string) => resolve(process.cwd(), 'doc/web', f)
// The centred install sheet within the 1300×881 maket (≈28rem-wide portrait card).
const SHEET_MAKET_CROP = { x: 420, y: 150, width: 460, height: 600 } as const

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

async function openSheet(page: Page): Promise<void> {
  await page.route('**/fixtures/the-picture-of-dorian-gray.pdf', (route) =>
    route.fulfill({ status: 200, contentType: 'application/pdf', body: buildPdf() }),
  )
  await page.goto('/library')
  await page
    .getByRole('link', { name: /Dorian Gray/ })
    .first()
    .click()
  await page.getByRole('button', { name: /read/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Install PDF support?' })).toBeVisible({
    timeout: 15_000,
  })
  await settle(page, 300)
}

test.describe('visual — Capability-missing sheet (doc/web/07)', () => {
  test('the install sheet matches the maket (Tier-1) and the golden (Tier-2)', async ({
    page,
  }, testInfo) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await openSheet(page)

    const modal = page.getByTestId('capability-missing-modal')
    await compareToMaket(page, testInfo, 'capabilityMissing', {
      maketPath: web('07-capability-missing-desktop.png'),
      crop: SHEET_MAKET_CROP,
      target: modal,
      tolerance: TIER1.capabilityMissing,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    await goldenLocator(modal, 'capability-missing-sheet.png')
  })
})
