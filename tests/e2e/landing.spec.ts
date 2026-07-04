import { test, expect } from "@playwright/test";

import { loginAsUser } from "./helpers";

test.describe("Landing (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows Colibri branding and CTA to book", async ({ page }) => {

    await expect(page).toHaveTitle(/Colibri Book/i);
    await expect(page.getByRole("img", { name: /Colibri/i }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Book outdoor life/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Start a booking" }).click();
    await page.waitForURL("**/book");
    await expect(
      page.getByRole("heading", { name: "Book outdoor activity" }),
    ).toBeVisible();
  });

  test("header navigation Home and Book work", async ({ page }) => {
    await page.goto("/book");
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("navigation").getByRole("link", { name: "Book" }).click();
    await expect(page).toHaveURL("/book");
  });
});
