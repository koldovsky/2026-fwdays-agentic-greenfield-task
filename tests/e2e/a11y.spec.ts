import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SEVERE = new Set(["serious", "critical"]);

async function severeViolations(page: import("@playwright/test").Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return violations
    .filter((v) => SEVERE.has(v.impact ?? ""))
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
}

test.describe("Accessibility (axe)", () => {
  test("A11Y-01 landing page", async ({ page }) => {
    await page.goto("/");
    const v = await severeViolations(page);
    expect(v, JSON.stringify(v, null, 2)).toEqual([]);
  });

  test("A11Y-02 book intake page", async ({ page }) => {
    await page.goto("/book");
    const v = await severeViolations(page);
    expect(v, JSON.stringify(v, null, 2)).toEqual([]);
  });
});
