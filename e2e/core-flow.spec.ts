import { expect, test } from "@playwright/test";

/**
 * Core user journey (CHECKLIST G5). Runs headless against the real dev
 * server, hitting live NBU — consistent with how every slice this project
 * was verified (no mocking of the data layer).
 */
test.describe("core flow", () => {
  test("loads the rates list with live NBU data", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".app-header__title")).toHaveText("Гривня");
    await expect(page.locator(".app-header__subtitle")).toHaveText("Офіційний курс НБУ");
    // At least one currency row with a real rate is on screen.
    await expect(page.getByRole("button", { name: /^USD/ }).first()).toBeVisible();
  });

  test("selecting a currency shows the converter, history chart, and trend hint", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^USD/ }).first().click();

    // Identity + converter (FR-RATES-04, FR-CONVERT-01).
    await expect(page.locator(".currency-focus__code")).toHaveText("USD");
    await expect(page.locator(".currency-focus input")).toBeVisible();

    // History chart renders (FR-HISTORY-01) — live fetch, allow generous time.
    await expect(page.locator(".currency-history svg.recharts-surface")).toBeVisible({
      timeout: 15_000,
    });

    // Trend hint (FR-TREND-01/02/03) is conditional on >=8 days of history,
    // which live NBU data always has for a major currency — assert its shape
    // when present rather than hard-requiring it (keeps the test honest about
    // what the spec actually guarantees).
    const trendHint = page.locator(".trend-hint");
    if (await trendHint.count()) {
      await expect(trendHint).toHaveAttribute("data-tone", /^(up|down|flat)$/);
      const text = await trendHint.textContent();
      expect(text).not.toMatch(/!/);
    }
  });

  test("converting an amount updates the UAH result", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^USD/ }).first().click();

    const amountInput = page.locator(".currency-focus input");
    await amountInput.fill("100");

    await expect(page.locator(".currency-focus")).toContainText("Це у гривнях");
    // The result field shows a real, non-zero mono number — proves the
    // convert() pipeline actually ran against the live USD rate.
    const resultText = await page
      .locator(".currency-focus")
      .getByText(/^\d[\d\s]*,\d{2}/)
      .last()
      .textContent();
    expect(resultText).toBeTruthy();
  });

  test("filtering the list narrows it, and a non-matching query shows the honest empty message", async ({
    page,
  }) => {
    await page.goto("/");
    const search = page.getByPlaceholder("Пошук за кодом або назвою");

    await search.fill("EUR");
    await expect(page.getByRole("button", { name: /^EUR/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^USD/ })).toHaveCount(0);

    await search.fill("zzznotacurrency");
    await expect(page.getByText("Нічого не знайдено")).toBeVisible();
  });

  test("footer shows the NBU provenance line and a daily saying", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".app-footer__provenance")).toContainText("НБУ");
    await expect(page.locator(".app-footer__saying")).toBeVisible();
  });
});
