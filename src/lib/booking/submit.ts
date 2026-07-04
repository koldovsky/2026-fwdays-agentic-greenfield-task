import type { BookingIntake } from "@/lib/booking/types";
import type { ParsedBookingIntent } from "@/lib/booking/parse";
import {
  fetchCaptchaPng,
  refreshCaptcha,
  solveCaptchaPng,
} from "@/lib/booking/captcha-solve";

import {
  detectMhoaApproval,
  logBookingAudit,
} from "@/lib/booking/mhoa-approval";
import {
  clickSlotByLabel,
  launchMhoaBrowser,
  selectTennisDate,
  SLOT_TIME_LINK_PATTERN,
} from "@/lib/booking/mhoa-tennis-scraper";
import { withPlaywrightLock } from "@/lib/booking/playwright-lock";

export type SubmitSuccess = {
  status: "success";
  runId: string;
  facility: string;
  date: string;
  slot: string;
  court: string;
  fullName: string;
  email: string;
  mhoaApproved: boolean;
  confirmedAt: string;
};

export type SubmitError = {
  status: "error";
  runId: string;
  reason: string;
  suggestion?: string;
};

export type SubmitResult = SubmitSuccess | SubmitError;

export type BookingSelection = {
  court: string;
  slotLabel: string;
};

const CAPTCHA_MAX_ATTEMPTS = 3;

export function isStubMode() {
  return process.env.COLIBRI_SUBMIT_MODE !== "live";
}

function formatPhoneTennis(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return null;
  return { a: d.slice(0, 3), b: d.slice(3, 6), c: d.slice(6) };
}

function pickSlotLabel(parsed: ParsedBookingIntent): string {
  const [sh, sm] = parsed.windowStart.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const hour12 = ((sh + 11) % 12) + 1;
  const mer = sh >= 12 ? "PM" : "AM";
  const endTotal = startMinutes + parsed.slotDurationMinutes;
  const eh = Math.floor(endTotal / 60);
  const em = endTotal % 60;
  const eh12 = ((eh + 11) % 12) + 1;
  const emer = eh >= 12 ? "PM" : "AM";
  return `${hour12}:${String(sm).padStart(2, "0")} ${mer}-${eh12}:${String(em).padStart(2, "0")} ${emer}`;
}

export function stubSubmit(
  intake: BookingIntake,
  parsed: ParsedBookingIntent,
  selection?: BookingSelection,
): SubmitSuccess {
  const court = selection?.court ?? parsed.courtOrSite ?? "East Court";
  const slot = selection?.slotLabel ?? pickSlotLabel(parsed);
  const confirmedAt = new Date().toISOString();
  const result: SubmitSuccess = {
    status: "success",
    runId: `stub-${Date.now()}`,
    facility: "Tennis Courts",
    date: parsed.date,
    slot,
    court,
    fullName: intake.fullName,
    email: intake.email,
    mhoaApproved: false,
    confirmedAt,
  };
  logBookingAudit({
    event: "booking_stub",
    runId: result.runId,
    facility: result.facility,
    date: result.date,
    slot: result.slot,
    court: result.court,
    fullName: result.fullName,
    email: result.email,
    mhoaApproved: false,
    confirmedAt,
  });
  return result;
}

function isCaptchaFailure(body: string) {
  return /captcha|security code|verification/i.test(body);
}

async function fillTennisForm(
  page: import("playwright-core").Page,
  intake: BookingIntake,
  parsed: ParsedBookingIntent,
  selection?: BookingSelection,
): Promise<SubmitError | null> {
  const court = selection?.court ?? parsed.courtOrSite ?? "East Court";
  await page.locator("select").first().selectOption({ label: court });
  await page.waitForTimeout(800);
  await selectTennisDate(page, parsed.date);

  if (selection?.slotLabel) {
    const picked = await clickSlotByLabel(page, selection.slotLabel);
    if (!picked) {
      return {
        status: "error",
        runId: "",
        reason: `Selected slot ${selection.slotLabel} on ${court} is no longer available on MHOA.`,
        suggestion: "Go back and pick another slot from the availability list.",
      };
    }
  } else {
    const [startH, startM] = parsed.windowStart.split(":").map(Number);
    const [endH, endM] = parsed.windowEnd.split(":").map(Number);
    const windowStartMin = startH * 60 + startM;
    const windowEndMin = endH * 60 + endM;

    const slotLinks = page
      .getByRole("link", { name: SLOT_TIME_LINK_PATTERN })
      .filter({ visible: true });
    const rawTexts = await slotLinks.allInnerTexts();

    let picked = false;
    for (let i = 0; i < rawTexts.length; i++) {
      const label = rawTexts[i].replace(/\d+$/, "").trim();
      const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) continue;
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12;
      if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
      const slotStart = hour * 60 + minute;
      if (slotStart >= windowStartMin && slotStart < windowEndMin) {
        await slotLinks.nth(i).click();
        picked = true;
        break;
      }
    }
    if (!picked && rawTexts.length > 0) {
      await slotLinks.first().click();
      picked = true;
    }
    if (!picked) {
      return {
        status: "error",
        runId: "",
        reason: "No available slot found in your time window on MHOA.",
        suggestion: "Try a different date or time window.",
      };
    }
  }
  await page.waitForTimeout(1000);

  await page.locator("#fieldname3_1").fill(intake.fullName);
  const phone = formatPhoneTennis(intake.phone);
  if (!phone) {
    return {
      status: "error",
      runId: "",
      reason: "Phone must be 10 digits for MHOA tennis form.",
    };
  }
  await page.locator("#fieldname8_1_0").fill(phone.a);
  await page.locator("#fieldname8_1_1").fill(phone.b);
  await page.locator("#fieldname8_1_2").fill(phone.c);
  await page.locator("#fieldname5_1").fill(intake.email);
  await page.locator("#fieldname2_1").fill(intake.address);
  await page.locator("#fieldname4_1").check();

  return null;
}

async function submitWithCaptcha(
  page: import("playwright-core").Page,
  captchaCode: string,
): Promise<{
  mhoaApproved: boolean;
  mhoaRejected: boolean;
  rejectionReason?: string;
  body: string;
  confirmationExcerpt: string;
}> {
  await page.locator("#hdcaptcha_cp_appbooking_post_1").fill(captchaCode);
  await page.getByRole("button", { name: /Submit Booking/i }).click();
  await page.waitForTimeout(4000);
  const body = await page.locator("body").innerText();
  const approval = detectMhoaApproval(body);
  return { ...approval, body };
}

export async function runLiveTennisSubmit(
  intake: BookingIntake,
  parsed: ParsedBookingIntent,
  selection?: BookingSelection,
): Promise<SubmitResult> {
  return withPlaywrightLock(() => runLiveTennisSubmitInner(intake, parsed, selection));
}

async function runLiveTennisSubmitInner(
  intake: BookingIntake,
  parsed: ParsedBookingIntent,
  selection?: BookingSelection,
): Promise<SubmitResult> {
  const runId = `live-${Date.now()}`;

  let browser;
  try {
    browser = await launchMhoaBrowser();
    const page = await browser.newPage();
    await page.goto(
      "https://mahoganyhoa.com/facilities/outdoor/tennis-courts-3/",
      { waitUntil: "domcontentloaded", timeout: 60_000 },
    );
    await page.waitForTimeout(2000);

    const formError = await fillTennisForm(page, intake, parsed, selection);
    if (formError) {
      await browser.close();
      return { ...formError, runId };
    }

    for (let attempt = 1; attempt <= CAPTCHA_MAX_ATTEMPTS; attempt++) {
      const png = await fetchCaptchaPng(page);
      const captchaCode = await solveCaptchaPng(png);
      const result = await submitWithCaptcha(page, captchaCode);

      if (result.mhoaApproved) {
        const confirmedAt = new Date().toISOString();
        const court = selection?.court ?? parsed.courtOrSite ?? "East Court";
        const success: SubmitSuccess = {
          status: "success",
          runId,
          facility: "Tennis Courts",
          date: parsed.date,
          slot: selection?.slotLabel ?? pickSlotLabel(parsed),
          court,
          fullName: intake.fullName,
          email: intake.email,
          mhoaApproved: true,
          confirmedAt,
        };
        logBookingAudit({
          event: "booking_confirmed",
          runId,
          facility: success.facility,
          date: success.date,
          slot: success.slot,
          court: success.court,
          fullName: success.fullName,
          email: success.email,
          mhoaApproved: true,
          confirmedAt,
          confirmationExcerpt: result.confirmationExcerpt,
        });
        await browser.close();
        return success;
      }

      if (result.mhoaRejected) {
        const reason =
          result.rejectionReason?.match(/exceeded/i)
            ? "MHOA limit: one tennis booking per household per day. This date may already be booked."
            : `MHOA rejected the booking: ${result.rejectionReason ?? "provider error"}.`;
        logBookingAudit({
          event: "booking_rejected",
          runId,
          facility: "Tennis Courts",
          date: parsed.date,
          slot: pickSlotLabel(parsed),
          court: parsed.courtOrSite ?? "East Court",
          fullName: intake.fullName,
          email: intake.email,
          mhoaApproved: false,
          confirmedAt: new Date().toISOString(),
          rejectionReason: result.rejectionReason,
        });
        await browser.close();
        return {
          status: "error",
          runId,
          reason,
          suggestion:
            "Pick another date or cancel the existing MHOA booking via reception@mahoganyhoa.com.",
        };
      }

      const captchaRejected = isCaptchaFailure(result.body);
      if (attempt < CAPTCHA_MAX_ATTEMPTS && captchaRejected) {
        await refreshCaptcha(page);
        continue;
      }

      if (attempt < CAPTCHA_MAX_ATTEMPTS) {
        await refreshCaptcha(page);
        continue;
      }
    }

    await browser.close();
    return {
      status: "error",
      runId,
      reason: "MHOA did not confirm the booking (no approval message received).",
      suggestion:
        "The slot may be taken or household limit reached. Try another date, or contact reception@mahoganyhoa.com.",
    };
  } catch (err) {
    await browser?.close();
    return {
      status: "error",
      runId,
      reason: err instanceof Error ? err.message : "MHOA provider unavailable",
      suggestion: "Try again later or use stub mode for demo.",
    };
  }
}

export async function submitBooking(
  intake: BookingIntake,
  parsed: ParsedBookingIntent,
  selection?: BookingSelection,
): Promise<SubmitResult> {
  if (isStubMode()) {
    return stubSubmit(intake, parsed, selection);
  }
  if (intake.facility !== "tennis") {
    return {
      status: "error",
      runId: `err-${Date.now()}`,
      reason: "Only tennis submission is implemented.",
    };
  }
  return runLiveTennisSubmit(intake, parsed, selection);
}
