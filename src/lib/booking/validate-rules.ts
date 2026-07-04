import { parseBookingRequest } from "@/lib/booking/parse";
import type { ParsedBookingIntent } from "@/lib/booking/parse";

export type ValidationError = {
  code: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; parsed: ParsedBookingIntent }
  | { ok: false; parsed: ParsedBookingIntent; errors: ValidationError[] };

function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function minutesFromHHmm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function validateParsedBooking(
  parsed: ParsedBookingIntent,
  referenceDate: Date = new Date(),
): ValidationResult {
  const errors: ValidationError[] = [];
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const target = parseIsoDate(parsed.date);
  const dayDiff = Math.round((target.getTime() - ref.getTime()) / 86_400_000);

  if (parsed.facility === "tennis") {
    if (dayDiff < 1) {
      errors.push({
        code: "BC-MHOA-TENNIS-05",
        message: "Same-day tennis bookings are not accepted on MHOA.",
      });
    }
    if (dayDiff > 7) {
      errors.push({
        code: "BC-MHOA-TENNIS-04",
        message: "Tennis can only be booked up to 7 days in advance.",
      });
    }

    const endMin = minutesFromHHmm(parsed.windowEnd);
    if (endMin > 21 * 60 + 45) {
      errors.push({
        code: "BC-MHOA-TENNIS-06",
        message: "Tennis courts close at 9:30 PM; last slot ends at 9:45 PM.",
      });
    }

    if (parsed.slotsRequested > 1) {
      errors.push({
        code: "BC-MHOA-TENNIS-02",
        message: "MHOA allows one tennis reservation per household per day.",
      });
    }
  }

  if (parsed.facility === "picnic") {
    errors.push({
      code: "OOS-PICNIC-SUBMIT",
      message: "Picnic submission is not implemented yet — tennis only for now.",
    });
  }

  if (errors.length > 0) {
    return { ok: false, parsed, errors };
  }

  return { ok: true, parsed };
}

export function validateBookingRequest(
  text: string,
  facility: import("@/lib/booking/types").FacilityType,
  referenceDate: Date = new Date(),
): ValidationResult {
  const parsed = parseBookingRequest(text, facility, referenceDate);
  return validateParsedBooking(parsed, referenceDate);
}
