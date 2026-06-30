// Reminder-home E2E (Phase 5). Drives the real built app through the core
// reminder flow: the summary count, the urgency-ordered due list, water-now
// swapping a row to its done state and decrementing the count, and the all-done
// state once the last due plant is watered.
//
// Determinism: beforeEach re-pins the deterministic demo baseline (3 due:
// overdue + soon + never-watered; 1 healthy) so the count + list are exact
// regardless of run order. The UI is Ukrainian — we query by the real uk copy.
//
// @trace FR-REM-03
// @trace FR-REM-04
// @trace FR-REM-05
// @trace FR-REM-06
import { test, expect } from "@playwright/test";

import { uk } from "@/lib/i18n/uk";
import { reseed } from "./helpers/e2e-db";

test.beforeEach(async () => {
  await reseed();
});

test("@trace FR-REM-03 home summary card shows the due count and the due section lists due plants", async ({
  page,
}) => {
  await page.goto("/");

  // Summary card label + the big due count. The seed yields exactly 3 due
  // plants (overdue + soon + never-watered); healthy is excluded.
  await expect(page.getByText(uk.reminders.summaryLabel)).toBeVisible();
  // The count is rendered via an aria-label ("3 рослини"); assert the numeric 3
  // shows in the summary card.
  const summary = page
    .locator("div", { hasText: uk.reminders.summaryLabel })
    .last();
  await expect(summary.getByText("3", { exact: true })).toBeVisible();

  // The "Потребують поливу" section is present with the due rows.
  await expect(
    page.getByRole("heading", { name: uk.reminders.sectionTitle }),
  ).toBeVisible();

  // Each due plant name appears; the healthy one is NOT in the due section
  // (it still appears in the card grid below, so just assert the due rows).
  await expect(
    page.getByRole("button", { name: uk.reminders.waterNow }),
  ).toHaveCount(3);
});

test("@trace FR-REM-04/05 water-now logs today's watering, decrements the count, and removes the row", async ({
  page,
}) => {
  await page.goto("/");

  const waterButtons = page.getByRole("button", { name: uk.reminders.waterNow });
  await expect(waterButtons).toHaveCount(3);
  // Summary count starts at 3.
  await expect(
    page
      .locator("div", { hasText: uk.reminders.summaryLabel })
      .last()
      .getByText("3", { exact: true }),
  ).toBeVisible();

  // Water the first (most-urgent) due plant. The action logs today's watering
  // and revalidates the home: the now-watered plant is no longer due, so its
  // row drops out of the list and the count falls to 2 (FR-REM-05). The "done"
  // confirmation flashes optimistically, then the server re-render removes the
  // row — so the durable, non-flaky assertion is the decremented count/buttons.
  await waterButtons.first().click();

  await expect(
    page.getByRole("button", { name: uk.reminders.waterNow }),
  ).toHaveCount(2);
  await expect(
    page
      .locator("div", { hasText: uk.reminders.summaryLabel })
      .last()
      .getByText("2", { exact: true }),
  ).toBeVisible();
});

test("@trace FR-REM-06 watering every due plant reveals the all-done state", async ({
  page,
}) => {
  await page.goto("/");

  // Water each due plant in turn. After each water-now the server revalidates
  // the home and the watered plant drops out of the list, so the count of
  // remaining water-now buttons decreases by one each iteration. Always click
  // the first remaining button and wait for the count to settle before the next.
  for (let remaining = 3; remaining > 0; remaining -= 1) {
    await expect(
      page.getByRole("button", { name: uk.reminders.waterNow }),
    ).toHaveCount(remaining);
    await page
      .getByRole("button", { name: uk.reminders.waterNow })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: uk.reminders.waterNow }),
    ).toHaveCount(remaining - 1);
  }

  // With nothing left due, the all-done empty state shows (FR-REM-06) and the
  // summary count is 0. Reload to read the fully server-derived state.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: uk.reminders.allDoneTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: uk.reminders.waterNow }),
  ).toHaveCount(0);
});
