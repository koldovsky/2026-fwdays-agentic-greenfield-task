import { test, expect } from "@playwright/test";

import { loginAsUser } from "./helpers";

test.describe("My bookings page (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test("bookings page renders heading and empty state", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(page.getByText(/No upcoming confirmed bookings/i)).toBeVisible();
  });

  test("header My bookings link navigates to page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "My bookings" }).click();
    await expect(page).toHaveURL("/bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  });
});
