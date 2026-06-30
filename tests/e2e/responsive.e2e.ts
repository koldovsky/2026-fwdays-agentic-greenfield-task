// Responsive 360px E2E (Phase 5, NFR-COMPAT-01). At a 360px-wide viewport the
// home and a plant detail must be usable: no horizontal overflow and the key
// controls visible. We assert the document does not scroll horizontally (with a
// small sub-pixel tolerance) rather than inspecting pixels.
//
// @trace NFR-COMPAT-01
import { test, expect } from "@playwright/test";

import { uk } from "@/lib/i18n/uk";
import { reseed } from "./helpers/e2e-db";

const MOBILE = { width: 360, height: 780 };
// Sub-pixel/scrollbar tolerance — overflow must be effectively zero.
const TOLERANCE = 2;

let healthyId: number;

test.beforeEach(async ({ page }) => {
  const ids = await reseed();
  healthyId = ids.healthy;
  await page.setViewportSize(MOBILE);
});

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(TOLERANCE);
}

test("@trace NFR-COMPAT-01 home has no horizontal overflow at 360px and key controls are visible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: uk.plants.listTitle, level: 1 }),
  ).toBeVisible();
  // The primary "add plant" control is visible (usable) at 360px.
  await expect(
    page.getByRole("link", { name: uk.plants.add }).first(),
  ).toBeVisible();
  // The summary card is visible.
  await expect(page.getByText(uk.reminders.summaryLabel)).toBeVisible();

  await assertNoHorizontalOverflow(page);
});

test("@trace NFR-COMPAT-01 plant detail has no horizontal overflow at 360px", async ({
  page,
}) => {
  await page.goto(`/plants/${healthyId}`);
  // Key controls visible: the edit link and both add forms' submit buttons.
  await expect(
    page.getByRole("link", { name: uk.plants.edit }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: uk.growth.add }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: uk.watering.add }),
  ).toBeVisible();

  await assertNoHorizontalOverflow(page);
});
