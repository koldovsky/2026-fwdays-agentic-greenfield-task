/**
 * a11y — @axe-core/playwright on every maket screen (visual-fidelity §"Keyboard navigation and
 * accessibility"). Fails on any serious/critical violation, including WCAG color-contrast (which axe
 * always runs at serious). The reader's cross-origin book iframe is excluded — book typography is
 * readium-css owned by add-reading-preferences (ch8); ch11 audits the app CHROME.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { routeEpubFixture } from '../visual/maket-seed'

async function expectNoSeriousViolations(page: Page, exclude: string[] = []): Promise<void> {
  // Decorative placeholder cover ART is excluded from the audit: the spec scopes WCAG contrast to "the
  // parchment CHROME and the four reading themes" — book covers are content art, not chrome. These are
  // colour-block placeholders rendering the title as cover art (the title is ALSO presented as the
  // accessible high-contrast text label beside/below, and they are aria-hidden); real Komga covers are
  // <img> with alt. This scopes the audit to the chrome the spec requires, not a rule suppression.
  let builder = new AxeBuilder({ page }).exclude('[data-decorative-cover]')
  for (const selector of exclude) builder = builder.exclude(selector)
  const results = await builder.analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  const summary = serious.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: ${v.help}`)
  expect(summary, JSON.stringify(serious, null, 2)).toEqual([])
}

test.describe('a11y — axe on every screen (no serious/critical)', () => {
  test('Library', async ({ page }) => {
    await page.goto('/library')
    await page.getByRole('heading', { name: 'Your library' }).waitFor()
    await page.getByText('Frankenstein').first().waitFor()
    await expectNoSeriousViolations(page)
  })

  test('Book detail', async ({ page }) => {
    await page.goto('/book/home-server/pride-and-prejudice')
    await page.getByRole('heading', { name: 'Pride and Prejudice', level: 1 }).waitFor()
    await expectNoSeriousViolations(page)
  })

  test('Extensions', async ({ page }) => {
    await page.goto('/settings/extensions')
    await page.getByRole('heading', { name: 'Extensions', level: 1 }).waitFor()
    await expectNoSeriousViolations(page)
  })

  test('Downloads', async ({ page }) => {
    await page.goto('/downloads')
    await page.getByRole('heading', { name: 'Downloads', level: 1 }).waitFor()
    await expectNoSeriousViolations(page)
  })

  test('Add source modal', async ({ page }) => {
    await page.goto('/settings/sources/add')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Add a source' }),
    ).toBeVisible()
    await expectNoSeriousViolations(page)
  })

  test('Reader (chrome only; book iframe excluded)', async ({ page }) => {
    await routeEpubFixture(page)
    await page.goto('/book/home-server/pride-and-prejudice')
    await page.getByRole('button', { name: /reading/i }).click()
    await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
    await expectNoSeriousViolations(page, ['[data-testid="reader-mount"]'])
  })

  test('Capability-missing sheet', async ({ page }) => {
    await page.route('**/fixtures/the-picture-of-dorian-gray.pdf', (route) =>
      route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }),
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
    await expectNoSeriousViolations(page)
  })
})
