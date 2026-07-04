import { test, expect } from "@playwright/test";

import {
  goToWhoStep,
  goToWhenStep,
  goToConfirmStep,
  selectResidents,
  loginAsUser,
  cancelAllScheduledJobs,
} from "./helpers";

function futureIso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test.describe("Wizard scheduled booking (E2E)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await cancelAllScheduledJobs(page);
    await page.goto("/book");
  });

  test("future date shows schedule flow and queues job", async ({ page }) => {
    const targetDate = futureIso(10);
    await goToWhoStep(page);
    await selectResidents(page, "Nataliia");
    await goToWhenStep(page);

    await page.getByRole("tab", { name: "Schedule later" }).click();
    await page.getByLabel("Future booking date").fill(targetDate);
    await page.getByRole("button", { name: /Any time \(9 AM – 9 PM\)/i }).click();
    await goToConfirmStep(page);

    await expect(page.getByText(/Scheduled booking/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Schedule 1 booking/i }),
    ).toBeVisible();

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Schedule 1 booking/i }).click();

    await expect(page.getByRole("heading", { name: /Bookings queued/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "View scheduled queue" })).toBeVisible();

    await page.getByRole("link", { name: "View scheduled queue" }).click();
    await expect(page).toHaveURL("/scheduled");
    const jobRow = page.locator("li").filter({ hasText: targetDate }).filter({ hasText: "Nataliia" });
    await expect(jobRow).toBeVisible();
    await expect(jobRow.getByText("waiting")).toBeVisible();
  });

  test("household warning on schedule confirm for two residents", async ({ page }) => {
    await goToWhoStep(page);
    await selectResidents(page, "Max", "Nataliia");
    await goToWhenStep(page);

    await page.getByRole("tab", { name: "Schedule later" }).click();
    await page.getByLabel("Future booking date").fill(futureIso(12));
    await page.getByRole("button", { name: /Any time \(9 AM – 9 PM\)/i }).click();
    await goToConfirmStep(page);

    await expect(
      page.getByText(/one tennis booking per household per day/i),
    ).toBeVisible();
  });

  test("cancel scheduled job from panel", async ({ page }) => {
    await goToWhoStep(page);
    await selectResidents(page, "Yurii");
    await goToWhenStep(page);

    await page.getByRole("tab", { name: "Schedule later" }).click();
    await page.getByLabel("Future booking date").fill(futureIso(14));
    await page.getByRole("button", { name: /Any time \(9 AM – 9 PM\)/i }).click();
    await goToConfirmStep(page);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Schedule 1 booking/i }).click();

    await expect(page.getByRole("heading", { name: /Bookings queued/i })).toBeVisible();

    await page.goto("/scheduled");
    const yuriiJobs = page.locator("li").filter({ hasText: "Yurii" });
    await expect(yuriiJobs.first()).toBeVisible();
    const beforeCount = await yuriiJobs.count();
    await yuriiJobs.first().getByRole("button", { name: "Cancel" }).click();

    await expect(yuriiJobs).toHaveCount(beforeCount - 1, { timeout: 10_000 });
  });
});
