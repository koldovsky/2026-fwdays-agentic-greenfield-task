/**
 * e2e — add-source-flow spec (screen 05, happy path + design-fidelity capture).
 *
 * Drives the real "Add a source" flow against the throwaway Docker Komga (test/komga, reader account):
 * open the modal from the sidebar → paste the server URL → the prober detects Komga (Reachable +
 * detected card + capability chips) → sign in as the reader → Connect → the Library re-renders on the
 * LIVE Komga connector and shows a real book ("Pensées"), and the source appears in the sidebar. A
 * second test proves Cancel discards. Captures a screenshot + video (playwright.config) as evidence.
 *
 * Requires a live Komga allowlisting this origin for CORS (a host concern): `pnpm komga:up`.
 */
import { expect, test } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-source-flow/attempt-1/gate1/playwright'

const KOMGA_URL = 'http://localhost:25600'
const READER = { username: 'reader@edda.test', password: 'edda-reader-pw' }

test.describe('add-source-flow — e2e (live Komga)', () => {
  test('probe → detect Komga → sign in → Connect → Library shows Pensées + sidebar source', async ({
    page,
  }) => {
    await page.goto('/library')

    // Open the modal from the sidebar Sources region.
    await page.getByRole('link', { name: 'Add source' }).click()
    await expect(page).toHaveURL(/\/settings\/sources\/add/)

    const modal = page.getByRole('dialog')
    await expect(modal.getByRole('heading', { name: 'Add a source' })).toBeVisible()
    await expect(
      modal.getByText('Connect a server or paste an OPDS feed — we detect the rest.'),
    ).toBeVisible()

    // Paste the server address → the prober detects Komga.
    await modal.locator('#add-source-url').fill(KOMGA_URL)
    await expect(modal.getByTestId('reachable')).toBeVisible()
    await expect(modal.getByText('Komga server')).toBeVisible()
    await expect(modal.getByText('connector.komga')).toBeVisible()
    await expect(modal.getByText('opds v2 + rest')).toBeVisible()
    await expect(modal.getByTestId('adapter-ready')).toBeVisible()
    for (const chip of ['OPDS v2', 'Progress sync', 'Search', 'Page streaming', 'Thumbnails']) {
      await expect(modal.getByText(chip, { exact: true })).toBeVisible()
    }

    // Design-fidelity capture of the detected state (compare to doc/web/05-add-source-desktop.png).
    await page.screenshot({ path: `${SHOTS}/05-add-source-detected.png` })

    // Sign in as the least-privilege reader and connect.
    await modal.locator('#add-source-username').fill(READER.username)
    await modal.locator('#add-source-password').fill(READER.password)
    await modal.getByRole('button', { name: 'Connect' }).click()

    // Back at the Library, now rendering on the live Komga connector.
    await expect(page).toHaveURL(/\/library/)
    await expect(page.getByText('Pensées').first()).toBeVisible({ timeout: 20_000 })

    // The connected source is surfaced in the sidebar Sources region.
    await expect(page.getByText('komga · localhost:25600')).toBeVisible()

    await page.screenshot({ path: `${SHOTS}/01-library-on-komga.png`, fullPage: true })
  })

  test('Cancel discards the in-progress source', async ({ page }) => {
    await page.goto('/settings/sources/add')

    const modal = page.getByRole('dialog')
    await expect(modal.getByRole('heading', { name: 'Add a source' })).toBeVisible()
    await modal.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL(/\/library/)
    // No source was persisted (fresh, isolated browser context).
    await expect(page.getByText('komga · localhost:25600')).toHaveCount(0)
  })
})
