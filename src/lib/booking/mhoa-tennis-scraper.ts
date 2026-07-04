import { TENNIS_COURTS, type TennisCourt } from "@/lib/booking/availability";

export const SLOT_TIME_LINK_PATTERN =
  /\d{1,2}:\d{2}\s*(AM|PM)-\d{1,2}:\d{2}\s*(AM|PM)/i;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function normalizeSlotLabels(rawTexts: string[]): string[] {
  const slots: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawTexts) {
    const label = raw.replace(/\d+$/, "").trim();
    if (label && !seen.has(label)) {
      seen.add(label);
      slots.push(label);
    }
  }
  return slots;
}

function calendarTable(page: import("playwright-core").Page) {
  return page.locator("table").first();
}

function visibleSlotLinks(page: import("playwright-core").Page) {
  return page.getByRole("link", { name: SLOT_TIME_LINK_PATTERN }).filter({ visible: true });
}

export async function launchMhoaBrowser() {
  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
}

export async function selectTennisDate(
  page: import("playwright-core").Page,
  date: string,
): Promise<void> {
  const [y, m, d] = date.split("-").map(Number);

  await page.locator("select").nth(2).waitFor({ state: "visible", timeout: 30_000 });
  await page.locator("select").nth(2).selectOption({ label: MONTH_NAMES[m - 1] });
  await page.locator("select").nth(3).selectOption(String(y));
  await page.waitForTimeout(1200);

  const dayLink = calendarTable(page).getByRole("link", { name: String(d), exact: true });
  const visible = await dayLink.isVisible().catch(() => false);
  if (!visible) {
    throw new Error(
      `MHOA calendar has no clickable day ${d} for ${MONTH_NAMES[m - 1]} ${y} — date may be closed or not in the booking window`,
    );
  }
  await dayLink.click();
  await page.waitForTimeout(1000);
}

async function readVisibleSlots(page: import("playwright-core").Page): Promise<string[]> {
  const slots = visibleSlotLinks(page);
  await slots.first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
  return normalizeSlotLabels(await slots.allInnerTexts());
}

/** Navigate calendar once, then read slots for each court (avoids duplicate calendar waits). */
export async function scrapeAllCourtsForDate(
  page: import("playwright-core").Page,
  date: string,
): Promise<{ court: TennisCourt; slots: string[] }[]> {
  await page.locator("select").first().selectOption({ label: TENNIS_COURTS[0] });
  await page.waitForTimeout(800);
  await selectTennisDate(page, date);

  const results: { court: TennisCourt; slots: string[] }[] = [];
  for (const court of TENNIS_COURTS) {
    if (court !== TENNIS_COURTS[0]) {
      await page.locator("select").first().selectOption({ label: court });
      await page.waitForTimeout(800);
    }
    results.push({ court, slots: await readVisibleSlots(page) });
  }
  return results;
}

export async function scrapeCourtSlots(
  page: import("playwright-core").Page,
  court: TennisCourt,
  date: string,
): Promise<string[]> {
  await page.locator("select").first().selectOption({ label: court });
  await page.waitForTimeout(800);
  await selectTennisDate(page, date);

  const slots = visibleSlotLinks(page);
  await slots.first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
  return normalizeSlotLabels(await slots.allInnerTexts());
}

export async function clickSlotByLabel(
  page: import("playwright-core").Page,
  slotLabel: string,
): Promise<boolean> {
  const slots = visibleSlotLinks(page);
  const texts = await slots.allInnerTexts();
  for (let i = 0; i < texts.length; i++) {
    const label = texts[i].replace(/\d+$/, "").trim();
    if (label === slotLabel) {
      await slots.nth(i).click();
      return true;
    }
  }
  return false;
}

export async function listVisibleSlotLabels(
  page: import("playwright-core").Page,
): Promise<string[]> {
  return normalizeSlotLabels(await visibleSlotLinks(page).allInnerTexts());
}
