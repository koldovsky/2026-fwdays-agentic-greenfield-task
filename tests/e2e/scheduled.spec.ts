import { test, expect } from "@playwright/test";

import { loginAsUser, cancelAllScheduledJobs } from "./helpers";

test.describe("Scheduled bookings page (E2E)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await cancelAllScheduledJobs(page);
  });

  test("scheduled page renders heading and empty state", async ({ page }) => {
    await page.goto("/scheduled");
    await expect(page.getByRole("heading", { name: "Scheduled bookings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    await expect(page.getByText(/No scheduled bookings in the queue/i)).toBeVisible();
  });

  test("header Scheduled link navigates to page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Scheduled" }).click();
    await expect(page).toHaveURL("/scheduled");
    await expect(page.getByRole("heading", { name: "Scheduled bookings" })).toBeVisible();
  });
});
