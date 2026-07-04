import { test, expect } from "@playwright/test";

import {
  goToWhoStep,
  goToWhenStep,
  pickFirstSlot,
  goToConfirmStep,
  selectResidents,
  waitForConfirmStep,
  loginAsUser,
} from "./helpers";

test.describe("Booking wizard (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await page.goto("/book");
  });

  test("step 1 shows What facility screen", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /What do you want to book/i })).toBeVisible();
    await expect(page.getByText("Tennis Courts")).toBeVisible();
  });

  test("step 2 Who supports multi-select", async ({ page }) => {
    await goToWhoStep(page);
    await selectResidents(page, "Max", "Nataliia");
    await expect(page.getByText(/2 participants — 2 slots/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue — Pick 2 slots" }),
    ).toBeVisible();
  });

  test("single participant flow reaches confirm with slot", async ({ page }) => {
    await goToWhoStep(page);
    await selectResidents(page, "Nataliia");
    await goToWhenStep(page);
    await expect(page.getByText(/1 of 1/)).toBeVisible();
    await pickFirstSlot(page);
    await goToConfirmStep(page);
    await waitForConfirmStep(page);
    await expect(page.getByText("Nataliia Pokotylo")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Submit 1 request/i }),
    ).toBeVisible();
  });

  test("two participants pick consecutive slots in one choice", async ({ page }) => {
    await goToWhoStep(page);
    await selectResidents(page, "Max", "Nataliia");
    await goToWhenStep(page);
    await expect(
      page.getByText(/Pick a 2-slot block/i),
    ).toBeVisible();
    await pickFirstSlot(page);
    await expect(page.getByText("Max + Nataliia — 2 consecutive slots")).toBeVisible();
    await goToConfirmStep(page);
    await expect(page.getByText("2 independent bookings")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Submit 2 requests/i }),
    ).toBeVisible();
  });

  test("facility toggle on step 1", async ({ page }) => {
    await page.getByText("Beach Picnic Sites").click();
    await expect(page.getByText("Beach Picnic Sites")).toBeVisible();
  });
});
