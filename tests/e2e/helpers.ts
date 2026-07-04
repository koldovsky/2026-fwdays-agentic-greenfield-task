import { expect, type Page } from "@playwright/test";

import { loadSeedAccountsSync } from "../../src/lib/auth/secrets";

function seedCreds() {
  const accounts = loadSeedAccountsSync();
  const admin = accounts.find((a) => a.role === "admin")!;
  const user = accounts.find((a) => a.role === "user")!;
  return { admin, user };
}

/** Sign in as the default household user (can book). */
export async function loginAsUser(page: Page) {
  const { user } = seedCreds();
  await page.goto("/login");
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/** Clear queued jobs via schedule API (waiting/ready only). */
export async function cancelAllScheduledJobs(page: Page) {
  const res = await page.request.get("/api/booking/schedule");
  expect(res.ok()).toBeTruthy();
  const { jobs } = (await res.json()) as {
    jobs: { id: string; status: string }[];
  };

  for (const job of jobs) {
    if (job.status !== "waiting" && job.status !== "ready") continue;
    const del = await page.request.delete(`/api/booking/schedule/${job.id}`);
    expect(del.ok()).toBeTruthy();
  }
}

/** Sign in as admin. */
export async function loginAsAdmin(page: Page) {
  const { admin } = seedCreds();
  await page.goto("/login");
  await page.getByLabel("Username").fill(admin.username);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/** Advance wizard: What → default tennis → Who */
export async function goToWhoStep(page: Page) {
  await page.getByRole("button", { name: /Continue — Who/i }).click();
}

/** Select resident(s) on Who step — toggle by full name */
export async function selectResidents(page: Page, ...fullNames: string[]) {
  for (const name of fullNames) {
    await page.getByRole("button").filter({ hasText: name }).first().click();
  }
}

export async function goToWhenStep(page: Page) {
  await page.getByRole("button", { name: /Continue — Pick/i }).click();
}

/** Pick first enabled slot chip on When step (any court); tries date tabs if needed */
export async function pickFirstSlot(page: Page) {
  const tabs = page.getByRole("tablist", { name: /Bookable dates/i }).getByRole("tab");
  const tabCount = await tabs.count();

  for (let i = 0; i < tabCount; i++) {
    await tabs.nth(i).click();
    try {
      await expect(page.getByText("Loading available slots")).toHaveCount(0, {
        timeout: 12_000,
      });
    } catch {
      continue;
    }

    const slot = page
      .getByRole("list", { name: /available slots/i })
      .locator("button:not([disabled])")
      .first();

    if ((await slot.count()) > 0) {
      await slot.click();
      return;
    }
  }

  throw new Error("No bookable slot found on any date");
}

export async function goToConfirmStep(page: Page) {
  await page.getByRole("button", { name: /Review \d+ booking/i }).click();
}

export async function waitForConfirmStep(page: Page) {
  await expect(page.getByRole("heading", { name: /Confirm —/i })).toBeVisible({
    timeout: 15_000,
  });
}

/** @deprecated use wizard flow */
export async function selectResident(page: Page, fullName: string) {
  await goToWhoStep(page);
  await selectResidents(page, fullName);
}

/** @deprecated use wizard flow */
export async function fillValidIntake(page: Page) {
  await goToWhoStep(page);
  await selectResidents(page, "Nataliia");
  await goToWhenStep(page);
  await pickFirstSlot(page);
  await goToConfirmStep(page);
}

/** @deprecated */
export async function submitIntakeReview(page: Page) {
  await goToWhenStep(page);
}

/** @deprecated */
export async function waitForAvailability(page: Page) {
  await waitForConfirmStep(page);
}
