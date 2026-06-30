import { expect, test } from "@playwright/test";

/**
 * Responsive layout (FR-SHELL-02, CHECKLIST G5). Measures the actual
 * computed `grid-template-columns` track count rather than eyeballing a
 * screenshot — precise, consistent with how this project verified the chart
 * X-axis clipping fix earlier (DOM measurement over visual inspection).
 */
test.describe("responsive layout", () => {
  test("stacks to a single column below the 1100px breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.goto("/");

    const trackCount = await page.locator(".shell-main").evaluate((el) => {
      const cols = getComputedStyle(el).gridTemplateColumns.trim();
      return cols.split(/\s+/).filter(Boolean).length;
    });
    expect(trackCount).toBe(1);
  });

  test("splits into two columns at the 1100px breakpoint and above", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const trackCount = await page.locator(".shell-main").evaluate((el) => {
      const cols = getComputedStyle(el).gridTemplateColumns.trim();
      return cols.split(/\s+/).filter(Boolean).length;
    });
    expect(trackCount).toBe(2);
  });

  test("a narrow mobile viewport still renders the header, search, and a currency row", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/");

    await expect(page.locator(".app-header__title")).toHaveText("Гривня");
    await expect(page.getByPlaceholder("Пошук за кодом або назвою")).toBeVisible();
    await expect(page.getByRole("button", { name: /^USD/ }).first()).toBeVisible();
  });

  test("the sticky focus column only applies at the desktop breakpoint", async ({ page }) => {
    // Desktop: sticky.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: /^USD/ }).first().click();
    const desktopPosition = await page
      .locator(".shell-main__column--sticky")
      .evaluate((el) => getComputedStyle(el).position);
    expect(desktopPosition).toBe("sticky");

    // Mobile: not sticky (design.md — sticky offers no benefit once columns stack).
    await page.setViewportSize({ width: 375, height: 700 });
    const mobilePosition = await page
      .locator(".shell-main__column--sticky")
      .evaluate((el) => getComputedStyle(el).position);
    expect(mobilePosition).not.toBe("sticky");
  });
});
