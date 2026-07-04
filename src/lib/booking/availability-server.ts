import type { AvailabilityResult, CourtAvailability } from "@/lib/booking/availability";
import { stubTennisAvailability, TENNIS_COURTS } from "@/lib/booking/availability";
import { friendlyAvailabilityErrorFromUnknown } from "@/lib/booking/availability-errors";
import {
  launchMhoaBrowser,
  scrapeAllCourtsForDate,
} from "@/lib/booking/mhoa-tennis-scraper";
import { withPlaywrightLock } from "@/lib/booking/playwright-lock";

const TENNIS_URL = "https://mahoganyhoa.com/facilities/outdoor/tennis-courts-3/";
const AVAILABILITY_BUDGET_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchTennisAvailabilityLive(date: string): Promise<AvailabilityResult> {
  const fetchedAt = new Date().toISOString();
  let browser;

  try {
    browser = await launchMhoaBrowser();
    const page = await browser.newPage();
    await page.goto(TENNIS_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2000);

    const courts: CourtAvailability[] = await scrapeAllCourtsForDate(page, date);

    await browser.close();
    return { status: "ok", date, courts, fetchedAt, stub: false };
  } catch (err) {
    await browser?.close();
    return {
      status: "error",
      date,
      reason: friendlyAvailabilityErrorFromUnknown(err),
      fetchedAt,
    };
  }
}

export async function fetchTennisAvailability(date: string): Promise<AvailabilityResult> {
  if (process.env.COLIBRI_SUBMIT_MODE !== "live") {
    return stubTennisAvailability(date);
  }

  return withPlaywrightLock(() =>
    withTimeout(
      fetchTennisAvailabilityLive(date),
      AVAILABILITY_BUDGET_MS,
      "MHOA availability request",
    ).catch((err) => ({
      status: "error" as const,
      date,
      reason: friendlyAvailabilityErrorFromUnknown(err),
      fetchedAt: new Date().toISOString(),
    })),
  );
}
