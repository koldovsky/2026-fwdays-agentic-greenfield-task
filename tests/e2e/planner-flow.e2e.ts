import { test, expect } from "@playwright/test";
import { clearProfile, gotoPlanner } from "./helpers";

test.describe("Prokhidnyi planner MVP", () => {
  test.beforeEach(async ({ page }) => {
    await clearProfile(page);
    await gotoPlanner(page);
  });

  test("home loads recommendations with chance rings", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /Рекомендації/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("region", { name: "Рекомендації" })).toBeVisible();
    await expect(page.getByLabel(/Детальніше:/).first()).toBeVisible();
  });

  test("adjusting a score recomputes the visible average", async ({ page }) => {
    const mathSlider = page.locator("#score-math");
    await mathSlider.fill("195");
    await expect(page.getByText("195", { exact: true }).first()).toBeVisible();
  });

  test("open program detail modal and close with Escape", async ({ page }) => {
    await page.getByLabel(/Детальніше:/).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Як склався твій бал")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("add programs to comparison and see the table", async ({ page }) => {
    const compareButtons = page.getByRole("button", { name: /Додати до порівняння:/ });
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();

    await page.getByRole("tab", { name: /Порівняння/ }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText(/пріоритетом 1/i)).toBeVisible();
  });

  test("save a program and track status in the saved list", async ({ page }) => {
    await page
      .getByRole("button", { name: /Зберегти у список:/ })
      .first()
      .click();

    await page.getByRole("tab", { name: /Збережені/ }).click();
    await expect(page.getByRole("region", { name: "Збережені програми" })).toBeVisible();

    const statusBadge = page.getByRole("button", { name: /Статус:/ }).first();
    await statusBadge.click();
    await expect(statusBadge).toContainText("Подано");
  });
});
