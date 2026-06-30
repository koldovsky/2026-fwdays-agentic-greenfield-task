import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility scan (NFR-A11Y-02, TC-TEST-01, CHECKLIST G5).
 * axe is necessary but not sufficient for a11y — it catches WCAG-detectable
 * issues (contrast, missing labels, ARIA misuse) automatically; it does not
 * replace a human/vision check of "looks interactive but isn't" style
 * defects (that pass belongs to Stage 13).
 */
test.describe("accessibility — light + dark", () => {
  test("light theme: no automatically detectable WCAG violations on the empty state", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".app-header__title")).toHaveText("Гривня");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("light theme: no violations with a currency selected (converter + chart visible)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^USD/ }).first().click();
    await expect(page.locator(".currency-history svg.recharts-surface")).toBeVisible({
      timeout: 15_000,
    });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("dark theme: no automatically detectable WCAG violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".app-header__title")).toHaveText("Гривня");
    await page.getByRole("switch", { name: "Темна тема" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("dark theme with a currency selected: no violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("switch", { name: "Темна тема" }).click();
    await page.getByRole("button", { name: /^USD/ }).first().click();
    await expect(page.locator(".currency-history svg.recharts-surface")).toBeVisible({
      timeout: 15_000,
    });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("focus is always visible (NFR-A11Y-01): focusing the search input visibly changes its ring", async ({
    page,
  }) => {
    // The DS Input component always has *some* box-shadow on its wrapper
    // <div> (a subtle inset shadow when unfocused) — so "has a box-shadow"
    // alone would pass even if focus did nothing. The real assertion is that
    // the shadow *changes* on focus, proving the focus-ring state actually
    // applies (components/ds/core/Input.jsx: boxShadow swaps between
    // --shadow-inset and --focus-ring based on the inner <input>'s focus).
    await page.goto("/");
    const search = page.getByPlaceholder("Пошук за кодом або назвою");
    const wrapper = () =>
      search.evaluate((el) => getComputedStyle(el.parentElement as Element).boxShadow);

    const unfocused = await wrapper();
    await search.focus();
    const focused = await wrapper();

    expect(focused).not.toBe("none");
    expect(focused).not.toBe(unfocused);
  });
});
